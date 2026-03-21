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

/** Always returns a fully-qualified URL (needed for MediaMetadata artwork). */
const toAbsoluteUrl = (url: string): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
};

/** All artwork sizes browsers/OSes request. */
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

const SEEK_OFFSET = 10; // seconds for seekbackward / seekforward

// ─── Component ──────────────────────────────────────────────────────────────

export default function AudioPlayer() {
  const { currentTrack, playNext, playPrevious, isPlaying } = usePlayerStore();

  // Fine-grained selectors — avoids re-rendering the whole player on every tick
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration    = usePlayerStore((s) => s.setDuration);
  const setIsPlaying   = usePlayerStore((s) => s.setIsPlaying);

  const audioRef      = useRef<HTMLAudioElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const wakeLockRef   = useRef<WakeLockSentinel | null>(null);

  // ── 1. WAKE LOCK ────────────────────────────────────────────────────────
  // Prevents the OS from suspending audio / dimming the screen mid-playback.

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      if (wakeLockRef.current?.released === false) return; // already held
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      wakeLockRef.current?.addEventListener("release", () => {
        // Re-acquire if still playing (happens when tab becomes visible again)
        if (usePlayerStore.getState().isPlaying) acquireWakeLock();
      });
    } catch (_) {
      // Wake lock denied (battery saver, etc.) — silent fail is fine
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  // Re-acquire wake lock when the page becomes visible again (tab switch, etc.)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && usePlayerStore.getState().isPlaying) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [acquireWakeLock]);

  // ── 2. SERVICE WORKER ───────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () =>
        navigator.serviceWorker.register("/sw.js").catch(console.error)
      );
    }
  }, []);

  // ── 3. POSITION STATE (fires on every timeupdate) ───────────────────────

  const syncPositionState = useCallback(() => {
    if (!("mediaSession" in navigator) || !audioRef.current) return;
    const { duration, playbackRate, currentTime } = audioRef.current;
    if (isFinite(duration) && duration > 0 && isFinite(currentTime)) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
      } catch (_) {}
    }
  }, []);

  // ── 4. MEDIA SESSION METADATA ───────────────────────────────────────────
  // Called every time the track changes so lock-screen info is always fresh.

  const displayImage = currentTrack?.cover_url
    || currentTrack?.albums?.cover_url
    || currentTrack?.artists?.image_url
    || "/miraclefm.jpg";

  const updateMediaSessionMetadata = useCallback(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title:   currentTrack.title,
      artist:  currentTrack.artists?.name  ?? "Unknown Artist",
      album:   currentTrack.albums?.title  ?? "Miracle FM",
      artwork: buildArtwork(displayImage),
    });
  }, [currentTrack, displayImage]);

  // ── 5. MEDIA SESSION ACTION HANDLERS ───────────────────────────────────

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    updateMediaSessionMetadata();

    const seek = (delta: number) => {
      if (!audioRef.current) return;
      const next = Math.max(0, Math.min(audioRef.current.currentTime + delta, audioRef.current.duration || 0));
      audioRef.current.currentTime = next;
      setCurrentTime(next);
      syncPositionState();
    };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play",          () => setIsPlaying(true)],
      ["pause",         () => setIsPlaying(false)],
      ["stop",          () => setIsPlaying(false)],
      ["previoustrack", () => playPrevious()],
      ["nexttrack",     () => playNext()],
      ["seekbackward",  (d) => seek(-(d?.seekOffset ?? SEEK_OFFSET))],
      ["seekforward",   (d) => seek( (d?.seekOffset ?? SEEK_OFFSET))],
      ["seekto",        (d) => {
        if (d?.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = d.seekTime;
          setCurrentTime(d.seekTime);
          syncPositionState();
        }
      }],
    ];

    handlers.forEach(([action, handler]) => {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch (_) {}
    });

    return () => {
      handlers.forEach(([action]) => {
        try { navigator.mediaSession.setActionHandler(action, null); } catch (_) {}
      });
    };
  }, [currentTrack, updateMediaSessionMetadata, playNext, playPrevious, setIsPlaying, setCurrentTime, syncPositionState]);

  // ── 6. HLS / AUDIO ENGINE ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTime(0);
    setDuration(0);

    // Tear down any previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const onCanPlay = () => {
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
      updateMediaSessionMetadata();
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
        maxBufferLength:    180,
        maxMaxBufferLength: 360,
        enableWorker:       true,
        // Keep audio alive in background tabs
        backBufferLength:   90,
      });

      hlsRef.current = hls;
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        updateMediaSessionMetadata();
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
            hls.startLoad(); // retry network errors automatically
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
  }, [currentTrack, setCurrentTime, setDuration, setIsPlaying, updateMediaSessionMetadata]);

  // ── 7. PLAY / PAUSE SYNC ────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const promise = audio.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            acquireWakeLock();
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          })
          .catch(() => setIsPlaying(false));
      }
    } else {
      audio.pause();
      releaseWakeLock();
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
    }
  }, [isPlaying, setIsPlaying, acquireWakeLock, releaseWakeLock]);

  // ── 8. DOM EVENT HANDLERS ───────────────────────────────────────────────

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      syncPositionState();
    }
  };

  // ── 9. RENDER ───────────────────────────────────────────────────────────

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
      {/*
        Key audio attributes for background/lock-screen playback:
        • playsInline          — prevents iOS forcing fullscreen video player
        • x-webkit-airplay     — enables AirPlay on Safari
        • controlsList         — hides native download button (Chrome)
        • preload="auto"       — buffer ahead so background scrubbing works
      */}
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
          syncPositionState(); // keeps lock-screen scrubber in sync
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (d && isFinite(d)) {
            setDuration(d);
            syncPositionState();
          }
        }}
        onEnded={playNext}
        onPlay={() => {
          setIsPlaying(true);
          acquireWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          syncPositionState();
        }}
        onPause={() => {
          setIsPlaying(false);
          releaseWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}
        onStalled={() => {
          // HLS will self-recover, but for native src we nudge the load
          if (!hlsRef.current) audioRef.current?.load();
        }}
        onError={() => {
          // Fatal native audio error — attempt a reload after a short delay
          if (!hlsRef.current) {
            setTimeout(() => audioRef.current?.load(), 2000);
          }
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