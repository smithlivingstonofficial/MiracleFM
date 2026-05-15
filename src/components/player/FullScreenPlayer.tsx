// src/components/player/FullScreenPlayer.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePlayerStore } from "@/store/usePlayerStore";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, 
  Shuffle, Repeat, Repeat1, PlusCircle, ListMusic, Music2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import LikeButton from "../user/LikeButton";
import { toast } from "sonner";
import type { Playlist } from "@/types/music";

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
  const [myPlaylists, setMyPlaylists] = useState<Pick<Playlist, "id" | "title">[]>([]);
  
  const[localProgress, setLocalProgress] = useState(0);
  const[isDragging, setIsDragging] = useState(false);

  // --- HARDWARE BACK BUTTON LOGIC ---
  useEffect(() => {
    if (isFullScreen) {
      window.history.pushState({ playerOpen: true }, '');

      const handlePopState = () => {
        if (usePlayerStore.getState().isFullScreen) {
          usePlayerStore.getState().toggleFullScreen();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isFullScreen]);

  const handleClose = () => {
    if (window.history.state?.playerOpen) {
      window.history.back();
    } else {
      toggleFullScreen();
    }
  };

  // --- PROGRESS BAR LOGIC ---
  useEffect(() => {
    if (!isDragging) setLocalProgress(currentTime);
  }, [currentTime, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    seekTo(localProgress);
    setIsDragging(false);
  };

  // --- PLAYLIST LOGIC ---
  const fetchMyPlaylists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.message("Sign in to add this song to a playlist.");
    
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
      track_id: currentTrack?.id
    });
    
    if (error?.code === '23505') toast.error("Already in this playlist");
    else if (!error) toast.success("Added to playlist");
    
    setShowPlaylistMenu(false);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!isFullScreen || !currentTrack) return null;

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;
  const progressPercent = Math.min((localProgress / (duration || 1)) * 100, 100);

  return (
    // FIX 1: Ensure wrapper uses 100dvh for exact mobile browser height
    <div className="fixed inset-0 h-[100dvh] z-[100] flex flex-col bg-black animate-in slide-in-from-bottom-[100%] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-white overflow-hidden select-none">
      
      {/* --- AMBIENT GLASSMORPHISM BACKGROUND --- */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none transition-opacity duration-1000">
        {displayImage ? (
          <>
            <Image 
              src={displayImage} 
              alt="" 
              fill 
              className="object-cover opacity-60 blur-[80px] scale-[1.2] saturate-[1.5]" 
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/68 to-[#050505]/98" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,0,85,0.16),transparent_42%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
        )}
      </div>

      {/* --- HEADER --- */}
      {/* FIX 2: Reduced top padding on mobile (pt-6 instead of pt-10) to save space */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 md:px-8 md:pt-10 md:pb-4 shrink-0 relative z-10">
        <button onClick={handleClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/70 hover:text-white transition-colors active:scale-90 border border-white/5">
          <ChevronDown size={28} />
        </button>
        
        <div className="text-center flex min-w-0 flex-col items-center px-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 flex items-center gap-2">
             <span className={cn("w-1.5 h-1.5 rounded-full bg-[#FF0055]", isPlaying && "animate-pulse")} /> 
             {currentTrack.albums?.title ? "Playing from Album" : "Playing Single"}
          </p>
          <p className="text-sm font-bold text-white mt-1 truncate max-w-[220px] drop-shadow-md">
            {currentTrack.albums?.title || currentTrack.artists?.name || "Miracle FM"}
          </p>
        </div>
        
        <div className="w-11" aria-hidden="true" />
      </div>

      {/* --- MAIN CONTENT LAYOUT --- */}
      {/* FIX 3: Added min-h-0 to let flexbox safely crush the inner content if needed */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-between px-5 md:px-12 w-full max-w-md md:max-w-5xl mx-auto h-full pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-12 relative z-10">
        
        {/* --- ARTWORK CONTAINER --- */}
        <div className="flex-1 w-full min-h-0 flex items-center justify-center shrink py-2 md:py-4">
          <div 
            className={cn(
              "relative aspect-square w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden transition-all duration-700 ease-out border border-white/10 bg-white/5",
              isPlaying ? "scale-100 shadow-[0_26px_70px_-16px_rgba(0,0,0,0.9)]" : "scale-[0.9] opacity-85 filter grayscale-[15%]"
            )}
            style={{ 
              maxHeight: 'min(42vh, 400px)', 
              maxWidth: 'min(82vw, 400px)' 
            }}
          >
            {displayImage ? (
              <Image src={displayImage} alt={currentTrack.title} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full bg-zinc-800/50 backdrop-blur-md flex items-center justify-center border border-white/5">
                 <Music2 size={80} className="text-zinc-600" />
              </div>
            )}
          </div>
        </div>

        {/* --- CONTROLS & METADATA BOTTOM SECTION --- */}
        {/* FIX 5: shrink-0 prevents this entire block from compressing. It will force the artwork above to shrink instead! */}
        <div className="w-full flex flex-col space-y-4 md:space-y-8 mt-auto shrink-0 pt-3">
          
          <div className="flex items-center justify-between rounded-[1.6rem] border border-white/10 bg-black/20 p-3 backdrop-blur-xl md:bg-transparent md:border-0 md:p-0">
            <div className="min-w-0 pr-4 flex-1">
              <h2 className="text-[1.45rem] md:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white line-clamp-2 drop-shadow-lg">
                {currentTrack.title}
              </h2>
              <p className="text-[15px] md:text-xl text-white/70 font-medium truncate mt-0.5">
                {currentTrack.artists?.name || "Unknown Artist"}
              </p>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 active:scale-90 transition-transform">
                <LikeButton trackId={currentTrack.id} />
              </div>
              <div className="relative">
                <button onClick={fetchMyPlaylists} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/70 hover:text-white transition-colors active:scale-90" aria-label="Add to playlist">
                  <PlusCircle size={24} />
                </button>
                {/* Playlist Dropdown */}
                {showPlaylistMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
                    <div className="absolute right-0 bottom-full mb-4 w-64 bg-[#121212]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 p-2 animate-in fade-in zoom-in-95 origin-bottom-right">
                      <div className="px-4 py-3 border-b border-white/10 mb-1">
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Save to Playlist</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto no-scrollbar p-1">
                        {myPlaylists.length === 0 ? (
                          <p className="text-xs text-white/50 p-4 text-center">No playlists found</p>
                        ) : (
                          myPlaylists.map(pl => (
                            <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors">
                              <ListMusic size={16} className="text-[#FF0055]" /> <span className="truncate">{pl.title}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="group w-full space-y-2 cursor-pointer pt-1 md:pt-2">
            <div className="relative h-2 md:h-2 flex items-center w-full">
              <div className="absolute w-full h-full bg-white/20 rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-200", isDragging ? "bg-[#FF0055]" : "bg-white group-hover:bg-[#FF0055]")} style={{ width: `${progressPercent}%` }} />
              </div>
              <div className={cn("absolute w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 pointer-events-none transition-all duration-200", isDragging || "opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100")} style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }} />
              <input type="range" min={0} max={duration || 100} step={0.1} value={localProgress} onChange={handleSeekChange} onMouseDown={() => setIsDragging(true)} onTouchStart={() => setIsDragging(true)} onMouseUp={handleSeekCommit} onTouchEnd={handleSeekCommit} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 touch-none" />
            </div>
            <div className="flex justify-between text-[11px] md:text-xs font-bold font-mono text-white/55 tracking-wider">
              <span>{formatTime(localProgress)}</span>
              <span>-{formatTime((duration || 0) - localProgress)}</span>
            </div>
          </div>

          {/* FIX 6: Adjusted playback button sizes so they fit nicer on mobile without wrapping/clipping */}
          <div className="flex items-center justify-between w-full pt-1 pb-1 md:pb-0">
            <button onClick={toggleShuffle} className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-white/5 md:bg-transparent active:scale-90 transition-transform", isShuffled ? "text-[#FF0055]" : "text-white/50 hover:text-white")}><Shuffle size={22} /></button>
            
            <div className="flex items-center gap-4 md:gap-10">
              <button onClick={playPrevious} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white hover:text-[#FF0055] active:scale-90 transition-all"><SkipBack size={30} fill="currentColor" /></button>
              
              <div className="relative group/play">
                {isPlaying && <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-20 animate-pulse" />}
                <button onClick={() => setIsPlaying(!isPlaying)} className="relative z-10 w-[4.35rem] h-[4.35rem] md:w-20 md:h-20 bg-white text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>
              </div>

              <button onClick={playNext} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white hover:text-[#FF0055] active:scale-90 transition-all"><SkipForward size={30} fill="currentColor" /></button>
            </div>
            
            <button onClick={toggleRepeat} className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-white/5 md:bg-transparent relative active:scale-90 transition-transform", repeatMode !== "off" ? "text-[#FF0055]" : "text-white/50 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={22} /> : <Repeat size={22} />}
              {repeatMode !== 'off' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF0055] rounded-full" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
