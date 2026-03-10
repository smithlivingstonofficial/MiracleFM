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
  const lastUpdate = useRef(0);

  const [volume, setVolume] = useState(1);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);

  const progress = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);

  // ---------------- AUDIO ENGINE ----------------

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
        startFragPrefetch: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });

      hlsRef.current = hls;

      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying) audio.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (audio.paused && isPlaying) {
          audio.play().catch(() => {});
        }
      });
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

  // Play / Pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // Throttled time update
  const handleTimeUpdate = () => {
    const now = Date.now();
    if (now - lastUpdate.current < 250) return;

    lastUpdate.current = now;

    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // ---------------- MEDIA SESSION API ----------------

  useEffect(() => {
    if (!currentTrack) return;

    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists?.name,
        album: currentTrack.albums?.title,
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
      navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        playPrevious()
      );
    }
  }, [currentTrack]);

  // ---------------- PREFETCH NEXT TRACK ----------------

  useEffect(() => {
    const { queue, currentIndex } = usePlayerStore.getState();
    const nextTrack = queue[currentIndex + 1];
    if (!nextTrack) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = nextTrack.hls_url;
    link.as = "fetch";

    document.head.appendChild(link);
  }, [currentTrack]);

  // ---------------- PLAYLIST FUNCTIONS ----------------

  const fetchMyPlaylists = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return toast.error("Login to add to playlist");

    const { data } = await supabase
      .from("playlists")
      .select("id, title")
      .eq("user_id", user.id);

    if (data) setMyPlaylists(data);

    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;

    const { error } = await supabase
      .from("playlist_tracks")
      .insert({ playlist_id: playlistId, track_id: currentTrack.id });

    if (error?.code === "23505") toast.error("Already in this playlist");
    else if (!error) toast.success("Added to playlist");

    setShowPlaylistMenu(false);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
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
        preload="auto"
        playsInline
        hidden
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={playNext}
      />

      {/* Mobile Progress */}
      <div className="md:hidden absolute bottom-0 left-4 right-4 h-[3px] bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#FF0055] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Layout */}
      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4 relative">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-3 md:gap-4 w-auto md:w-[30%] min-w-0 h-full flex-1 md:flex-none">
          <button
            onClick={toggleFullScreen}
            className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-zinc-800"
          >
            {displayImage && (
              <Image src={displayImage} alt="" fill className="object-cover" />
            )}
          </button>

          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={toggleFullScreen}
          >
            <p className="text-white truncate font-bold">
              {currentTrack.title}
            </p>
            <p className="text-zinc-400 text-xs truncate">
              {currentTrack.artists?.name}
            </p>
          </div>
        </div>

        {/* CENTER CONTROLS */}
        <div className="flex items-center gap-4">
          <button onClick={playPrevious}>
            <SkipBack size={24} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button onClick={playNext}>
            <SkipForward size={24} />
          </button>
        </div>

        {/* RIGHT VOLUME */}
        <div className="hidden md:flex items-center gap-3">
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
            }}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}