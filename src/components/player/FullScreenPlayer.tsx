"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePlayerStore } from "@/store/usePlayerStore";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, MoreHorizontal, Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, PlusCircle, ListMusic 
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
    // Get time state and actions from the store
    currentTime,
    duration,
    seekTo
  } = usePlayerStore();

  const supabase = createClient();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);
  
  // Local state for smooth slider dragging
  const [localProgress, setLocalProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sync local progress with the global store, but only when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(currentTime);
    }
  }, [currentTime, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Update local state immediately for smooth UI feedback
    setLocalProgress(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    // When the user lets go, tell the global player to jump
    seekTo(localProgress);
    setIsDragging(false);
  };

  if (!isFullScreen || !currentTrack) return null;

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;
  const progressPercent = (localProgress / (duration || 1)) * 100;

  // --- Playlist Logic ---
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 animate-in slide-in-from-bottom-[100%] duration-500 text-white overflow-hidden backdrop-blur-3xl">
      
      {/* 1. Dynamic Background */}
      <div className="absolute inset-0 -z-10">
        {displayImage && (
          <Image 
            src={displayImage} 
            alt="" 
            fill 
            className="object-cover opacity-40 blur-[100px] scale-125" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-zinc-950" />
      </div>

      {/* 2. Header */}
      <div className="flex items-center justify-between px-6 py-12 md:py-8 shrink-0">
        <button 
          onClick={toggleFullScreen} 
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:scale-110"
        >
          <ChevronDown size={28} />
        </button>
        
        <div className="text-center opacity-90">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]">Now Playing</p>
          <p className="text-xs font-bold text-white/80 mt-1 truncate max-w-[200px]">
            {currentTrack.albums?.title || "Single Release"}
          </p>
        </div>
        
        <button className="p-2 text-white/60 hover:text-white transition-colors">
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* 3. Main Content Layout */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-20 lg:px-0 w-full max-w-5xl mx-auto lg:grid lg:grid-cols-2 lg:gap-20">
        
        {/* Artwork */}
        <div className="relative w-full aspect-square max-h-[350px] lg:max-h-[500px] lg:max-w-[500px] mb-8 lg:mb-0 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] rounded-[2.5rem] overflow-hidden border border-white/10 group">
          {displayImage && (
            <Image 
              src={displayImage} 
              alt={currentTrack.title} 
              fill 
              className={cn(
                "object-cover transition-transform duration-700",
                isPlaying ? "scale-100" : "scale-105" // Breathing effect
              )}
            />
          )}
        </div>

        {/* Controls & Metadata */}
        <div className="w-full flex flex-col justify-center space-y-8 lg:space-y-10">
          
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight truncate">
                {currentTrack.title}
              </h2>
              <p className="text-lg md:text-xl text-zinc-400 font-medium truncate mt-1">
                {currentTrack.artists?.name}
              </p>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
              <div className="scale-125">
                <LikeButton trackId={currentTrack.id} />
              </div>
              
              <div className="relative">
                <button 
                  onClick={fetchMyPlaylists}
                  className="p-2 text-zinc-400 hover:text-white transition-colors hover:bg-white/10 rounded-full"
                >
                  <PlusCircle size={28} />
                </button>
                {showPlaylistMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
                    <div className="absolute right-0 bottom-full mb-4 w-64 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 origin-bottom-right">
                      <div className="px-4 py-3 border-b border-white/5 mb-1"><span className="text-[10px] font-black text-zinc-500 uppercase">Add to Playlist</span></div>
                      <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                        {myPlaylists.map(pl => (
                          <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5 rounded-xl flex items-center gap-3">
                            <ListMusic size={16} className="text-[#FF0055]" /> <span className="truncate">{pl.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="group w-full space-y-2">
            <div className="relative h-2 bg-white/10 rounded-full cursor-pointer group">
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
              <div className="absolute top-0 left-0 h-full bg-[#FF0055] rounded-full group-hover:bg-[#ff3377]" style={{ width: `${progressPercent}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs font-bold font-mono text-zinc-500">
              <span>{formatTime(localProgress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-center md:gap-12 pb-8 lg:pb-0">
            <button onClick={toggleShuffle} className={cn("p-2", isShuffled ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}><Shuffle size={24} /></button>
            <div className="flex items-center gap-6 md:gap-10">
              <button onClick={playPrevious} className="text-white hover:text-[#FF0055] active:scale-90"><SkipBack size={40} fill="currentColor" /></button>
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95">
                {isPlaying ? <Pause size={36} fill="black" /> : <Play size={36} fill="black" className="ml-1" />}
              </button>
              <button onClick={playNext} className="text-white hover:text-[#FF0055] active:scale-90"><SkipForward size={40} fill="currentColor" /></button>
            </div>
            <button onClick={toggleRepeat} className={cn("p-2 relative", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={24} /> : <Repeat size={24} />}
              {repeatMode !== 'off' && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF0055]" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}