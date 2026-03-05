// src/components/player/AudioPlayer.tsx

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
  Repeat,
  Shuffle,
  Maximize2,
  Repeat1,
  PlusCircle,
  ListMusic,
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
    toggleShuffle,
    toggleRepeat,
    isShuffled,
    repeatMode,
    toggleFullScreen,
    setCurrentTime,
    setDuration,
  } = usePlayerStore();

  const supabase = createClient();

  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [volume, setVolume] = useState(1);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);

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
     HLS Audio Engine
  ----------------------------- */

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;

    const audio = audioRef.current;

    setCurrentTime(0);

    // destroy previous HLS
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
     Play / Pause Sync
  ----------------------------- */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  /* -----------------------------
     Media Session API
  ----------------------------- */

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artists?.name,
      artwork: [
        {
          src:
            currentTrack.cover_url ||
            currentTrack.albums?.cover_url ||
            "",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
    navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
  }, [currentTrack]);

  /* -----------------------------
     Time Update
  ----------------------------- */

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
  };

  /* -----------------------------
     Seek
  ----------------------------- */

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);

    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  /* -----------------------------
     Repeat Handling
  ----------------------------- */

  const handleEnded = () => {
    if (repeatMode === "one") {
      audioRef.current?.play();
      return;
    }

    playNext();
  };

  /* -----------------------------
     Playlist
  ----------------------------- */

  const fetchMyPlaylists = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toast.error("Login to add to playlist");

    const { data } = await supabase
      .from("playlists")
      .select("id,title")
      .eq("user_id", user.id);

    if (data) setMyPlaylists(data);

    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: currentTrack.id,
    });

    if (error?.code === "23505") toast.error("Already in playlist");
    else if (!error) toast.success("Added to playlist");

    setShowPlaylistMenu(false);
  };

  /* -----------------------------
     Time Formatter
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
  const volumePercent = volume * 100;

  return (
    <div
      className={cn(
        "fixed z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "bottom-[100px] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[64px] bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] px-2",
        "md:bottom-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none md:h-[96px] md:bg-[#050505]/95 md:border-t md:border-x-0 md:border-b-0 md:rounded-none md:px-6"
      )}
    >
      <audio
        ref={audioRef}
        hidden
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* MOBILE PROGRESS */}
      <div className="md:hidden absolute bottom-0 left-4 right-4 h-[3px] bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FF0055] shadow-[0_0_10px_#FF0055]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* MAIN UI */}
      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4 relative">

        {/* LEFT */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <button
            onClick={toggleFullScreen}
            className="relative w-12 h-12 md:w-16 md:h-16 rounded-[1rem] overflow-hidden bg-zinc-800 shrink-0"
          >
            {displayImage && (
              <Image src={displayImage} alt="" fill className="object-cover" />
            )}
          </button>

          <div
            className="min-w-0 flex-1 pr-2 cursor-pointer"
            onClick={toggleFullScreen}
          >
            <p className="text-[13px] md:text-base font-black truncate">
              {currentTrack.title}
            </p>

            <p className="text-[10px] md:text-xs text-zinc-400 truncate uppercase">
              {currentTrack.artists?.name}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-2">
            <LikeButton trackId={currentTrack.id} />

            <button
              onClick={fetchMyPlaylists}
              className="text-zinc-400 hover:text-white"
            >
              <PlusCircle size={20} />
            </button>
          </div>
        </div>

        {/* CENTER */}
        <div className="flex items-center gap-3 md:gap-6">

          <button onClick={playPrevious}>
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-black"
          >
            {isPlaying ? (
              <Pause size={20} fill="black" />
            ) : (
              <Play size={20} fill="black" className="ml-1" />
            )}
          </button>

          <button onClick={playNext}>
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {/* RIGHT */}
        <div className="hidden md:flex items-center gap-6">
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
            className="player-slider w-24"
            style={{ "--range-progress": `${volumePercent}%` } as any}
          />

          <button onClick={toggleFullScreen}>
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}