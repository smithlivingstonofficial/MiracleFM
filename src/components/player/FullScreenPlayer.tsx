// src/components/player/FullScreenPlayer.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { usePlayerStore } from "@/store/usePlayerStore";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, MoreHorizontal, Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, PlusCircle, ListMusic, Disc 
} from "lucide-react";
import { cn } from "@/lib/utils";
import LikeButton from "../user/LikeButton";
import { toast } from "sonner";

export default function FullScreenPlayer() {
  const { 
    isFullScreen, 
    toggleFullScreen,
    currentTrack,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    currentTime,
    duration,
    seekTo
  } = usePlayerStore();

  const supabase = createClient();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  
  const [localProgress, setLocalProgress] = useState(0);
  const[isDragging, setIsDragging] = useState(false);

  // --- HARDWARE BACK BUTTON LOGIC ---
  useEffect(() => {
    if (isFullScreen) {
      // Push a fake state to the history when the player opens
      window.history.pushState({ playerOpen: true }, '');

      const handlePopState = () => {
        // If the user presses the hardware back button, the state pops.
        // We catch it and close the full screen player.
        if (usePlayerStore.getState().isFullScreen) {
          usePlayerStore.getState().toggleFullScreen();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isFullScreen]);

  // Custom close handler for the Chevron button
  const handleClose = () => {
    // If the modal state is still in history, pop it (which triggers the listener to close it)
    if (window.history.state?.playerOpen) {
      window.history.back();
    } else {
      // Fallback if history state is missing
      toggleFullScreen();
    }
  };

  // --- PROGRESS BAR LOGIC ---
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(currentTime);
    }
  },[currentTime, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    seekTo(localProgress);
    setIsDragging(false);
  };

  if (!isFullScreen || !currentTrack) return null;

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;
  const progressPercent = (localProgress / (duration || 1)) * 100;

  // --- PLAYLIST LOGIC ---
  const fetchMyPlaylists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login to save to playlist");
    
    const { data } = await supabase
      .from("playlists")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data) setMyPlaylists(data);
    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: currentTrack.id
    });
    
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#050505] animate-in slide-in-from-bottom-[100%] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-white overflow-hidden select-none">
      
      {/* --- 1. CINEMATIC AMBIENT BACKGROUND --- */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {displayImage && (
          <Image 
            src={displayImage} 
            alt="" 
            fill 
            className="object-cover opacity-50 blur-[100px] scale-150 saturate-150" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#050505]/80 to-[#050505]" />
      </div>

      {/* --- 2. HEADER --- */}
      <div className="flex items-center justify-between px-6 pt-12 pb-6 md:py-8 shrink-0">
        <button 
          onClick={handleClose} 
          className="p-3 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full text-zinc-300 hover:text-white transition-all active:scale-90"
        >
          <ChevronDown size={24} />
        </button>
        
        <div className="text-center flex flex-col items-center">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF0055] flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-pulse" /> Playing from Album
          </p>
          <p className="text-xs font-bold text-white/90 mt-1 truncate max-w-[200px]">
            {currentTrack.albums?.title || "Single Release"}
          </p>
        </div>
        
        <button className="p-3 text-zinc-400 hover:text-white transition-colors active:scale-90">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* --- 3. MAIN CONTENT LAYOUT --- */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-20 lg:px-0 w-full max-w-5xl mx-auto lg:grid lg:grid-cols-2 lg:gap-24 h-full pb-10">
        
        {/* --- ARTWORK CONTAINER --- */}
        <div className="relative w-full aspect-square max-h-[360px] max-w-[360px] lg:max-h-[500px] lg:max-w-[500px] mb-8 lg:mb-0 shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-[2.5rem] overflow-hidden border border-white/10 group mx-auto">
          {displayImage ? (
            <Image 
              src={displayImage} 
              alt={currentTrack.title} 
              fill 
              className={cn(
                "object-cover transition-transform duration-1000 ease-out",
                isPlaying ? "scale-100" : "scale-105 opacity-80 filter grayscale-[20%]"
              )}
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
               <Disc size={80} className="text-zinc-800" />
            </div>
          )}
        </div>

        {/* --- CONTROLS & METADATA --- */}
        <div className="w-full max-w-[420px] mx-auto lg:max-w-none flex flex-col justify-center space-y-8 lg:space-y-10">
          
          {/* Track Info & Actions */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter leading-tight truncate text-white drop-shadow-md">
                {currentTrack.title}
              </h2>
              <p className="text-base md:text-xl text-[#FF0055] font-bold truncate mt-1 tracking-tight">
                {currentTrack.artists?.name}
              </p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <div className="scale-125 bg-white/5 p-2 rounded-full border border-white/5 active:scale-90 transition-transform">
                <LikeButton trackId={currentTrack.id} />
              </div>
              
              <div className="relative">
                <button 
                  onClick={fetchMyPlaylists}
                  className="p-2.5 bg-white/5 border border-white/5 text-zinc-300 hover:text-white transition-colors active:scale-90 rounded-full"
                >
                  <PlusCircle size={22} />
                </button>

                {/* Playlist Dropdown */}
                {showPlaylistMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
                    <div className="absolute right-0 bottom-full mb-4 w-64 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 origin-bottom-right">
                      <div className="px-4 py-3 border-b border-white/5 mb-1"><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Save to Playlist</span></div>
                      <div className="max-h-56 overflow-y-auto no-scrollbar p-1">
                        {myPlaylists.map(pl => (
                          <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-3 text-sm font-bold text-zinc-200 hover:bg-[#FF0055] hover:text-white rounded-xl flex items-center gap-3 transition-colors">
                            <ListMusic size={16} /> <span className="truncate">{pl.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* --- SEEK BAR --- */}
          <div className="group w-full space-y-3">
            <div className="relative h-2 md:h-2.5 bg-zinc-800 rounded-full cursor-pointer overflow-visible">
              
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={localProgress}
                onChange={handleSeekChange}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              
              {/* Active Track Progress */}
              <div 
                className={cn("absolute top-0 left-0 h-full rounded-full transition-all duration-150 ease-out", isDragging ? "bg-[#ff3377]" : "bg-white group-hover:bg-[#FF0055]")} 
                style={{ width: `${progressPercent}%` }} 
              />
              
              {/* Scrub Handle (Appears on hover or drag) */}
              <div 
                className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-200", isDragging || "opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100")} 
                style={{ left: `calc(${progressPercent}% - 8px)` }} 
              />
            </div>
            
            <div className="flex justify-between text-[11px] md:text-xs font-bold font-mono text-zinc-400">
              <span>{formatTime(localProgress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* --- MAIN PLAYBACK CONTROLS --- */}
          <div className="flex items-center justify-between md:justify-center md:gap-14 pt-2 pb-8 lg:pb-0">
            <button onClick={toggleShuffle} className={cn("p-2 active:scale-90 transition-transform", isShuffled ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}><Shuffle size={22} /></button>
            
            <div className="flex items-center gap-6 md:gap-10">
              <button onClick={playPrevious} className="text-white hover:text-[#FF0055] active:scale-90 transition-transform"><SkipBack size={36} fill="currentColor" /></button>
              
              {/* Large Play Button */}
              <div className="relative group/play">
                {isPlaying && <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-xl opacity-50 animate-pulse" />}
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="relative z-10 w-20 h-20 md:w-24 md:h-24 bg-[#FF0055] rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-[0_0_30px_rgba(255,0,85,0.4)]"
                >
                  {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
                </button>
              </div>

              <button onClick={playNext} className="text-white hover:text-[#FF0055] active:scale-90 transition-transform"><SkipForward size={36} fill="currentColor" /></button>
            </div>
            
            <button onClick={toggleRepeat} className={cn("p-2 relative active:scale-90 transition-transform", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
              {repeatMode !== 'off' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF0055] rounded-full" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}