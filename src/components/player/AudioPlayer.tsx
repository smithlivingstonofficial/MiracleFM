// src/components/player/AudioPlayer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { toast } from "sonner";
import { usePlayerStore } from "@/store/usePlayerStore";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

import PlayerTrackInfo from "./PlayerTrackInfo";
import PlayerControls from "./PlayerControls";
import PlayerProgressBar from "./PlayerProgressBar";
import PlayerVolume from "./PlayerVolume";

type CurrentTrack = ReturnType<typeof usePlayerStore.getState>["currentTrack"];
type SourceKind = "none" | "hls-native" | "hls-js" | "fallback";
type LoadStatus = "idle" | "loading" | "ready" | "playing" | "error";
type RecommendationTrackRow = {
  track_id: string;
  score?: number;
  reason?: string;
};

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
const AUTO_FILL_MIN_QUEUE = 6;
const AUTO_FILL_FETCH_LIMIT = 40;
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

const isMobileBrowser = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  const touchLikelyMobile = typeof window !== "undefined" && navigator.maxTouchPoints > 1 && window.innerWidth <= 1024;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || touchLikelyMobile;
};

const shouldPreferFallbackForBackground = (track: NonNullable<CurrentTrack>) => {
  const isHidden = typeof document !== "undefined" && document.hidden;
  return (isHidden || (!isIOS() && isMobileBrowser())) && Boolean(track.fallback_audio_url);
};

const canPrefetch = () => {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as NetworkAwareNavigator).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
};

const isExpectedPlayInterruption = (error: Error) =>
  error.name === "AbortError" ||
  /play\(\) request was interrupted|interrupted by a new load request|interrupted by a call to pause/i.test(
    error.message
  );

const shuffled = <T,>(items: T[]) =>
  [...items].sort(() => Math.random() - 0.5);

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
  const appendToQueue = usePlayerStore((state) => state.appendToQueue);
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
  const autoFillInFlightRef = useRef(false);
  const fallbackPrimaryActiveRef = useRef(false);
  const fallbackPrimaryRejectedRef = useRef(false);

  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);
  const setIsPlayingRef = useRef(setIsPlaying);
  const setCurrentTimeRef = useRef(setCurrentTime);
  const appendToQueueRef = useRef(appendToQueue);
  const currentTrackRef = useRef(currentTrack);

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
    appendToQueueRef.current = appendToQueue;
  }, [appendToQueue]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    userWantsPlayRef.current = isPlaying;
  }, [isPlaying]);

  const setActiveSourceKind = useCallback((kind: SourceKind) => {
    sourceKindRef.current = kind;
    setSourceKind(kind);
  }, []);

  const playbackMetadata = useCallback((metadata: Record<string, unknown> = {}) => ({
    ...metadata,
    sourceKind: sourceKindRef.current,
    isIOS: isIOS(),
    isMobile: isMobileBrowser(),
    visibilityState: typeof document === "undefined" ? "unknown" : document.visibilityState,
  }), []);

  const sendPlayEvent = useCallback(
    (eventType: PlaybackEventType, extra: Record<string, unknown> = {}) => {
      // Discard transient events to prevent excessive DB writes and network egress in dev/free tier
      if (
        eventType === "level_switch" ||
        eventType === "stall_start" ||
        eventType === "stall_recovered" ||
        eventType === "startup"
      ) {
        return;
      }

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

  const playIfWanted = useCallback(async (expectedToken = loadTokenRef.current) => {
    const audio = audioRef.current;
    if (!audio || !userWantsPlayRef.current) return false;

    try {
      await audio.play();
      if (loadTokenRef.current !== expectedToken) return false;
      setLoadStatus("playing");
      await acquireWakeLock();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
        syncPositionState();
      }
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (
        loadTokenRef.current !== expectedToken ||
        !userWantsPlayRef.current ||
        isExpectedPlayInterruption(err)
      ) {
        return false;
      }

      sendPlayEvent("error", {
        error_code: err.name || "play-failed",
        metadata: playbackMetadata({ message: err.message, reason: "play-if-wanted" }),
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
  }, [acquireWakeLock, playbackMetadata, sendPlayEvent, setIsPlaying, syncPositionState]);

  const autoFillQueueIfNeeded = useCallback(async () => {
    if (autoFillInFlightRef.current) return false;

    const store = usePlayerStore.getState();
    const { queue, currentIndex, playedTrackIds, currentTrack } = store;
    const remainingTracks = queue.length - currentIndex - 1;
    const needsMoreTracks =
      queue.length <= 1 || remainingTracks <= 0 || (store.isPlaying && queue.length < AUTO_FILL_MIN_QUEUE);

    if (!needsMoreTracks) return false;

    autoFillInFlightRef.current = true;
    try {
      const excludedIds = new Set([
        ...queue.map((track) => track.id),
        ...playedTrackIds,
        ...(currentTrack?.id ? [currentTrack.id] : []),
      ]);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, artist_id, album_id, cover_url, hls_url, fallback_audio_url, duration, duration_seconds, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .order("created_at", { ascending: false })
        .limit(AUTO_FILL_FETCH_LIMIT);

      if (error || !data?.length) return false;

      const fallbackTracks = shuffled(
        (data as Track[]).filter((track) => !excludedIds.has(track.id))
      );
      const nextTracks = fallbackTracks.slice(0, AUTO_FILL_MIN_QUEUE);

      if (!nextTracks.length) return false;

      appendToQueueRef.current(nextTracks);
      return true;
    } catch {
      return false;
    } finally {
      autoFillInFlightRef.current = false;
    }
  }, []);

  const continueToNextTrack = useCallback((reason = "auto") => {
    userWantsPlayRef.current = true;
    setIsPlayingRef.current(true);
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";

    sendPlayEvent("level_switch", {
      metadata: playbackMetadata({ action: "next-track-transition", reason }),
    });

    playNextRef.current();
    void autoFillQueueIfNeeded();
  }, [autoFillQueueIfNeeded, playbackMetadata, sendPlayEvent]);

  const loadFallbackDirect = useCallback(
    (track: NonNullable<CurrentTrack>, token: number, reason: string) => {
      const audio = audioRef.current;
      if (!audio) return false;

      try {
        const fallbackUrl = toAbsoluteUrl(track.fallback_audio_url);
        if (!fallbackUrl) throw new Error("Missing fallback audio URL.");
        if (!sameOriginOrHttps(fallbackUrl)) throw new Error("Fallback audio URL must use HTTPS.");
        if (loadTokenRef.current !== token) return true;

        destroyHls();
        fallbackPrimaryActiveRef.current = true;
        fallbackPrimaryRejectedRef.current = false;
        setActiveSourceKind("fallback");
        setLoadStatus("loading");
        audio.src = fallbackUrl;
        audio.load();
        void playIfWanted(token);
        sendPlayEvent("level_switch", {
          metadata: playbackMetadata({
            action: "source-selected",
            reason,
            fallbackMode: "direct",
          }),
        });
        return true;
      } catch (error) {
        if (loadTokenRef.current !== token) return true;
        const message = error instanceof Error ? error.message : String(error);
        sendPlayEvent("error", {
          error_code: "fallback-direct-unavailable",
          metadata: playbackMetadata({ reason, message, url: track.fallback_audio_url }),
        });
        return false;
      }
    },
    [destroyHls, playbackMetadata, playIfWanted, sendPlayEvent, setActiveSourceKind]
  );

  const loadFallback = useCallback(
    async (track: NonNullable<CurrentTrack>, token: number, reason: string) => {
      const audio = audioRef.current;
      if (!audio) return false;

      try {
        const fallbackUrl = await probeFallback(track.fallback_audio_url);
        if (loadTokenRef.current !== token) return true;

        destroyHls();
        fallbackPrimaryActiveRef.current = false;
        fallbackPrimaryRejectedRef.current = false;
        setActiveSourceKind("fallback");
        setLoadStatus("loading");
        audio.src = fallbackUrl;
        audio.load();
        sendPlayEvent("error", {
          error_code: "hls-fallback",
          metadata: playbackMetadata({ reason, fallbackUrl, fallbackMode: "probed" }),
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
          metadata: playbackMetadata({ reason, message, url: track.fallback_audio_url }),
        });
        toast.error("Audio source is not playable", { description: message });
        return false;
      }
    },
    [destroyHls, playbackMetadata, sendPlayEvent, setActiveSourceKind, setIsPlaying]
  );

  const loadTrack = useCallback(
    async (track: NonNullable<CurrentTrack>, token: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      destroyHls();
      fallbackPrimaryActiveRef.current = false;
      setActiveSourceKind("none");
      setLoadStatus("loading");
      setCurrentTime(0);
      setDuration(0);
      audio.removeAttribute("src");
      audio.load();

      const nativeHls =
        audio.canPlayType("application/vnd.apple.mpegurl") ||
        audio.canPlayType("application/x-mpegURL");

      if (
        shouldPreferFallbackForBackground(track) &&
        !fallbackPrimaryRejectedRef.current &&
        loadFallbackDirect(track, token, "mobile-background-primary")
      ) {
        return;
      }

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
            metadata: playbackMetadata({ levels: data.levels.length, preparedVariant: hls.variantUrl }),
          });
        });

        hlsPlayer.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          if (data.details?.totalduration) setDuration(data.details.totalduration);
        });

        hlsPlayer.on(Hls.Events.FRAG_BUFFERED, (_, data) => {
          if (data.frag.type !== "main") return;
          if (loadTokenRef.current !== token) return;
          setLoadStatus("ready");
          playIfWanted(token);
        });

        let mediaRecoveryAttempts = 0;
        let networkRecoveryAttempts = 0;

        hlsPlayer.on(Hls.Events.ERROR, async (_, data) => {
          sendPlayEvent("error", {
            error_code: `${data.type}:${data.details}`,
            metadata: playbackMetadata({ fatal: data.fatal, response: data.response, hlsSourceKind: "hls-js" }),
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
      loadFallbackDirect,
      loadFallback,
      playbackMetadata,
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
    fallbackPrimaryActiveRef.current = false;
    fallbackPrimaryRejectedRef.current = false;

    sendPlayEvent("play_start", {
      metadata: playbackMetadata({
        source: "audio-player-v2",
        preferredSource: shouldPreferFallbackForBackground(currentTrack) ? "fallback" : "hls",
      }),
    });
    loadTrack(currentTrack, token);

    return () => {
      loadTokenRef.current += 1;
      destroyHls();
    };
  }, [currentTrack, destroyHls, loadTrack, playbackMetadata, sendPlayEvent]);

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

      if (action === "next") {
        continueToNextTrack("media-session-next");
        return;
      }

      playPreviousRef.current();
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
  }, [continueToNextTrack, syncPositionState]);

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
    const recoverPlayback = (reason: string) => {
      if (!userWantsPlayRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      hlsRef.current?.startLoad();
      syncPositionState();

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const nearlyEnded = duration > 0 && duration - audio.currentTime <= 1.5;
      if (audio.ended || nearlyEnded) {
        continueToNextTrack(reason);
        return;
      }

      playIfWanted();
      acquireWakeLock();
      sendPlayEvent("level_switch", {
        metadata: playbackMetadata({ action: "lifecycle-recover", reason }),
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        recoverPlayback("visibility-visible");
      } else if (document.visibilityState === "hidden") {
        // Document has gone to the background (locked/minimized)
        // If we are currently playing HLS with hls.js (which pauses in background),
        // we swap to progressive fallback (MP3/AAC) at the exact same play head location!
        const audio = audioRef.current;
        const track = currentTrackRef.current;
        if (!audio || !track || sourceKindRef.current !== "hls-js" || !track.fallback_audio_url) {
          sendPlayEvent("level_switch", {
            metadata: playbackMetadata({ action: "lifecycle-background", reason: "visibilitychange-hidden" }),
          });
          return;
        }

        const savedTime = audio.currentTime;
        const wasPlaying = !audio.paused;

        try {
          const fallbackUrl = toAbsoluteUrl(track.fallback_audio_url);
          destroyHls();
          fallbackPrimaryActiveRef.current = true;
          setActiveSourceKind("fallback");
          
          audio.src = fallbackUrl;
          audio.load();
          audio.currentTime = savedTime;
          if (wasPlaying) {
            audio.play().catch(() => {
              // Ignore play interruption errors
            });
          }
          sendPlayEvent("level_switch", {
            metadata: playbackMetadata({
              action: "visibility-background-fallback-swap",
              savedTime,
            }),
          });
        } catch (err) {
          // Keep active source kind clean
        }
      }
    };

    const onResume = () => {
      recoverPlayback("resume");
    };

    const onPageShow = () => {
      recoverPlayback("pageshow");
    };

    const onPageHide = () => {
      sendPlayEvent("level_switch", {
        metadata: playbackMetadata({ action: "lifecycle-background", reason: "pagehide" }),
      });
    };

    const onFreeze = () => {
      sendPlayEvent("level_switch", {
        metadata: playbackMetadata({ action: "lifecycle-background", reason: "freeze" }),
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("resume", onResume);
    document.addEventListener("freeze", onFreeze);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("resume", onResume);
      document.removeEventListener("freeze", onFreeze);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [
    acquireWakeLock,
    continueToNextTrack,
    destroyHls,
    playbackMetadata,
    playIfWanted,
    sendPlayEvent,
    setActiveSourceKind,
    syncPositionState,
  ]);

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

    const preferredUrl =
      shouldPreferFallbackForBackground(nextTrack) ? nextTrack.fallback_audio_url || nextTrack.hls_url : nextTrack.hls_url || nextTrack.fallback_audio_url;
    const url = toAbsoluteUrl(preferredUrl);
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

    if (shouldPreferFallbackForBackground(nextTrack) && nextTrack.fallback_audio_url) probeFallback(nextTrack.fallback_audio_url).catch(() => {});
    else if (nextTrack.hls_url) probeHls(nextTrack.hls_url).catch(() => {});
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
            sendPlayEvent("listen_qualified", { metadata: playbackMetadata() });
          }

          if (Number.isFinite(duration) && duration > 0 && currentTime / duration >= PREFETCH_THRESHOLD) {
            prefetchNext();
            void autoFillQueueIfNeeded();
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
              metadata: playbackMetadata(),
            });
          }

          if (stallStartedAtRef.current !== null) {
            sendPlayEvent("stall_recovered", {
              stall_ms: Math.round(performance.now() - stallStartedAtRef.current),
              metadata: playbackMetadata(),
            });
            stallStartedAtRef.current = null;
          }

          void autoFillQueueIfNeeded();
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
          sendPlayEvent("stall_start", { metadata: playbackMetadata() });
        }}
        onEnded={() => {
          if (!completedRef.current) {
            completedRef.current = true;
            sendPlayEvent("complete", { metadata: playbackMetadata({ reason: "ended" }) });
          }
          continueToNextTrack("ended");
        }}
        onError={async () => {
          const track = currentTrack;
          const token = loadTokenRef.current;
          const code = audioRef.current?.error?.code || "unknown";
          sendPlayEvent("error", {
            error_code: `media:${code}`,
            metadata: playbackMetadata({ reason: "media-element-error" }),
          });

          if (track && sourceKindRef.current !== "fallback") {
            await loadFallback(track, token, `media:${code}`);
            return;
          }

          if (
            track?.hls_url &&
            sourceKindRef.current === "fallback" &&
            fallbackPrimaryActiveRef.current &&
            shouldPreferFallbackForBackground(track)
          ) {
            fallbackPrimaryActiveRef.current = false;
            fallbackPrimaryRejectedRef.current = true;
            sendPlayEvent("error", {
              error_code: "mobile-fallback-primary-failed",
              metadata: playbackMetadata({ reason: "retry-hls-after-fallback-primary-error" }),
            });
            loadTrack(track, token);
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
            "fixed z-40 transition-all duration-300 pointer-events-auto",
            "bottom-[94px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[430px] h-[76px]",
            "bg-[linear-gradient(135deg,rgba(25,25,30,0.96),rgba(5,5,7,0.96))] backdrop-blur-3xl border border-white/10 shadow-[0_28px_80px_-22px_rgba(0,0,0,0.98)]",
            "rounded-[1.8rem] px-2.5 overflow-hidden ring-1 ring-white/[0.05]",
            "md:absolute md:bottom-0 md:left-0 md:right-0 md:translate-x-0 md:w-full md:max-w-none md:h-[84px]",
            "md:bg-zinc-950/90 md:backdrop-blur-md md:border-t md:border-white/[0.06] md:rounded-none md:px-8 md:overflow-visible md:shadow-[0_-15px_35px_rgba(0,0,0,0.6)]"
          )}
          data-source-kind={sourceKind}
          data-load-status={loadStatus}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,0,85,0.12),transparent_36%),linear-gradient(90deg,rgba(255,255,255,0.05),transparent_34%)]" />
          <div className="pointer-events-none hidden md:block absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF0055]/35 to-transparent" />
          <div className="flex items-center justify-between max-w-[1680px] mx-auto h-full gap-2.5 md:gap-6 relative z-10">
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
