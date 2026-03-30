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
// ARCHITECTURE
//
// Audio pipeline (all native, no JS in the hot path):
//   R2 CDN → hls.js (ABR) → MSE SourceBuffer → OS decoder → speaker
//
// JS supervision layer (crash-tolerant):
//   - Registers Media Session handlers once, never tears them down
//   - Syncs real playhead position on visibilitychange + freeze/resume
//   - Prefetches the next track's master.m3u8 at 80% duration
//   - Pings the SW every 10 s via MessageChannel (not setInterval)
//   - Routes audio through a zero-cost AudioContext to prevent background throttling
//
// AUDIOCONTEXT NOTE:
//   We intentionally use AudioContext here as a pass-through keepalive — NOT
//   for decoding or processing. When a running AudioContext is connected to a
//   playing MediaElementSourceNode, browsers mark the page as having an active
//   audio graph and will not throttle its timers. This keeps hls.js's internal
//   buffer-check loops firing at full speed in background tabs.
//
//   The earlier warning against AudioContext (in the original file) referred to
//   using it as the PRIMARY DECODER (which suspends on iOS/background). Here
//   the native HLS / hls.js pipeline decodes everything — the AudioContext is
//   only a browser keepalive signal.
//
//   setInterval — still avoided; MessageChannel handles the 10 s keepalive.
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

const getDisplayImage = (
  track: ReturnType<typeof usePlayerStore.getState>["currentTrack"]
) =>
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

const SEEK_OFFSET        = 10;    // seconds for lock-screen seekbackward/forward
const PREFETCH_THRESHOLD = 0.80;  // prefetch next track when 80% through current

// ─── Component ───────────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const { currentTrack, playNext, playPrevious, isPlaying } = usePlayerStore();

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setIsPlaying   = usePlayerStore((s) => s.setIsPlaying);

  const audioRef    = useRef<HTMLAudioElement>(null);
  const hlsRef      = useRef<Hls | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // [FIX 2] Zero-cost AudioContext pass-through — keeps browser audio
  // graph alive in background tabs so hls.js timers are not throttled.
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Tracks which URL has already been prefetched to avoid duplicate fetches
  const prefetchedUrlRef = useRef<string | null>(null);

  // ── FIX: suppress audio.play() in the play/pause effect while hls.js is
  // still loading the first segment. Without this guard, audio.play() is
  // called on an empty SourceBuffer, causing the browser to buffer ~30 s
  // before it decides it has "enough data". With the guard, only the
  // FRAG_BUFFERED handler (or canplay fallback) calls audio.play(), so
  // playback starts as soon as the first real segment is in the buffer.
  const isAwaitingFirstFrag = useRef(false);

  // ── Stable callback refs (prevents Media Session handler teardown) ─────────

  const playNextRef       = useRef(playNext);
  const playPreviousRef   = useRef(playPrevious);
  const setIsPlayingRef   = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);

  useEffect(() => { playNextRef.current       = playNext;       }, [playNext]);
  useEffect(() => { playPreviousRef.current   = playPrevious;   }, [playPrevious]);
  useEffect(() => { setIsPlayingRef.current   = setIsPlaying;   }, [setIsPlaying]);
  useEffect(() => { setCurrentTimeRef.current = setCurrentTime; }, [setCurrentTime]);

  // ── 1. WAKE LOCK ──────────────────────────────────────────────────────────

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current?.released === false) return;
      const sentinel = await (navigator as any).wakeLock.request("screen") as WakeLockSentinel;
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (usePlayerStore.getState().isPlaying) acquireWakeLock();
      });
    } catch (_) {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // ── 2. CRASH-TOLERANT VISIBILITY RECOVERY + PAGE LIFECYCLE ───────────────
  //
  // visibilitychange: when the tab is backgrounded, onTimeUpdate stops
  // firing and the store freezes. The MSE audio pipeline keeps playing
  // without JS. On return:
  //   a) Read the real playhead from the audio element
  //   b) Push it into the store so the UI snaps to the correct position
  //   c) Re-acquire wake lock, restart HLS loading, resume if OS paused
  //   d) Resume AudioContext if the OS suspended it
  //
  // freeze/resume (Page Lifecycle API): fired when the browser discards
  // the page from memory (back-forward cache, mobile app switcher, memory
  // pressure). visibilitychange alone does not catch these cases.

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const store = usePlayerStore.getState();

      if (audioRef.current && isFinite(audioRef.current.currentTime)) {
        store.setCurrentTime(audioRef.current.currentTime);
      }
      if (store.isPlaying) acquireWakeLock();
      if (hlsRef.current && store.isPlaying) {
        try { hlsRef.current.startLoad(); } catch (_) {}
      }
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
      // [FIX 2] Resume AudioContext if the OS suspended it while backgrounded
      if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };

    // [FIX 3] Stop loading segments while frozen to save battery/bandwidth.
    // The resume handler restarts loading when the page is thawed.
    const onFreeze = () => {
      if (hlsRef.current) {
        try { hlsRef.current.stopLoad(); } catch (_) {}
      }
    };

    // [FIX 3] Full recovery from a freeze — restart the HLS loader, resume
    // the AudioContext, re-acquire wake lock, and restart playback if paused.
    const onResume = () => {
      const store = usePlayerStore.getState();
      if (!store.isPlaying) return;

      if (hlsRef.current) {
        try { hlsRef.current.startLoad(); } catch (_) {}
      }
      // [FIX 2] Resume AudioContext — released automatically on freeze
      if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
        audioCtxRef.current.resume().catch(() => {});
      }
      // Wake lock is released automatically on freeze — re-acquire it
      acquireWakeLock();
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("freeze",           onFreeze);
    document.addEventListener("resume",           onResume);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("freeze",           onFreeze);
      document.removeEventListener("resume",           onResume);
    };
  }, [acquireWakeLock]);

  // ── 2b. AUDIOCONTEXT KEEPALIVE ────────────────────────────────────────────
  //
  // Routing the audio element through an AudioContext signals to the browser
  // that this page has an active audio graph, preventing background timer
  // throttling. This is a zero-cost pass-through: no gain, no analysis —
  // just source → destination.
  //
  // createMediaElementSource takes exclusive ownership of the <audio> element,
  // so it must be called exactly once. The empty dep array [] guarantees this.
  // The cleanup closes the context on unmount, which is safe because by then
  // the audio element is also being torn down.
  //
  // statechange handler: Chrome can interrupt the context when another audio
  // source takes focus (phone call, system alert). We resume it immediately.
  //
  // iOS note: on iOS, AudioContext.createMediaElementSource is supported but
  // the context must be created inside a user gesture. If the audio element
  // is played by user tap (which it is, via the play button), the context
  // will already be in "running" state. If it's in "suspended", the
  // statechange + resume() call here handles recovery.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || typeof AudioContext === "undefined") return;

    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination);

      ctx.addEventListener("statechange", () => {
        if (ctx.state === "suspended" || (ctx.state as string) === "interrupted") {
          ctx.resume().catch(() => {});
        }
      });
    } catch (_) {
      // AudioContext unavailable or already taken — non-fatal, background
      // play degrades gracefully to the MessageChannel keepalive alone.
    }

    return () => {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. MESSAGECHANNEL KEEPALIVE ───────────────────────────────────────────
  //
  // setInterval is throttled to ~1 min in background tabs.
  // MessageChannel fires at full speed — immune to the background timer cap.
  // This is a secondary keepalive alongside the AudioContext (Effect #2b).

  useEffect(() => {
    if (!isPlaying) return;
    const { port1, port2 } = new MessageChannel();
    let active = true;

    port2.onmessage = () => {
      if (!active) return;
      navigator.serviceWorker?.controller?.postMessage({ type: "KEEPALIVE" });
      const store = usePlayerStore.getState();
      if (store.isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
        if (hlsRef.current) {
          try { hlsRef.current.startLoad(); } catch (_) {}
        }
      }
      setTimeout(() => { if (active) port1.postMessage(null); }, 10_000);
    };
    port1.postMessage(null);

    return () => { active = false; port1.close(); port2.close(); };
  }, [isPlaying]);

  // ── 4. SERVICE WORKER ────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(console.error)
    );
  }, []);

  // ── 5. NEXT-TRACK PREFETCHING ────────────────────────────────────────────
  //
  // HOW SPOTIFY ACHIEVES GAPLESS PLAYBACK:
  // While the current track plays, Spotify silently fetches the next track's
  // manifest and first segment in the background. By the time the user skips
  // or the song ends, the data is already in cache — startup time is near zero.
  //
  // IMPLEMENTATION:
  // We use two mechanisms:
  //
  // A) <link rel="prefetch"> — tells the browser to fetch the master.m3u8 at
  //    idle priority. The browser decides when — typically during idle CPU time.
  //    This warms the HTTP cache so hls.js gets a cache-hit on first load.
  //
  // B) fetch() with keepalive — a real background fetch of the manifest when
  //    the track crosses the 80% threshold. This guarantees the manifest is
  //    in the service worker cache regardless of browser prefetch heuristics.
  //
  // Both are fired at 80% duration. prefetchedUrlRef prevents double-fetching
  // when the user seeks back past the threshold.

  const prefetchNextTrack = useCallback((nextUrl: string) => {
    if (!nextUrl || prefetchedUrlRef.current === nextUrl) return;
    prefetchedUrlRef.current = nextUrl;

    // A) Declarative prefetch via <link> — browser-controlled, idle priority
    try {
      const existing = document.querySelector(`link[rel="prefetch"][href="${nextUrl}"]`);
      if (!existing) {
        const link = document.createElement("link");
        link.rel         = "prefetch";
        link.as          = "fetch";
        link.href        = nextUrl;
        link.crossOrigin = "anonymous";
        document.head.appendChild(link);
      }
    } catch (_) {}

    // B) Explicit background fetch — goes through the SW cache for offline use
    fetch(nextUrl, {
      method:    "GET",
      cache:     "force-cache",
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Reset prefetch state when the track changes
  useEffect(() => {
    prefetchedUrlRef.current = null;
  }, [currentTrack]);

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

  // ── 7. MEDIA SESSION HANDLERS — REGISTERED ONCE ON MOUNT ─────────────────
  //
  // No cleanup. Removing handlers creates a gap where the lock-screen
  // notification is hidden. Stable refs call the latest callbacks without
  // re-registering.

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 8. METADATA — ZUSTAND SUBSCRIBE (synchronous, no React render delay) ──

  useEffect(() => {
    const pushMetadata = (
      track: ReturnType<typeof usePlayerStore.getState>["currentTrack"]
    ) => {
      if (!track || !("mediaSession" in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title:   track.title,
        artist:  track.artists?.name  ?? "Unknown Artist",
        album:   track.albums?.title  ?? "Miracle FM",
        artwork: buildArtwork(getDisplayImage(track)),
      });
      navigator.mediaSession.playbackState = "playing";
      try {
        navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
      } catch (_) {}
    };

    pushMetadata(usePlayerStore.getState().currentTrack);

    let prevTrack = usePlayerStore.getState().currentTrack;
    const unsub = usePlayerStore.subscribe((state) => {
      if (state.currentTrack !== prevTrack) {
        prevTrack = state.currentTrack;
        pushMetadata(state.currentTrack);
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 9. HLS / AUDIO ENGINE ─────────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTime(0);
    setDuration(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // ── iOS / native HLS path ────────────────────────────────────────────────
    // iOS Safari handles HLS, ABR, and background audio natively without hls.js.
    // We use canplay here because iOS doesn't expose MSE events — the browser
    // fires canplay as soon as the native decoder has its first frames ready,
    // which on iOS is already very fast.
    const onCanPlay = () => {
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    };

    const nativeHLS = isIOS() && audio.canPlayType("application/vnd.apple.mpegurl");

    if (nativeHLS || (!Hls.isSupported() && audio.canPlayType("application/vnd.apple.mpegurl"))) {
      // iOS path: isAwaitingFirstFrag is not needed here because canplay
      // already guarantees the decoder has real data before play() is called.
      isAwaitingFirstFrag.current = false;
      audio.src = currentTrack.hls_url;
      audio.addEventListener("canplay", onCanPlay, { once: true });

    } else if (Hls.isSupported()) {
      // ── hls.js path (Chrome, Firefox, Edge, Android) ──────────────────────
      //
      // Set the flag BEFORE loadSource so the play/pause effect (Effect #10)
      // cannot call audio.play() on an empty SourceBuffer. The flag is cleared
      // as soon as real PCM data is available — either via FRAG_BUFFERED
      // (primary) or canplay (fallback, see [FIX 1] below).

      isAwaitingFirstFrag.current = true;

      const hls = new Hls({
        // ── Fast start ───────────────────────────────────────────────────────
        // maxBufferLength: 10 means hls.js targets keeping 10 s ahead of the
        // playhead. It does NOT wait until 10 s is buffered before allowing
        // playback — it starts the moment any data is in the buffer. We
        // trigger play ourselves (see below) so actual start time equals the
        // time to download one segment from R2.
        maxBufferLength:          10,
        maxMaxBufferLength:       120,
        backBufferLength:         30,

        // startFragPrefetch: begin downloading segment 0 immediately after
        // the manifest is parsed, before attachMedia completes. Saves one
        // full network round-trip from the startup sequence.
        startFragPrefetch:        true,

        // maxBufferHole: tolerate up to 0.5 s gap in the SourceBuffer before
        // considering it a stall. Small gaps from segment boundaries are normal.
        maxBufferHole:            0.5,

        // highBufferWatchdogPeriod: how often (seconds) hls.js checks whether
        // playback has stalled with a full buffer. 1 s detects/recovers stalls
        // faster than the default 3 s.
        highBufferWatchdogPeriod: 1,

        // ── ABR ──────────────────────────────────────────────────────────────
        // abrEwmaDefaultEstimate: initial bandwidth estimate (bytes/sec).
        // 500 kB/s ≈ 4 Mbps. Replaced by a real measurement after segment 0.
        abrEwmaDefaultEstimate:   500_000,

        // ── Worker thread ────────────────────────────────────────────────────
        enableWorker:             true,

        // ── Network resilience ───────────────────────────────────────────────
        fragLoadingTimeOut:       20_000,
        fragLoadingMaxRetry:      6,
        fragLoadingRetryDelay:    1_000,
        manifestLoadingTimeOut:   10_000,
        manifestLoadingMaxRetry:  4,
        levelLoadingTimeOut:      10_000,
        levelLoadingMaxRetry:     4,
      });

      hlsRef.current = hls;
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      // ── [FIX 1] FRAG_BUFFERED: play on the very first segment ─────────────
      //
      // WHAT CHANGED AND WHY:
      //
      // Old sn === 0 guard:
      //   HLS segment sequence numbers are not guaranteed to start at 0.
      //   Live streams typically use a timestamp-based sequence (e.g. sn=14820),
      //   and byte-range VOD playlists can start at any offset. The old guard
      //   silently never fired on these streams, leaving isAwaitingFirstFrag
      //   stuck at true indefinitely — audio never played.
      //
      // New approach — accept the FIRST segment of type 'main':
      //   data.frag.type === 'main' filters out subtitle/audio rendition
      //   fragments that hls.js may load in parallel. The very first 'main'
      //   fragment that completes buffering is segment 0 in practice, but
      //   the guard no longer relies on sn numbering.
      //
      // canplay fallback:
      //   Catches edge cases where FRAG_BUFFERED never fires (native MSE
      //   quirks, WKWebView on iOS, some Android WebViews). The browser fires
      //   canplay as soon as it has enough decoded frames to start playing —
      //   that is a safe point to call audio.play() regardless of MSE state.
      //   The firstFragPlayed flag ensures only one of the two paths wins.
      //
      // isAwaitingFirstFrag: cleared by whichever path fires first, so
      // subsequent play/pause toggles (Effect #10) work normally.

      let firstFragPlayed = false;

      // Primary trigger: first main-type segment fully buffered into MSE
      hls.on(Hls.Events.FRAG_BUFFERED, (_, data) => {
        if (firstFragPlayed) return;
        if (data.frag.type !== "main") return; // skip subtitle / alt-audio frags

        firstFragPlayed = true;
        isAwaitingFirstFrag.current = false;    // unblock the play/pause effect
        audio.removeEventListener("canplay", onCanPlayHls);

        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => setIsPlaying(false));
        }
      });

      // Fallback trigger: browser canplay — fires when the decoder has enough
      // data regardless of whether FRAG_BUFFERED fired first.
      const onCanPlayHls = () => {
        if (firstFragPlayed) return;
        firstFragPlayed = true;
        isAwaitingFirstFrag.current = false;

        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => setIsPlaying(false));
        }
      };
      audio.addEventListener("canplay", onCanPlayHls, { once: true });

      // LEVEL_LOADED: extract total duration from the variant playlist.
      // This fires once per level (quality rendition) load.
      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data.details?.totalduration) setDuration(data.details.totalduration);
      });

      // ERROR: auto-retry network drops, destroy on fatal decode errors.
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else {
          hls.destroy();
          hlsRef.current = null;
        }
      });

      // Additional cleanup: remove canplay fallback if effect re-runs before it fires
      return () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("canplay", onCanPlayHls);
        isAwaitingFirstFrag.current = false;
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      isAwaitingFirstFrag.current = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack, setCurrentTime, setDuration, setIsPlaying]);

  // ── 10. PLAY / PAUSE SYNC ────────────────────────────────────────────────
  //
  // isAwaitingFirstFrag guard: while hls.js is still fetching and appending
  // the first segment, we must NOT call audio.play() here. The FRAG_BUFFERED
  // handler (or canplay fallback) in Effect #9 owns the initial play() call.
  // This effect only handles subsequent play/pause toggles.

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      // Defer to FRAG_BUFFERED / canplay for the very first play of each track
      if (isAwaitingFirstFrag.current) return;

      audio.play()
        .then(() => {
          acquireWakeLock();
          // Resume AudioContext if the OS had suspended it
          if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
            audioCtxRef.current.resume().catch(() => {});
          }
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
        })
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      releaseWakeLock();
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    }
  }, [isPlaying, setIsPlaying, acquireWakeLock, releaseWakeLock]);

  // ── 11. DOM SEEK ─────────────────────────────────────────────────────────

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    syncPositionState();
  };

  // ── 12. CLEANUP ──────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      releaseWakeLock();
      isAwaitingFirstFrag.current = false;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      // AudioContext is closed by its own effect (Effect #2b)
    };
  }, [releaseWakeLock]);

  // ── 13. RENDER ───────────────────────────────────────────────────────────

  if (!currentTrack) return null;

  const displayImage = getDisplayImage(currentTrack);

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
          const { currentTime, duration } = audioRef.current;

          setCurrentTime(currentTime);
          syncPositionState();

          // ── NEXT-TRACK PREFETCH ─────────────────────────────────────────
          // At 80% through the current track, silently warm the cache for
          // the next track. When the song ends and hls.js loads the next
          // source, the manifest is already cached — zero loading time.
          if (
            isFinite(duration) &&
            duration > 0 &&
            currentTime / duration >= PREFETCH_THRESHOLD
          ) {
            const store      = usePlayerStore.getState();
            const queue      = store.queue        ?? [];
            const currentIdx = store.currentIndex ?? -1;
            const nextTrack  = queue[currentIdx + 1];

            if (nextTrack?.hls_url) {
              prefetchNextTrack(nextTrack.hls_url);
            }
          }
        }}

        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) { setDuration(d); syncPositionState(); }
        }}

        onEnded={() => {
          // Set "playing" before playNext so the OS never sees a paused gap
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          playNext();
        }}

        onPlay={() => {
          setIsPlaying(true);
          acquireWakeLock();
          // Resume AudioContext in case the browser auto-suspended it
          if (audioCtxRef.current && audioCtxRef.current.state !== "running") {
            audioCtxRef.current.resume().catch(() => {});
          }
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          syncPositionState();
        }}

        onPause={() => {
          // Skip during track transitions — store still says isPlaying = true
          if (usePlayerStore.getState().isPlaying) return;
          setIsPlaying(false);
          releaseWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}

        onStalled={() => { if (!hlsRef.current) audioRef.current?.load(); }}
        onError={()   => { if (!hlsRef.current) setTimeout(() => audioRef.current?.load(), 2_000); }}
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