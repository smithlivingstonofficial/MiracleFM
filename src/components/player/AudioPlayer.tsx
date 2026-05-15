// src/components/player/AudioPlayer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/lib/utils";

import PlayerTrackInfo from "./PlayerTrackInfo";
import PlayerControls from "./PlayerControls";
import PlayerProgressBar from "./PlayerProgressBar";
import PlayerVolume from "./PlayerVolume";

type CurrentTrack = ReturnType<typeof usePlayerStore.getState>["currentTrack"];
type SourceKind = "none" | "hls-native" | "hls-js" | "fallback";
type LoadStatus = "idle" | "loading" | "ready" | "playing" | "error";

type WakeLockCapableNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

type NetworkAwareNavigator = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
};

type PlaybackEventType =
  | "play_start"
  | "startup"
  | "stall_start"
  | "stall_recovered"
  | "level_switch"
  | "listen_qualified"
  | "complete"
  | "error";

type HlsProbe = {
  url: string;
  variantUrl: string;
  initUrl: string | null;
  firstSegmentUrl: string | null;
};

const SEEK_OFFSET = 10;
const PREFETCH_THRESHOLD = 0.65;
const BACKGROUND_KEEPALIVE_MS = 25_000;
const HLS_TYPES = ["application/vnd.apple.mpegurl", "application/x-mpegurl", "audio/mpegurl", "audio/x-mpegurl"];
const MEDIA_TYPES = ["audio/mp4", "audio/mpeg", "video/mp4", "video/iso.segment", "application/octet-stream"];

const toAbsoluteUrl = (url?: string | null) => {
  const value = url?.trim();
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === "undefined") return value;
  return new URL(value, window.location.origin).toString();
};

const sameOriginOrHttps = (url: string) => {
  const parsed = new URL(url, window.location.origin);
  return parsed.protocol === "https:" || parsed.hostname === window.location.hostname;
};

const allowedType = (actual: string | null, expected: string[]) => {
  if (!actual) return true;
  return expected.includes(actual.split(";")[0].trim().toLowerCase());
};

const getDisplayImage = (track: CurrentTrack) =>
  track?.cover_url || track?.albums?.cover_url || track?.artists?.image_url || "/miraclefm.jpg";

const buildArtwork = (src: string): MediaImage[] => {
  const url = toAbsoluteUrl(src);
  return [
    { src: url, sizes: "96x96", type: "image/jpeg" },
    { src: url, sizes: "128x128", type: "image/jpeg" },
    { src: url, sizes: "192x192", type: "image/jpeg" },
    { src: url, sizes: "256x256", type: "image/jpeg" },
    { src: url, sizes: "384x384", type: "image/jpeg" },
    { src: url, sizes: "512x512", type: "image/jpeg" },
  ];
};

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const canPrefetch = () => {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as NetworkAwareNavigator).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
};

const resolveMediaUrl = (line: string, baseUrl: string) => new URL(line.trim(), baseUrl).toString();

const firstPlaylistMediaLine = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

const firstVariantPlaylist = (masterText: string, masterUrl: string) => {
  const lines = masterText.split("\n").map((line) => line.trim());
  const streamInfoIndex = lines.findIndex((line) => line.startsWith("#EXT-X-STREAM-INF"));
  if (streamInfoIndex === -1) return null;
  const variantLine = lines.slice(streamInfoIndex + 1).find((line) => line && !line.startsWith("#"));
  return variantLine ? resolveMediaUrl(variantLine, masterUrl) : null;
};

const initSegmentUrl = (playlistText: string, playlistUrl: string) => {
  const match = playlistText.match(/#EXT-X-MAP:.*URI="([^"]+)"/);
  return match?.[1] ? resolveMediaUrl(match[1], playlistUrl) : null;
};

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 6_000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function probeHls(rawUrl?: string | null): Promise<HlsProbe> {
  const url = toAbsoluteUrl(rawUrl);
  if (!url) throw new Error("Missing HLS playlist URL.");
  if (!sameOriginOrHttps(url)) throw new Error("Audio URLs must use HTTPS.");

  const master = await fetchWithTimeout(url);
  if (!master.ok) throw new Error(`HLS master playlist returned HTTP ${master.status}.`);
  if (!allowedType(master.headers.get("content-type"), HLS_TYPES)) {
    throw new Error("HLS master playlist has the wrong content type.");
  }

  const masterText = await master.text();
  if (!masterText.includes("#EXTM3U")) throw new Error("HLS master playlist is invalid.");

  const variantUrl = firstVariantPlaylist(masterText, url) || url;
  const variant =
    variantUrl === url
      ? new Response(masterText, {
          status: 200,
          headers: { "content-type": master.headers.get("content-type") || HLS_TYPES[0] },
        })
      : await fetchWithTimeout(variantUrl);

  if (!variant.ok) throw new Error(`HLS variant playlist returned HTTP ${variant.status}.`);
  if (!allowedType(variant.headers.get("content-type"), HLS_TYPES)) {
    throw new Error("HLS variant playlist has the wrong content type.");
  }

  const variantText = await variant.text();
  const initUrl = initSegmentUrl(variantText, variantUrl);
  const mediaLine = firstPlaylistMediaLine(variantText);
  const firstSegmentUrl = mediaLine ? resolveMediaUrl(mediaLine, variantUrl) : null;

  if (!initUrl) throw new Error("HLS encode is missing init.mp4. Re-encode this track.");

  const objectsToProbe = [initUrl, firstSegmentUrl].filter((value): value is string => Boolean(value));
  for (const objectUrl of objectsToProbe) {
    const response = await fetchWithTimeout(objectUrl, { headers: { Range: "bytes=0-1" } });
    if (!response.ok && response.status !== 206) {
      throw new Error(`HLS media object returned HTTP ${response.status}.`);
    }
    if (!allowedType(response.headers.get("content-type"), MEDIA_TYPES)) {
      throw new Error("HLS media object has the wrong content type.");
    }
  }

  return { url, variantUrl, initUrl, firstSegmentUrl };
}

async function probeFallback(rawUrl?: string | null) {
  const url = toAbsoluteUrl(rawUrl);
  if (!url) throw new Error("Missing fallback audio URL.");
  if (!sameOriginOrHttps(url)) throw new Error("Fallback audio URL must use HTTPS.");

  const response = await fetchWithTimeout(url, { headers: { Range: "bytes=0-1" } });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Fallback audio returned HTTP ${response.status}.`);
  }
  if (!allowedType(response.headers.get("content-type"), MEDIA_TYPES)) {
    throw new Error("Fallback audio has the wrong content type.");
  }

  return url;
}

export default function AudioPlayer() {
  const { currentTrack, isPlaying, playNext, playPrevious } = usePlayerStore();
  const setCurrentTime = usePlayerStore((state) => state.setCurrentTime);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const seekTarget = usePlayerStore((state) => state.seekTarget);
  const seekRequestId = usePlayerStore((state) => state.seekRequestId);

  const [sourceKind, setSourceKind] = useState<SourceKind>("none");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const loadTokenRef = useRef(0);
  const userWantsPlayRef = useRef(false);
  const sourceKindRef = useRef<SourceKind>("none");
  const lastPrefetchRef = useRef("");
  const sessionIdRef = useRef("");
  const loadStartedAtRef = useRef(0);
  const startupReportedRef = useRef(false);
  const qualifiedListenRef = useRef(false);
  const completedRef = useRef(false);
  const stallStartedAtRef = useRef<number | null>(null);

  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);
  const setIsPlayingRef = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  }, [setIsPlaying]);

  useEffect(() => {
    setCurrentTimeRef.current = setCurrentTime;
  }, [setCurrentTime]);

  useEffect(() => {
    userWantsPlayRef.current = isPlaying;
  }, [isPlaying]);

  const setActiveSourceKind = useCallback((kind: SourceKind) => {
    sourceKindRef.current = kind;
    setSourceKind(kind);
  }, []);

  const sendPlayEvent = useCallback(
    (eventType: PlaybackEventType, extra: Record<string, unknown> = {}) => {
      if (!currentTrack || !sessionIdRef.current) return;

      const audio = audioRef.current;
      const payload = {
        event_type: eventType,
        track_id: currentTrack.id,
        session_id: sessionIdRef.current,
        position_seconds: audio?.currentTime ?? 0,
        duration_seconds: Number.isFinite(audio?.duration) ? audio?.duration : undefined,
        ...extra,
      };

      const body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/audio/events", new Blob([body], { type: "application/json" }));
        return;
      }

      fetch("/api/audio/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    },
    [currentTrack]
  );

  const syncPositionState = useCallback(() => {
    if (!("mediaSession" in navigator) || !audioRef.current) return;
    const { duration, playbackRate, currentTime } = audioRef.current;
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(currentTime)) return;

    try {
      navigator.mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
    } catch {}
  }, []);

  const acquireWakeLock = useCallback(async () => {
    const wakeNavigator = navigator as WakeLockCapableNavigator;
    if (!wakeNavigator.wakeLock) return;

    try {
      if (wakeLockRef.current?.released === false) return;
      const sentinel = await wakeNavigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (userWantsPlayRef.current) acquireWakeLock();
      });
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const destroyHls = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const playIfWanted = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !userWantsPlayRef.current) return false;

    try {
      await audio.play();
      setLoadStatus("playing");
      await acquireWakeLock();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
        syncPositionState();
      }
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      sendPlayEvent("error", {
        error_code: err.name || "play-failed",
        metadata: { message: err.message, sourceKind: sourceKindRef.current },
      });

      if (err.name === "NotAllowedError") {
        toast.message("Tap play to start audio", {
          description: "Your browser blocked autoplay until a user gesture.",
        });
      } else {
        toast.error("Audio could not start", { description: err.message });
      }

      setLoadStatus("error");
      setIsPlaying(false);
      return false;
    }
  }, [acquireWakeLock, sendPlayEvent, setIsPlaying, syncPositionState]);

  const loadFallback = useCallback(
    async (track: NonNullable<CurrentTrack>, token: number, reason: string) => {
      const audio = audioRef.current;
      if (!audio) return false;

      try {
        const fallbackUrl = await probeFallback(track.fallback_audio_url);
        if (loadTokenRef.current !== token) return true;

        destroyHls();
        setActiveSourceKind("fallback");
        setLoadStatus("loading");
        audio.src = fallbackUrl;
        audio.load();
        sendPlayEvent("error", {
          error_code: "hls-fallback",
          metadata: { reason, fallbackUrl },
        });
        return true;
      } catch (error) {
        if (loadTokenRef.current !== token) return true;
        const message = error instanceof Error ? error.message : String(error);
        setActiveSourceKind("none");
        setLoadStatus("error");
        setIsPlaying(false);
        sendPlayEvent("error", {
          error_code: "fallback-unavailable",
          metadata: { reason, message, url: track.fallback_audio_url },
        });
        toast.error("Audio source is not playable", { description: message });
        return false;
      }
    },
    [destroyHls, sendPlayEvent, setActiveSourceKind, setIsPlaying]
  );

  const loadTrack = useCallback(
    async (track: NonNullable<CurrentTrack>, token: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      destroyHls();
      setActiveSourceKind("none");
      setLoadStatus("loading");
      setCurrentTime(0);
      setDuration(0);
      audio.removeAttribute("src");
      audio.load();

      const nativeHls =
        audio.canPlayType("application/vnd.apple.mpegurl") ||
        audio.canPlayType("application/x-mpegURL");

      try {
        const hls = await probeHls(track.hls_url);
        if (loadTokenRef.current !== token) return;

        if (isIOS() || (!Hls.isSupported() && nativeHls)) {
          setActiveSourceKind("hls-native");
          audio.src = hls.url;
          audio.load();
          return;
        }

        if (!Hls.isSupported()) {
          throw new Error("This browser cannot play HLS for this track.");
        }

        const hlsPlayer = new Hls({
          startLevel: 0,
          testBandwidth: false,
          startFragPrefetch: true,
          enableWorker: true,
          maxBufferLength: 90,
          maxMaxBufferLength: 240,
          backBufferLength: 30,
          fragLoadingTimeOut: 20_000,
          fragLoadingMaxRetry: 6,
          levelLoadingTimeOut: 10_000,
          levelLoadingMaxRetry: 5,
          manifestLoadingTimeOut: 10_000,
          manifestLoadingMaxRetry: 5,
          abrEwmaDefaultEstimate: 160_000,
        });

        hlsRef.current = hlsPlayer;
        setActiveSourceKind("hls-js");

        hlsPlayer.on(Hls.Events.MEDIA_ATTACHED, () => {
          if (loadTokenRef.current === token) hlsPlayer.loadSource(hls.url);
        });

        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          hlsPlayer.nextLevel = -1;
          sendPlayEvent("level_switch", {
            hls_level: 0,
            metadata: { levels: data.levels.length, preparedVariant: hls.variantUrl },
          });
        });

        hlsPlayer.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          if (data.details?.totalduration) setDuration(data.details.totalduration);
        });

        hlsPlayer.on(Hls.Events.FRAG_BUFFERED, (_, data) => {
          if (data.frag.type !== "main") return;
          setLoadStatus("ready");
          playIfWanted();
        });

        let mediaRecoveryAttempts = 0;
        let networkRecoveryAttempts = 0;

        hlsPlayer.on(Hls.Events.ERROR, async (_, data) => {
          sendPlayEvent("error", {
            error_code: `${data.type}:${data.details}`,
            metadata: { fatal: data.fatal, response: data.response, sourceKind: "hls-js" },
          });

          if (!data.fatal || loadTokenRef.current !== token) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 2) {
            networkRecoveryAttempts += 1;
            hlsPlayer.startLoad();
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 2) {
            mediaRecoveryAttempts += 1;
            hlsPlayer.recoverMediaError();
            return;
          }

          await loadFallback(track, token, `${data.type}:${data.details}`);
        });

        hlsPlayer.attachMedia(audio);
      } catch (error) {
        if (loadTokenRef.current !== token) return;
        const message = error instanceof Error ? error.message : String(error);
        await loadFallback(track, token, message);
      }
    },
    [
      destroyHls,
      loadFallback,
      playIfWanted,
      sendPlayEvent,
      setActiveSourceKind,
      setCurrentTime,
      setDuration,
    ]
  );

  useEffect(() => {
    if (!currentTrack) return;

    const token = loadTokenRef.current + 1;
    loadTokenRef.current = token;
    lastPrefetchRef.current = "";
    sessionIdRef.current = crypto.randomUUID();
    loadStartedAtRef.current = performance.now();
    startupReportedRef.current = false;
    qualifiedListenRef.current = false;
    completedRef.current = false;
    stallStartedAtRef.current = null;

    sendPlayEvent("play_start", { metadata: { source: "audio-player-v2" } });
    loadTrack(currentTrack, token);

    return () => {
      loadTokenRef.current += 1;
      destroyHls();
    };
  }, [currentTrack, destroyHls, loadTrack, sendPlayEvent]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      userWantsPlayRef.current = true;
      if (audio.src || hlsRef.current) playIfWanted();
      return;
    }

    userWantsPlayRef.current = false;
    audio.pause();
    releaseWakeLock();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  }, [isPlaying, playIfWanted, releaseWakeLock]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTarget === null) return;
    audio.currentTime = seekTarget;
    setCurrentTime(seekTarget);
    syncPositionState();
  }, [seekRequestId, seekTarget, setCurrentTime, syncPositionState]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const seek = (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const next = Math.max(0, Math.min(audio.currentTime + delta, duration || audio.currentTime + delta));
      audio.currentTime = next;
      setCurrentTimeRef.current(next);
      syncPositionState();
    };

    const continueFromMediaControl = (action: "next" | "previous") => {
      userWantsPlayRef.current = true;
      setIsPlayingRef.current(true);
      navigator.mediaSession.playbackState = "playing";

      if (action === "next") playNextRef.current();
      else playPreviousRef.current();

      window.setTimeout(() => {
        if (userWantsPlayRef.current) playIfWanted();
      }, 0);
    };

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => setIsPlayingRef.current(true)],
      ["pause", () => setIsPlayingRef.current(false)],
      ["stop", () => setIsPlayingRef.current(false)],
      ["previoustrack", () => continueFromMediaControl("previous")],
      ["nexttrack", () => continueFromMediaControl("next")],
      ["seekbackward", (details) => seek(-(details?.seekOffset ?? SEEK_OFFSET))],
      ["seekforward", (details) => seek(details?.seekOffset ?? SEEK_OFFSET)],
      [
        "seekto",
        (details) => {
          if (details?.seekTime === undefined || !audioRef.current) return;
          audioRef.current.currentTime = details.seekTime;
          setCurrentTimeRef.current(details.seekTime);
          syncPositionState();
        },
      ],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {}
    });
  }, [playIfWanted, syncPositionState]);

  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artists?.name ?? "Unknown Artist",
      album: currentTrack.albums?.title ?? "Miracle FM",
      artwork: buildArtwork(getDisplayImage(currentTrack)),
    });
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      syncPositionState();
      if (userWantsPlayRef.current) {
        hlsRef.current?.startLoad();
        playIfWanted();
        acquireWakeLock();
      }
    };

    const onResume = () => {
      if (!userWantsPlayRef.current) return;
      hlsRef.current?.startLoad();
      playIfWanted();
    };

    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("resume", onResume);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("resume", onResume);
    };
  }, [acquireWakeLock, playIfWanted, syncPositionState]);

  useEffect(() => {
    if (!isPlaying || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const pingWorker = () => {
      navigator.serviceWorker.controller?.postMessage({
        type: "KEEPALIVE",
        reason: "audio-playback",
        trackId: currentTrack?.id,
        ts: Date.now(),
      });
    };

    pingWorker();
    const interval = window.setInterval(pingWorker, BACKGROUND_KEEPALIVE_MS);
    return () => window.clearInterval(interval);
  }, [currentTrack?.id, isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    return () => {
      destroyHls();
      releaseWakeLock();
    };
  }, [destroyHls, releaseWakeLock]);

  const prefetchNext = useCallback(async () => {
    if (!canPrefetch()) return;
    const store = usePlayerStore.getState();
    const nextTrack = store.queue?.[store.currentIndex + 1];
    if (!nextTrack) return;

    const url = toAbsoluteUrl(nextTrack.hls_url || nextTrack.fallback_audio_url);
    if (!url || lastPrefetchRef.current === url) return;
    lastPrefetchRef.current = url;

    try {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "fetch";
      link.href = url;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    } catch {}

    if (nextTrack.hls_url) probeHls(nextTrack.hls_url).catch(() => {});
    else probeFallback(nextTrack.fallback_audio_url).catch(() => {});
  }, []);

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    syncPositionState();
  };

  const displayImage = getDisplayImage(currentTrack);

  return (
    <>
      <audio
        ref={audioRef}
        hidden
        crossOrigin="anonymous"
        preload="auto"
        playsInline
        x-webkit-airplay="allow"
        controlsList="nodownload"
        onCanPlay={() => {
          setLoadStatus("ready");
          playIfWanted();
        }}
        onLoadedMetadata={(event) => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration) && duration > 0) {
            setDuration(duration);
            syncPositionState();
          }
        }}
        onDurationChange={(event) => {
          const duration = event.currentTarget.duration;
          if (Number.isFinite(duration) && duration > 0) {
            setDuration(duration);
            syncPositionState();
          }
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const { currentTime, duration } = audio;
          setCurrentTime(currentTime);
          syncPositionState();

          if (
            !qualifiedListenRef.current &&
            Number.isFinite(duration) &&
            duration > 0 &&
            (currentTime >= 30 || currentTime / duration >= 0.5)
          ) {
            qualifiedListenRef.current = true;
            sendPlayEvent("listen_qualified", { metadata: { sourceKind: sourceKindRef.current } });
          }

          if (Number.isFinite(duration) && duration > 0 && currentTime / duration >= PREFETCH_THRESHOLD) {
            prefetchNext();
          }
        }}
        onPlay={() => {
          userWantsPlayRef.current = true;
          setIsPlaying(true);
          setLoadStatus("playing");
          acquireWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          syncPositionState();
        }}
        onPlaying={() => {
          setLoadStatus("playing");
          if (!startupReportedRef.current && loadStartedAtRef.current > 0) {
            startupReportedRef.current = true;
            sendPlayEvent("startup", {
              startup_ms: Math.round(performance.now() - loadStartedAtRef.current),
              metadata: { sourceKind: sourceKindRef.current },
            });
          }

          if (stallStartedAtRef.current !== null) {
            sendPlayEvent("stall_recovered", {
              stall_ms: Math.round(performance.now() - stallStartedAtRef.current),
              metadata: { sourceKind: sourceKindRef.current },
            });
            stallStartedAtRef.current = null;
          }
        }}
        onPause={() => {
          if (userWantsPlayRef.current) return;
          setIsPlaying(false);
          setLoadStatus(audioRef.current?.src ? "ready" : "idle");
          releaseWakeLock();
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
        }}
        onWaiting={() => {
          if (stallStartedAtRef.current !== null) return;
          stallStartedAtRef.current = performance.now();
          sendPlayEvent("stall_start", { metadata: { sourceKind: sourceKindRef.current } });
        }}
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            sendPlayEvent("complete", { metadata: { sourceKind: sourceKindRef.current } });
          }
          if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          userWantsPlayRef.current = true;
          setIsPlaying(true);
          playNextRef.current();
          window.setTimeout(() => {
            if (userWantsPlayRef.current) playIfWanted();
          }, 0);
        }}
        onError={async () => {
          const track = currentTrack;
          const token = loadTokenRef.current;
          const code = audioRef.current?.error?.code || "unknown";
          sendPlayEvent("error", {
            error_code: `media:${code}`,
            metadata: { sourceKind: sourceKindRef.current },
          });

          if (track && sourceKindRef.current !== "fallback") {
            await loadFallback(track, token, `media:${code}`);
            return;
          }

          setLoadStatus("error");
          setIsPlaying(false);
          toast.error("Audio source is not playable", {
            description: "The HLS and fallback audio sources both failed.",
          });
        }}
      />

      {currentTrack && (
        <div
          className={cn(
            "fixed left-0 right-0 z-40 transition-all duration-300",
            "bottom-[92px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[430px] h-[74px]",
            "bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(5,5,5,0.96))] backdrop-blur-3xl border border-white/10 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95)]",
            "rounded-[1.75rem] px-2.5 overflow-hidden ring-1 ring-white/[0.04]",
            "md:bottom-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none md:h-[96px]",
            "md:bg-[#050505]/95 md:border-t md:border-x-0 md:border-b-0 md:rounded-none md:px-6 md:overflow-visible"
          )}
          data-source-kind={sourceKind}
          data-load-status={loadStatus}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,0,85,0.18),transparent_38%)] md:hidden" />
          <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2.5 md:gap-4 relative z-10">
            <PlayerTrackInfo displayImage={displayImage} />
            <div className="flex items-center justify-end md:justify-center md:flex-col flex-none md:flex-1 max-w-[44%] pr-1 md:pr-0">
              <PlayerControls />
              <PlayerProgressBar onSeek={handleSeek} />
            </div>
            <PlayerVolume audioRef={audioRef} />
          </div>
        </div>
      )}
    </>
  );
}
