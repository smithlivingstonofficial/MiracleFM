// src/components/player/AudioPlayer.tsx

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

const getAbsoluteUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
};

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
  
  const [volume, setVolume] = useState(1);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const[myPlaylists, setMyPlaylists] = useState<any[]>([]);

  const progress = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  // --- AUDIO ENGINE LOGIC (With Duration Fix & Cleanup) ---
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;
    
    // Reset times ONLY when the actual track changes, not when pausing
    setCurrentTime(0);
    setDuration(0);

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
      });
      
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // FIX 1: Use getState() to check playing status without adding it to dependencies
        if (usePlayerStore.getState().isPlaying) {
          audio.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        if (data.details && data.details.totalduration) {
          setDuration(data.details.totalduration);
        }
      });
      
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;
      // FIX 1: Use getState()
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(() => setIsPlaying(false));
      }
    }

    return () => {
      if (hls) hls.destroy();
    };
  // FIX 2: Removed `isPlaying` from this array!
  },[currentTrack, setCurrentTime, setDuration]);

  // --- PLAY/PAUSE SYNC ---
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // --- SERVICE WORKER ---
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.error(err));
      });
    }
  },[]);

  // --- MEDIA SESSION & OS PROGRESS SYNC ---
  const updatePositionState = useCallback(() => {
    if ('mediaSession' in navigator && audioRef.current) {
      const { duration, playbackRate, currentTime } = audioRef.current;
      if (isFinite(duration) && duration > 0 && isFinite(currentTime)) {
        try {
          navigator.mediaSession.setPositionState({ duration, playbackRate, position: currentTime });
        } catch (error) {}
      }
    }
  },[]);

  const displayImage = currentTrack?.cover_url || currentTrack?.albums?.cover_url || currentTrack?.artists?.image_url || "/miraclefm.jpg";

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists?.name || "Unknown Artist",
        album: currentTrack.albums?.title || "Miracle FM",
        artwork:[
          { src: getAbsoluteUrl(displayImage), sizes: '96x96', type: 'image/jpeg' },
          { src: getAbsoluteUrl(displayImage), sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
          updatePositionState();
        }
      });

      return () => {
        ['play','pause','previoustrack','nexttrack','seekto'].forEach(action => 
          navigator.mediaSession.setActionHandler(action as any, null)
        );
      };
    }
  },[currentTrack, displayImage, playNext, playPrevious, setIsPlaying, setCurrentTime, updatePositionState]);

  // --- DOM EVENT HANDLERS ---
  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleDurationChange = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const newDuration = e.currentTarget.duration;
    // Fallback: If HLS didn't set duration, standard HTML5 Audio will set it here once fully parsed
    if (newDuration && isFinite(newDuration)) {
      setDuration(newDuration);
      updatePositionState();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      updatePositionState();
    }
  };

  const handleNativePlay = () => { setIsPlaying(true); updatePositionState(); };
  const handleNativePause = () => { setIsPlaying(false); updatePositionState(); };

  // --- FORMATTING FIX ---
  const formatTime = (time: number) => {
    // FIX: Catch Infinity or NaN before formatting so UI doesn't break
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!currentTrack) return null;

  const progressPercent = Math.min((progress / (duration || 1)) * 100, 100);
  const volumePercent = volume * 100;

  return (
    <div className={cn(
      "fixed left-0 right-0 z-40 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
      "bottom-[90px] left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-[64px] bg-[#121212]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] px-2 overflow-hidden",
      "md:bottom-0 md:left-0 md:translate-x-0 md:w-full md:max-w-none md:h-[96px] md:bg-[#050505]/95 md:border-t md:border-x-0 md:border-b-0 md:rounded-none md:px-6 md:overflow-visible"
    )}>
      
      <audio 
        ref={audioRef} 
        hidden 
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate} 
        onDurationChange={handleDurationChange} 
        onEnded={playNext}
        onPlay={handleNativePlay}
        onPause={handleNativePause}
      />
      
      {/* Mini Progress Bar for Mobile Layout */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <div className="h-full bg-[#FF0055] transition-all duration-100 ease-linear shadow-[0_0_10px_#FF0055]" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4 relative z-10">
        
        {/* Left Section */}
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
        </div>

        {/* Center Section & New Progress Bar */}
        <div className="flex items-center justify-end md:justify-center md:flex-col flex-none md:flex-1 max-w-[45%] pr-2 md:pr-0">
          <div className="flex items-center gap-3 md:gap-6">
            <button onClick={toggleShuffle} className={cn("hidden md:block active:scale-90 transition-all", isShuffled ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}><Shuffle size={18} /></button>
            <button onClick={playPrevious} className="hidden md:block text-zinc-400 hover:text-white active:scale-90 transition-all"><SkipBack size={24} fill="currentColor" /></button>
            
            <div className="relative group/play flex items-center justify-center">
              {isPlaying && <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-md opacity-40 animate-pulse" />}
              <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="relative z-10 w-11 h-11 md:w-12 md:h-12 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-xl">
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
              </button>
            </div>

            <button onClick={playNext} className="text-zinc-400 hover:text-white active:scale-90 transition-all"><SkipForward className="w-7 h-7 md:w-[24px] md:h-[24px]" fill="currentColor" /></button>
            <button onClick={toggleRepeat} className={cn("hidden md:block relative active:scale-90 transition-all", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          {/* ⚡ THE NEW UPGRADED PROGRESS BAR SLIDER ⚡ */}
          <div className="hidden md:flex w-full items-center gap-3 text-[11px] font-bold text-zinc-400 mt-2">
            
            {/* Current Time */}
            <span className="w-10 text-right tabular-nums tracking-wider">{formatTime(progress)}</span>
            
            <div className="relative flex-1 flex items-center group h-4 cursor-pointer">
              {/* Custom Track Background */}
              <div className="absolute w-full h-[4px] bg-white/10 rounded-full overflow-hidden">
                {/* Custom Fill */}
                <div 
                  className="h-full bg-white group-hover:bg-[#FF0055] transition-colors duration-200" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              
              {/* Custom Thumb */}
              <div 
                className="absolute w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                style={{ 
                  left: `${progressPercent}%`, 
                  transform: 'translateX(-50%)' 
                }} 
              />
              
              {/* Invisible HTML Range Input (Handles Dragging & Clicking) */}
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.1}
                value={progress} 
                onChange={handleSeek} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
              />
            </div>
            
            {/* Total Duration */}
            <span className="w-10 text-left tabular-nums tracking-wider">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="hidden md:flex items-center justify-end gap-6 w-[25%]">
          <div className="flex items-center gap-3 group">
            <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if(audioRef.current) audioRef.current.volume = v; }} className="w-24 opacity-80 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

      </div>
    </div>
  );
}