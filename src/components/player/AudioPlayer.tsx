// src/components/player/AudioPlayer.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Repeat, Shuffle, Maximize2, Repeat1, PlusCircle, ListMusic 
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
    setDuration
  } = usePlayerStore();

  const supabase = createClient();
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastUpdate = useRef(0);

  const[volume, setVolume] = useState(1);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);

  const progress = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  // --- Audio Engine Logic ---
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    setCurrentTime(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startFragPrefetch: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 1,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        liveSyncDurationCount: 3
      });

      hlsRef.current = hls;

      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if(isPlaying) audio.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        if (audio.paused && isPlaying) {
          audio.play().catch(() => {});
        }
      });

    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;
      if(isPlaying) audio.play().catch(() => setIsPlaying(false));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [currentTrack]);

  // --- Media Session API (Lockscreen / Bluetooth Controls) ---
  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;

    // 1. Add Media Session Metadata
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artists?.name || "Unknown Artist",
      album: currentTrack.albums?.title || "",
      artwork:[
        {
          src: currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url || "",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });

    // 2. Connect Notification Buttons to Your Player Logic
    navigator.mediaSession.setActionHandler("play", () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", () => playNext());
    navigator.mediaSession.setActionHandler("previoustrack", () => playPrevious());

    // Clean up handlers on unmount
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [currentTrack, setIsPlaying, playNext, playPrevious]);

  // --- Prevent Audio From Suspending When Tab Is Hidden ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVisibility = () => {
      if (document.hidden && isPlaying) {
        // Try to force keep-alive when navigating away from the tab
        audio.play().catch(()=>{});
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isPlaying]);

  // --- Prefetch Next Track ---
  useEffect(() => {
    const { queue, currentIndex } = usePlayerStore.getState();

    const nextTrack = queue[currentIndex + 1];
    if (!nextTrack) return;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = nextTrack.hls_url;
    link.as = "fetch";

    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, [currentTrack]);

  // --- Play/Pause Sync ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

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

  const fetchMyPlaylists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login to add to playlist");
    const { data } = await supabase.from("playlists").select("id, title").eq("user_id", user.id);
    if (data) setMyPlaylists(data);
    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: currentTrack.id });
    if (error?.code === '23505') toast.error("Already in this playlist");
    else if (!error) toast.success("Added to playlist");
    setShowPlaylistMenu(false);
  };

  const formatTime = (time: number) => {
    if(isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!currentTrack) return null;

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;
  const progressPercent = (progress / (duration || 1)) * 100;
  const volumePercent = volume * 100;

  return (
    <div className={cn(
      "fixed z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      "bottom-[100px] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[64px] bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] px-2",
      "md:bottom-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none md:h-[96px] md:bg-[#050505]/95 md:border-t md:border-x-0 md:border-b-0 md:rounded-none md:px-6"
    )}>
      
      {/* Added playsInline for mobile backgrounds */}
      <audio 
        ref={audioRef} 
        preload="auto"
        playsInline
        hidden 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleTimeUpdate} 
        onEnded={playNext}
      />
      
      <div className="md:hidden absolute bottom-0 left-4 right-4 h-[3px] bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-[#FF0055] shadow-[0_0_10px_#FF0055] transition-all duration-300 ease-linear rounded-full" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4 relative">
        
        <div className="flex items-center gap-3 md:gap-4 w-auto md:w-[30%] min-w-0 h-full flex-1 md:flex-none">
          
          <button onClick={toggleFullScreen} className="relative w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.25rem] overflow-hidden bg-zinc-800 shrink-0 group shadow-lg active:scale-95 transition-transform">
            {displayImage && <Image src={displayImage} alt="" fill className="object-cover" />}
            <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
              <Maximize2 size={20} className="text-white" />
            </div>
          </button>
          
          <div className="min-w-0 flex-1 pr-2 cursor-pointer active:opacity-70 transition-opacity" onClick={toggleFullScreen}>
            <p className="text-[13px] md:text-base font-black text-white truncate drop-shadow-md">{currentTrack.title}</p>
            <p className="text-[10px] md:text-xs font-bold text-zinc-400 truncate uppercase tracking-wide mt-0.5">{currentTrack.artists?.name}</p>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-2 shrink-0">
            <LikeButton trackId={currentTrack.id} />
            <div className="relative">
              <button onClick={fetchMyPlaylists} className="text-zinc-400 hover:text-white transition-colors active:scale-90"><PlusCircle size={20} /></button>
              {showPlaylistMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
                  <div className="absolute left-0 bottom-full mb-6 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2">
                    <p className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Save to Playlist</p>
                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                      {myPlaylists.map(pl => (
                        <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors">
                          <ListMusic size={16} className="text-[#FF0055]" /> {pl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end md:justify-center md:flex-col flex-none md:flex-1 max-w-[45%] pr-2 md:pr-0">
          
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={toggleShuffle} className={cn("hidden md:block active:scale-90 transition-all", isShuffled ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}><Shuffle size={18} /></button>
            <button onClick={playPrevious} className="hidden md:block text-zinc-400 hover:text-white active:scale-90 transition-all"><SkipBack size={24} fill="currentColor" /></button>
            
            <div className="relative group/play flex items-center justify-center">
              {isPlaying && <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-md opacity-40 animate-pulse" />}
              
              <button 
                onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} 
                className="relative z-10 w-11 h-11 md:w-12 md:h-12 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-xl"
              >
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
              </button>
            </div>

            <button onClick={playNext} className="text-zinc-400 hover:text-white active:scale-90 transition-all"><SkipForward className="w-7 h-7 md:w-[24px] md:h-[24px]" fill="currentColor" /></button>
            <button onClick={toggleRepeat} className={cn("hidden md:block relative active:scale-90 transition-all", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
              {repeatMode !== "off" && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF0055]" />}
            </button>
          </div>

          <div className="hidden md:flex w-full items-center gap-4 text-[11px] font-bold text-zinc-500 mt-2">
            <span className="w-10 text-right">{formatTime(progress)}</span>
            <div className="relative flex-1 flex items-center group">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={progress}
                onChange={handleSeek}
                style={{ "--range-progress": `${progressPercent}%` } as any}
                className="player-slider w-full z-20"
              />
            </div>
            <span className="w-10 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end gap-6 w-[25%]">
          <div className="flex items-center gap-3 group">
            <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            <input 
              type="range" 
              min={0} max={1} step={0.01} 
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if(audioRef.current) audioRef.current.volume = v;
              }}
              style={{ "--range-progress": `${volumePercent}%` } as any}
              className="player-slider w-24 opacity-80 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <button onClick={toggleFullScreen} className="text-zinc-400 hover:text-white active:scale-90 transition-all"><Maximize2 size={18} /></button>
        </div>

      </div>
    </div>
  );
}