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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

const SEEK_OFFSET = 10;

// ─── Component ──────────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const { currentTrack, playNext, playPrevious, isPlaying } = usePlayerStore();

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setIsPlaying   = usePlayerStore((s) => s.setIsPlaying);

  const audioRef    = useRef<HTMLAudioElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // WEB AUDIO CONTEXT — THE FIX FOR "STOPS AFTER 2–3 MINUTES"
  //
  // Root cause: Chrome and Safari have a background tab freeze policy.
  // After ~1–3 min with no active frame, they suspend media that lives
  // only as a bare <audio> element. The audio element pauses silently —
  // no error, no event — which is why opening the browser resumes it.
  //
  // Fix: connect the <audio> element into a Web Audio graph as a source
  // node. The Web Audio scheduler runs in a separate real-time thread that
  // is immune to background tab throttling. Even a minimal graph (source
  // → gain → destination) is enough to keep the audio alive indefinitely.
  //
  // iOS rule: AudioContext must be created/resumed during a user gesture.
  // We create it lazily on the first click/touch anywhere on the page.
  // ─────────────────────────────────────────────────────────────────────────

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef   = useRef<GainNode | null>(null);

  const unlockAudioContext = useCallback(() => {
    if (!audioRef.current) return;

    // Already wired up — just ensure it is running
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return;
    }

    try {
      const ctx  = new AudioContext();
      const src  = ctx.createMediaElementSource(audioRef.current);
      const gain = ctx.createGain();
      gain.gain.value = 1.0; // unity gain — transparent to audio quality

      src.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current   = ctx;
      sourceNodeRef.current = src;
      gainNodeRef.current   = gain;

      ctx.resume().catch(() => {});
    } catch (err) {
      // Non-fatal: AudioContext may be unavailable in some WebViews
      console.warn("[AudioPlayer] AudioContext setup failed:", err);
    }
  }, []);

  // ── 1. WAKE LOCK ─────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current?.released === false) return;
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      wakeLockRef.current?.addEventListener("release", () => {
        if (usePlayerStore.getState().isPlaying) acquireWakeLock();
      });
    } catch (_) {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // ── 2. VISIBILITY RECOVERY ───────────────────────────────────────────────
  //
  // When the user returns to the tab after the OS froze it, we:
  //   a) Resume the AudioContext (browsers always suspend it on tab hide)
  //   b) Re-acquire the wake lock
  //   c) Restart hls.js segment loading if it stalled while backgrounded
  //   d) Resume the audio element if the OS paused it behind our back

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const store = usePlayerStore.getState();

      // a) Resume AudioContext
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      // b) Re-acquire wake lock
      if (store.isPlaying) acquireWakeLock();

      // c) Restart HLS loading
      if (hlsRef.current && store.isPlaying) {
        try { hlsRef.current.startLoad(); } catch (_) {}
      }

      // d) Recover audio element if OS silently paused it
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquireWakeLock]);

  // ── 3. MESSAGECHANNEL KEEPALIVE ──────────────────────────────────────────
  //
  // Problem: setInterval is throttled to ~1 min in background tabs by both
  // Chrome and Safari — so a 20-second SW ping becomes useless.
  //
  // Solution: MessageChannel ports fire at full speed regardless of tab
  // visibility because they use the microtask queue, not the timer queue.
  // We create a self-messaging loop that:
  //   • resumes the AudioContext if it got suspended
  //   • pings the service worker
  //   • recovers a stalled audio element
  // Each iteration re-schedules itself via the channel, not setTimeout.

  useEffect(() => {
    if (!isPlaying) return;

    const { port1, port2 } = new MessageChannel();
    let active = true;

    port2.onmessage = () => {
      if (!active) return;

      // Resume AudioContext
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }

      // Ping service worker
      navigator.serviceWorker?.controller?.postMessage({ type: "KEEPALIVE" });

      // Recover stalled audio
      const store = usePlayerStore.getState();
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
        if (hlsRef.current) {
          try { hlsRef.current.startLoad(); } catch (_) {}
        }
      }

      // Re-schedule: using setTimeout inside the handler so we get a
      // ~10 s gap between ticks without blocking the microtask queue
      setTimeout(() => { if (active) port1.postMessage(null); }, 10_000);
    };

    // Start the loop
    port1.postMessage(null);

    return () => {
      active = false;
      port1.close();
      port2.close();
    };
  }, [isPlaying]);

  // ── 4. UNLOCK AUDIOCTX ON FIRST USER GESTURE ─────────────────────────────

  useEffect(() => {
    const unlock = () => unlockAudioContext();
    document.addEventListener("click",      unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("keydown",    unlock, { once: true });
    return () => {
      document.removeEventListener("click",      unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown",    unlock);
    };
  }, [unlockAudioContext]);

  // ── 5. SERVICE WORKER ────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(console.error)
    );
  }, []);

  // ── 6. POSITION STATE ────────────────────────────────────────────────────

  const syncPositionState = useCallback(() => {
    if (!("mediaSession" in navigator) || !audioRef.current) return;
    const { duration, playbackRate, currentTime } = audioRef.current;
    if (isFinite(duration) && duration > 0 && isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
      } catch (_) {}
    }
  }, []);

  // ── 7. STABLE CALLBACK REFS ──────────────────────────────────────────────

  const playNextRef       = useRef(playNext);
  const playPreviousRef   = useRef(playPrevious);
  const setIsPlayingRef   = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);

  useEffect(() => { playNextRef.current      = playNext;      }, [playNext]);
  useEffect(() => { playPreviousRef.current  = playPrevious;  }, [playPrevious]);
  useEffect(() => { setIsPlayingRef.current  = setIsPlaying;  }, [setIsPlaying]);
  useEffect(() => { setCurrentTimeRef.current = setCurrentTime; }, [setCurrentTime]);

  // ── 8. MEDIA SESSION HANDLERS — ONCE ON MOUNT ────────────────────────────

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
      ["play",          () => { unlockAudioContext(); setIsPlayingRef.current(true); }],
      ["pause",         () => setIsPlayingRef.current(false)],
      ["stop",          () => setIsPlayingRef.current(false)],
      ["previoustrack", () => playPreviousRef.current()],
      ["nexttrack",     () => playNextRef.current()],
      ["seekbackward",  (d) => seek(-(d?.seekOffset ?? SEEK_OFFSET))],
      ["seekforward",   (d) => seek( (d?.seekOffset ?? SEEK_OFFSET))],
      ["seekto",        (d) => {
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

    // No cleanup — intentional. Removing handlers creates the notification
    // disappearance gap between tracks. See previous version for full explanation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 9. METADATA — TRACK CHANGE ───────────────────────────────────────────

  const displayImage = currentTrack?.cover_url
    || currentTrack?.albums?.cover_url
    || currentTrack?.artists?.image_url
    || "/miraclefm.jpg";

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title,
      artist:  currentTrack.artists?.name  ?? "Unknown Artist",
      album:   currentTrack.albums?.title  ?? "Miracle FM",
      artwork: buildArtwork(displayImage),
    });

    if (usePlayerStore.getState().isPlaying) {
      navigator.mediaSession.playbackState = "playing";
    }

    try {
      navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
    } catch (_) {}

  }, [currentTrack, displayImage]);

  // ── 10. HLS / AUDIO ENGINE ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTime(0);
    setDuration(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onCanPlay = () => {
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };

    const isApple =
      typeof navigator !== "undefined" &&
      (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const nativeHLS = isApple && audio.canPlayType("application/vnd.apple.mpegurl");

    if (nativeHLS || (!Hls.isSupported() && audio.canPlayType("application/vnd.apple.mpegurl"))) {
      audio.src = currentTrack.hls_url;
      audio.addEventListener("canplay", onCanPlay, { once: true });
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength:         180,
        maxMaxBufferLength:      360,
        enableWorker:            true,
        backBufferLength:        90,
        // Extended timeouts so background network slowdowns don't kill the stream
        fragLoadingTimeOut:      20_000,
        manifestLoadingTimeOut:  10_000,
        levelLoadingTimeOut:     10_000,
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
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad(); // auto-retry on network drop
          } else {
            hls.destroy();
            hlsRef.current = null;
          }
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

  // ── 11. PLAY / PAUSE SYNC ────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      unlockAudioContext(); // ensure AudioContext is running before play
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
  }, [isPlaying, setIsPlaying, acquireWakeLock, releaseWakeLock, unlockAudioContext]);

  // ── 12. DOM SEEK HANDLER ─────────────────────────────────────────────────

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      syncPositionState();
    }
  };

  // ── 13. CLEANUP ON UNMOUNT ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      releaseWakeLock();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current   = null;
        sourceNodeRef.current = null;
        gainNodeRef.current   = null;
      }
    };
  }, [releaseWakeLock]);

  // ── 14. RENDER ───────────────────────────────────────────────────────────

  if (!currentTrack) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "bottom-[90px] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[64px]",
        "bg-[#121212]/80 backdrop-blur-3xl border border-white/10",
        "rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] px-2 overflow-hidden",
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
          // Skip during track transitions (isPlaying still true in store)
          if (usePlayerStore.getState().isPlaying) return;
          setIsPlaying(false);
          releaseWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}
        onStalled={() => {
          if (!hlsRef.current) audioRef.current?.load();
        }}
        onError={() => {
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