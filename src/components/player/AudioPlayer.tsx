"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import LikeButton from "../user/LikeButton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    toggleFullScreen,
    setCurrentTime,
    setDuration,
  } = usePlayerStore();

  const supabase = createClient();

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [volume, setVolume] = useState(1);

  const progress = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  /* -----------------------------
     Load saved volume
  ----------------------------- */

  useEffect(() => {
    const saved = localStorage.getItem("player-volume");

    if (saved) {
      const v = parseFloat(saved);
      setVolume(v);

      if (audioRef.current) audioRef.current.volume = v;
    }
  }, []);

  /* -----------------------------
     HLS ENGINE
  ----------------------------- */

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const audio = audioRef.current;

    setCurrentTime(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) audio.play().catch(() => setIsPlaying(false));
      });

      hlsRef.current = hls;
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;

      if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentTrack]);

  /* -----------------------------
     PLAY / PAUSE SYNC
  ----------------------------- */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = isPlaying
        ? "playing"
        : "paused";
    }
  }, [isPlaying]);

  /* -----------------------------
     MEDIA SESSION
  ----------------------------- */

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    const artwork =
      currentTrack.cover_url ||
      currentTrack.albums?.cover_url ||
      currentTrack.artists?.image_url ||
      "/logo.png";

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artists?.name || "Miracle FM",
      album: "Miracle FM",
      artwork: [
        {
          src: artwork,
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
    navigator.mediaSession.setActionHandler("previoustrack", playPrevious);

    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (!audioRef.current) return;
      audioRef.current.currentTime += 10;
    });

    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (!audioRef.current) return;
      audioRef.current.currentTime -= 10;
    });
  }, [currentTrack]);

  /* -----------------------------
     TIME UPDATE
  ----------------------------- */

  const handleTimeUpdate = () => {
    const audio = audioRef.current;

    if (!audio) return;

    const time = audio.currentTime;
    const dur = audio.duration || 0;

    setCurrentTime(time);
    setDuration(dur);

    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: 1,
          position: time,
        });
      } catch {}
    }
  };

  /* -----------------------------
     TRACK END
  ----------------------------- */

  const handleEnded = () => {
    playNext();
  };

  /* -----------------------------
     TIME FORMAT
  ----------------------------- */

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";

    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);

    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!currentTrack) return null;

  const displayImage =
    currentTrack.cover_url ||
    currentTrack.albums?.cover_url ||
    currentTrack.artists?.image_url;

  const progressPercent = (progress / (duration || 1)) * 100;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 w-full h-[96px] bg-[#050505]/95 border-t border-white/10 z-50"
      )}
    >
      <audio
        ref={audioRef}
        hidden
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* PROGRESS BAR */}

      <div className="absolute top-0 left-0 w-full h-[3px] bg-white/10">
        <div
          className="h-full bg-[#FF0055]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* PLAYER UI */}

      <div className="flex items-center justify-between h-full px-6 max-w-[1600px] mx-auto">

        {/* LEFT */}

        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={toggleFullScreen}
        >
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-zinc-800">
            {displayImage && (
              <Image
                src={displayImage}
                alt=""
                fill
                className="object-cover"
              />
            )}
          </div>

          <div>
            <p className="font-bold truncate">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate">
              {currentTrack.artists?.name}
            </p>
          </div>
        </div>

        {/* CENTER */}

        <div className="flex items-center gap-6">

          <button onClick={playPrevious}>
            <SkipBack size={26} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause size={20} fill="black" />
            ) : (
              <Play size={20} fill="black" className="ml-1" />
            )}
          </button>

          <button onClick={playNext}>
            <SkipForward size={26} />
          </button>

        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-4">

          <Volume2 size={18} />

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);

              setVolume(v);

              if (audioRef.current) audioRef.current.volume = v;

              localStorage.setItem("player-volume", v.toString());
            }}
            className="w-24"
          />

          <button onClick={toggleFullScreen}>
            <Maximize2 size={18} />
          </button>

        </div>

      </div>
    </div>
  );
}