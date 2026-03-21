// src/components/player/AudioPlayer.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/lib/utils";

import PlayerTrackInfo from "./PlayerTrackInfo";
import PlayerControls from "./PlayerControls";
import PlayerProgressBar from "./PlayerProgressBar";
import PlayerVolume from "./PlayerVolume";

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE OVERVIEW
//
// The audio pipeline is:
//   R2 CDN → hls.js fetches segments → MSE SourceBuffer → OS decoder → speaker
//
// That entire chain runs in native browser/OS threads with NO JS involvement.
// It is not throttlable. It does not stop when the tab is backgrounded.
//
// JS is ONLY the supervisor — it tells the pipeline what to load and reads
// back the playhead position for the UI. The supervision layer must be
// crash-tolerant: let the audio play unattended, and when JS wakes back up
// (tab becomes visible again), resync the UI to wherever the audio actually is.
//
// WHAT IS NOT HERE (and why):
//   ✗ AudioContext / MediaElementAudioSourceNode
//     — This re-routes all audio back through JS. When the AudioContext
//       suspends in the background (which every browser does), audio stops.
//       It undoes the MSE pipeline entirely. Do not add it back.
//
//   ✗ setInterval keepalives
//     — setInterval is throttled to ~1 min in background tabs.
//       MessageChannel is used instead for the SW ping (immune to throttling).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toAbsoluteUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
};

const buildArtwork = (src: string): MediaImage[] => {
  const url = toAbsoluteUrl(src);
  return [
    { src: url, sizes: "96x96",   type: "image/jpeg" },
    { src: url, sizes: "128x128", type: "image/jpeg" },
    { src: url, sizes: "192x192", type: "image/jpeg" },
    { src: url, sizes: "256x256", type: "image/jpeg" },
    { src: url, sizes: "384x384", type: "image/jpeg" },
    { src: url, sizes: "512x512", type: "image/jpeg" },
  ];
};

const getDisplayImage = (track: ReturnType<typeof usePlayerStore.getState>["currentTrack"]) =>
  track?.cover_url ||
  track?.albums?.cover_url ||
  track?.artists?.image_url ||
  "/miraclefm.jpg";

const isIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const SEEK_OFFSET = 10; // seconds for seekbackward / seekforward

// ─── Component ───────────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const { currentTrack, playNext, playPrevious, isPlaying } = usePlayerStore();

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setIsPlaying   = usePlayerStore((s) => s.setIsPlaying);

  const audioRef    = useRef<HTMLAudioElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // STABLE CALLBACK REFS
  //
  // Media Session handlers are registered ONCE on mount (empty deps array,
  // no cleanup). To avoid stale closures without re-registering the handlers
  // (which creates the notification gap), we store the latest callbacks in
  // refs and call them from inside the stable handler wrappers.
  // ─────────────────────────────────────────────────────────────────────────

  const playNextRef       = useRef(playNext);
  const playPreviousRef   = useRef(playPrevious);
  const setIsPlayingRef   = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);

  useEffect(() => { playNextRef.current       = playNext;      }, [playNext]);
  useEffect(() => { playPreviousRef.current   = playPrevious;  }, [playPrevious]);
  useEffect(() => { setIsPlayingRef.current   = setIsPlaying;  }, [setIsPlaying]);
  useEffect(() => { setCurrentTimeRef.current = setCurrentTime; }, [setCurrentTime]);

  // ── 1. WAKE LOCK ──────────────────────────────────────────────────────────
  // Prevents the OS screen from turning off mid-playback (best-effort).
  // Wake lock is automatically released by the OS on screen lock — we
  // re-acquire it whenever the tab becomes visible again.

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current?.released === false) return;
      const sentinel = await (navigator as any).wakeLock.request("screen") as WakeLockSentinel;
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        // OS released it (battery saver, screen lock) — re-acquire if still playing
        if (usePlayerStore.getState().isPlaying) acquireWakeLock();
      });
    } catch (_) {
      // Denied (battery saver mode, etc.) — silent fail is correct here
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // ── 2. CRASH-TOLERANT VISIBILITY RECOVERY ────────────────────────────────
  //
  // This is the core of the supervision strategy.
  //
  // When the tab is backgrounded:
  //   - onTimeUpdate STOPS firing (rendering loop paused)
  //   - Zustand store freezes at the last known position
  //   - The audio pipeline keeps playing from the MSE buffer (no JS needed)
  //
  // When the tab becomes visible again, we:
  //   a) Read audioRef.current.currentTime — this is the REAL playhead,
  //      always accurate regardless of what JS was doing
  //   b) Push it into the store so the UI immediately shows the right position
  //   c) Re-acquire wake lock
  //   d) Restart hls.js segment fetching if it stalled on a network drop
  //   e) Resume the audio element if the OS silently paused it (iOS low-power)

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const store = usePlayerStore.getState();

      // a + b) Sync real playhead position into store immediately
      if (audioRef.current && isFinite(audioRef.current.currentTime)) {
        store.setCurrentTime(audioRef.current.currentTime);
      }

      // c) Re-acquire wake lock
      if (store.isPlaying) acquireWakeLock();

      // d) Restart HLS if it stalled while backgrounded
      if (hlsRef.current && store.isPlaying) {
        try { hlsRef.current.startLoad(); } catch (_) {}
      }

      // e) Resume audio element if OS silently paused it (iOS background/low-power)
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquireWakeLock]);

  // ── 3. MESSAGECHANNEL KEEPALIVE ───────────────────────────────────────────
  //
  // setInterval is throttled to ~1 min in background tabs by Chrome and Safari.
  // MessageChannel ports fire at full rate regardless of tab visibility
  // because they use the microtask queue, not the JS timer queue.
  //
  // Every 10 s while playing we:
  //   - Ping the SW so it doesn't get garbage-collected mid-playback
  //   - Recover the audio element if it was silently paused by the OS

  useEffect(() => {
    if (!isPlaying) return;

    const { port1, port2 } = new MessageChannel();
    let active = true;

    port2.onmessage = () => {
      if (!active) return;

      // Ping service worker to keep it alive
      navigator.serviceWorker?.controller?.postMessage({ type: "KEEPALIVE" });

      // Recover audio if OS silently paused it while store still says playing
      const store = usePlayerStore.getState();
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
        if (hlsRef.current) {
          try { hlsRef.current.startLoad(); } catch (_) {}
        }
      }

      // Re-schedule via MessageChannel (immune to background timer throttling)
      setTimeout(() => { if (active) port1.postMessage(null); }, 10_000);
    };

    port1.postMessage(null); // start the loop

    return () => {
      active = false;
      port1.close();
      port2.close();
    };
  }, [isPlaying]);

  // ── 4. SERVICE WORKER REGISTRATION ───────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(console.error)
    );
  }, []);

  // ── 5. POSITION STATE SYNC ────────────────────────────────────────────────
  // Keeps the lock-screen scrubber accurate on every timeupdate tick.

  const syncPositionState = useCallback(() => {
    if (!("mediaSession" in navigator) || !audioRef.current) return;
    const { duration, playbackRate, currentTime } = audioRef.current;
    if (isFinite(duration) && duration > 0 && isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
      } catch (_) {}
    }
  }, []);

  // ── 6. MEDIA SESSION HANDLERS — REGISTERED ONCE ON MOUNT ─────────────────
  //
  // WHY NO CLEANUP / NO DEPS:
  // If handlers are removed and re-added (e.g. when currentTrack changes),
  // there is a gap of several render cycles where all handlers are null.
  // iOS/Android treats that gap as "session ended" and hides the notification.
  //
  // Solution: register stable wrapper functions that call the current ref
  // values. The refs are updated every render (above). Zero teardown,
  // zero gap, notification stays visible across all track transitions.

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const seek = (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
      audio.currentTime = next;
      setCurrentTimeRef.current(next);
      syncPositionState();
    };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play",          () => setIsPlayingRef.current(true)],
      ["pause",         () => setIsPlayingRef.current(false)],
      ["stop",          () => setIsPlayingRef.current(false)],
      ["previoustrack", () => playPreviousRef.current()],
      ["nexttrack",     () => playNextRef.current()],
      ["seekbackward",  (d) => seek(-(d?.seekOffset ?? SEEK_OFFSET))],
      ["seekforward",   (d) => seek(  d?.seekOffset ?? SEEK_OFFSET)],
      ["seekto", (d) => {
        if (d?.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = d.seekTime;
          setCurrentTimeRef.current(d.seekTime);
          syncPositionState();
        }
      }],
    ];

    handlers.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {}
    });

    // ⚠️  Intentionally no cleanup return and no dependency array changes.
    //     Removing handlers creates the lock-screen notification gap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 7. METADATA — ZUSTAND SUBSCRIBE (bypasses React render delay) ─────────
  //
  // WHY NOT useEffect WITH currentTrack:
  // useEffect fires AFTER React's render pipeline completes. In background
  // tabs React batches and delays re-renders, creating a multi-ms gap between
  // onEnded → playNext() → metadata update. The OS sees stale/missing
  // metadata in that gap and hides the notification widget.
  //
  // WHY ZUSTAND SUBSCRIBE WORKS:
  // usePlayerStore.subscribe() fires SYNCHRONOUSLY the moment the store
  // mutates — in the same JS tick as playNext(). No render cycle, no
  // batching delay, no gap. The OS receives fresh metadata instantly.

  useEffect(() => {
    const pushMetadata = (track: ReturnType<typeof usePlayerStore.getState>["currentTrack"]) => {
      if (!track || !("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title:   track.title,
        artist:  track.artists?.name  ?? "Unknown Artist",
        album:   track.albums?.title  ?? "Miracle FM",
        artwork: buildArtwork(getDisplayImage(track)),
      });

      // Tell the OS the session is still active during the HLS loading gap
      navigator.mediaSession.playbackState = "playing";

      // Reset scrubber to 0 for the incoming track
      try {
        navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
      } catch (_) {}
    };

    // Push metadata for the current track immediately on mount
    pushMetadata(usePlayerStore.getState().currentTrack);

    // Subscribe to all future track changes — fires synchronously on playNext().
    // Single-argument form works without subscribeWithSelector middleware.
    // We compare the previous track reference to avoid firing on unrelated
    // store mutations (volume changes, currentTime updates, etc.).
    let prevTrack = usePlayerStore.getState().currentTrack;
    const unsub = usePlayerStore.subscribe((state) => {
      if (state.currentTrack !== prevTrack) {
        prevTrack = state.currentTrack;
        pushMetadata(state.currentTrack);
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once — subscription handles all future track changes

  // ── 8. HLS / AUDIO ENGINE ─────────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTime(0);
    setDuration(0);

    // Tear down the previous HLS instance before creating a new one
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onCanPlay = () => {
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };

    const nativeHLS = isIOS() && audio.canPlayType("application/vnd.apple.mpegurl");

    if (nativeHLS || (!Hls.isSupported() && audio.canPlayType("application/vnd.apple.mpegurl"))) {
      // iOS Safari: native HLS — no hls.js needed, browser handles background natively
      audio.src = currentTrack.hls_url;
      audio.addEventListener("canplay", onCanPlay, { once: true });
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        // ── Buffer configuration ─────────────────────────────────────────
        // 60 s minimum buffer means the audio plays from pre-loaded MSE data
        // for a full minute even if JS is completely frozen in the background.
        // maxMaxBufferLength 600 s allows up to 10 min of pre-buffering when
        // memory and bandwidth allow.
        maxBufferLength:         60,
        maxMaxBufferLength:      600,
        backBufferLength:        30,

        // ── Worker thread ────────────────────────────────────────────────
        // enableWorker moves segment demuxing off the main thread entirely.
        // The worker runs in a separate OS thread — background tab throttling
        // of the main JS thread does not affect it.
        enableWorker:            true,

        // ── Network resilience ───────────────────────────────────────────
        // Extended timeouts for background network slowdowns (mobile networks
        // can be sluggish after the screen locks).
        fragLoadingTimeOut:      20_000,
        fragLoadingMaxRetry:     6,
        fragLoadingRetryDelay:   1_000,
        manifestLoadingTimeOut:  10_000,
        manifestLoadingMaxRetry: 4,
        levelLoadingTimeOut:     10_000,
        levelLoadingMaxRetry:    4,
      });

      hlsRef.current = hls;
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data.details?.totalduration) setDuration(data.details.totalduration);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Auto-retry on network drops (common on mobile after screen lock)
          hls.startLoad();
        } else {
          hls.destroy();
          hlsRef.current = null;
        }
      });
    }

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack, setCurrentTime, setDuration, setIsPlaying]);

  // ── 9. PLAY / PAUSE SYNC ──────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio
        .play()
        .then(() => {
          acquireWakeLock();
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
        })
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      releaseWakeLock();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  }, [isPlaying, setIsPlaying, acquireWakeLock, releaseWakeLock]);

  // ── 10. DOM SEEK ──────────────────────────────────────────────────────────

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    syncPositionState();
  };

  // ── 11. CLEANUP ON UNMOUNT ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [releaseWakeLock]);

  // ── 12. RENDER ────────────────────────────────────────────────────────────

  if (!currentTrack) return null;

  const displayImage = getDisplayImage(currentTrack);

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        // Mobile: pill player above bottom nav
        "bottom-[90px] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[64px]",
        "bg-[#121212]/80 backdrop-blur-3xl border border-white/10",
        "rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] px-2 overflow-hidden",
        // Desktop: full-width bar pinned to bottom
        "md:bottom-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none md:h-[96px]",
        "md:bg-[#050505]/95 md:border-t md:border-x-0 md:border-b-0",
        "md:rounded-none md:px-6 md:overflow-visible"
      )}
    >
      <audio
        ref={audioRef}
        hidden
        preload="auto"
        playsInline
        x-webkit-airplay="allow"
        controlsList="nodownload"

        onTimeUpdate={() => {
          if (!audioRef.current) return;
          setCurrentTime(audioRef.current.currentTime);
          syncPositionState();
        }}

        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) {
            setDuration(d);
            syncPositionState();
          }
        }}

        onEnded={() => {
          // Set playbackState = "playing" BEFORE playNext() so the OS never
          // sees a "paused" state between tracks — notification stays visible.
          if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
          }
          playNext();
        }}

        onPlay={() => {
          setIsPlaying(true);
          acquireWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          syncPositionState();
        }}

        onPause={() => {
          // IMPORTANT: During track transitions the audio element briefly
          // pauses while switching HLS sources, but isPlaying in the store is
          // still true. Skipping the state update here prevents a false
          // "paused" flash that would hide the lock-screen notification.
          if (usePlayerStore.getState().isPlaying) return;
          setIsPlaying(false);
          releaseWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}

        onStalled={() => {
          // hls.js handles its own stall recovery via ERROR events.
          // This covers the native <audio> src path (iOS Safari).
          if (!hlsRef.current) audioRef.current?.load();
        }}

        onError={() => {
          // Fatal native audio error — attempt reload after short delay.
          // hls.js errors are handled in the ERROR event above.
          if (!hlsRef.current) setTimeout(() => audioRef.current?.load(), 2_000);
        }}
      />

      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4 relative z-10">
        <PlayerTrackInfo displayImage={displayImage} />

        <div className="flex items-center justify-end md:justify-center md:flex-col flex-none md:flex-1 max-w-[45%] pr-2 md:pr-0">
          <PlayerControls />
          <PlayerProgressBar onSeek={handleSeek} />
        </div>

        <PlayerVolume audioRef={audioRef} />
      </div>
    </div>
  );
}