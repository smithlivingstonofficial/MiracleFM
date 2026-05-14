"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Pause, MoreHorizontal, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";
import LikeButton from "./LikeButton";
import { toast } from "sonner";
import type { Playlist, Track } from "@/types/music";

interface TrackRowProps {
  track: Track;
  index: number;
  context?: string;
  allTracks?: Track[];
}

export default function TrackRow({ track, index, context, allTracks }: TrackRowProps) {
  const { currentTrack, isPlaying, setQueue, setIsPlaying, setTrack } = usePlayerStore();
  const [showMenu, setShowMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Pick<Playlist, "id" | "title">[]>([]);
  const supabase = createClient();
  
  const isCurrent = currentTrack?.id === track.id;

  // Smart Play Logic
  const handlePlay = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
    } else {
      if (allTracks && allTracks.length > 0) {
        setQueue(allTracks, index);
      } else {
        setTrack(track);
      }
    }
  };

  const fetchMyPlaylists = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playing when clicking menu
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login to add to playlist");
    
    const { data } = await supabase.from("playlists").select("id, title").eq("user_id", user.id);
    if (data) setMyPlaylists(data);
    setShowMenu(!showMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: track.id });
    if (error?.code === '23505') toast.error("Already in playlist");
    else if (!error) toast.success("Added to playlist");
    setShowMenu(false);
  };

  // Helper for Duration
  const formatTime = (seconds: number) => {
    if (!seconds) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url;

  return (
    <div 
      onClick={() => {
        // On Mobile (<768px), single click plays the song
        if (window.innerWidth < 768) handlePlay();
      }}
      onDoubleClick={handlePlay} // Desktop standard
      className={cn(
        "group relative flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-xl transition-colors select-none active:bg-white/10 cursor-pointer md:cursor-default",
        isCurrent ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      {/* 1. Index (Desktop Only) */}
      <div className="hidden md:flex w-8 justify-center text-zinc-500 font-mono text-sm">
        <button onClick={(e) => { e.stopPropagation(); handlePlay(); }} className={cn("hidden group-hover:block transition-all", isCurrent && "block text-[#FF0055]")}>
          {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <span className={cn("group-hover:hidden", isCurrent && "hidden")}>{index + 1}</span>
        {isCurrent && !isPlaying && <div className="group-hover:hidden w-3 h-3 bg-[#FF0055] rounded-full animate-pulse" />}
      </div>

      {/* 2. Track Info */}
      <div className="flex-1 flex items-center gap-3 md:gap-4 min-w-0">
        {context !== "Album" && (
          <div className="relative w-11 h-11 md:w-11 md:h-11 shrink-0 rounded-lg overflow-hidden bg-zinc-800 shadow-sm">
            {displayImage && <Image src={displayImage} alt="" fill className="object-cover" />}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("font-bold truncate text-sm md:text-base", isCurrent ? "text-[#FF0055]" : "text-white")}>
            {track.title}
          </p>
          <p className="text-xs md:text-sm text-zinc-400 truncate group-hover:text-zinc-300 transition-colors">
            {track.artists?.name}
          </p>
        </div>
      </div>

      {/* 3. Album (Desktop Only) */}
      <div className="hidden md:block w-1/3 text-sm text-zinc-500 truncate">
        {track.albums?.title}
      </div>

      {/* 4. Actions */}
      <div className="flex items-center gap-3 md:gap-5 pr-2">
        <div onClick={(e) => e.stopPropagation()}>
           <LikeButton trackId={track.id} />
        </div>
        
        <span className="hidden md:block font-mono text-xs w-10 text-right text-zinc-500">
          {formatTime(track.duration_seconds || track.duration || 180)}
        </span>
        
        <div className="relative">
          <button 
            onClick={fetchMyPlaylists}
            className="md:opacity-0 group-hover:opacity-100 p-2 -mr-2 text-zinc-400 hover:text-white transition-all"
            aria-label="Track options"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 origin-top-right">
                <p className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1">Add to Playlist</p>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  {myPlaylists.length > 0 ? myPlaylists.map(pl => (
                    <button 
                      key={pl.id} 
                      onClick={(e) => { e.stopPropagation(); addToPlaylist(pl.id); }} 
                      className="w-full text-left px-3 py-2.5 text-sm font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <ListMusic size={14} className="text-[#FF0055]" /> {pl.title}
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-xs text-zinc-600 text-center italic">No playlists created</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
