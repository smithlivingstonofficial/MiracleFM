"use client";

import Image from "next/image";
import { Play, Pause, Heart, MoreHorizontal } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/lib/utils";
import LikeButton from "./LikeButton";

interface TrackRowProps {
  track: any;
  index: number;
  context?: string;
  allTracks?: any[];
}

// Add 'allTracks' to the destructured props here
export default function TrackRow({ track, index, context, allTracks }: TrackRowProps) {
  const { currentTrack, isPlaying, setTrack, setIsPlaying } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;

  const handlePlay = () => {
    if (isCurrent) {
        setIsPlaying(!isPlaying);
    } else {
        // If we have the full list, set the queue starting from this index
        if (allTracks && allTracks.length > 0) {
        usePlayerStore.getState().setQueue(allTracks, index);
        } else {
        // Fallback for single track
        setTrack(track);
        }
    }
  };

  // Helper to format seconds to MM:SS
  const formatTime = (seconds: number) => {
    if (!seconds) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Fallback image logic
  const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url;

  return (
    <div 
      onDoubleClick={handlePlay}
      className={cn(
        "group flex items-center gap-4 p-3 rounded-xl transition-colors cursor-default select-none",
        isCurrent ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      {/* 1. Index / Play Icon */}
      <div className="w-8 flex justify-center text-zinc-500 font-mono text-sm">
        <span className={cn("group-hover:hidden", isCurrent && "hidden text-[#FF0055]")}>
          {index + 1}
        </span>
        <button 
          onClick={handlePlay}
          className={cn(
            "hidden group-hover:block transition-all", 
            isCurrent && "block text-[#FF0055]"
          )}
        >
          {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        {isCurrent && !isPlaying && <div className="group-hover:hidden w-3 h-3 bg-[#FF0055] rounded-full animate-pulse" />}
      </div>

      {/* 2. Track Info */}
      <div className="flex-1 flex items-center gap-4 min-w-0">
        {/* Only show image if we are NOT in an album context (redundant in albums) */}
        {context !== "Album" && (
          <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-zinc-800">
            {displayImage && <Image src={displayImage} alt={track.title} fill className="object-cover" />}
          </div>
        )}
        
        <div className="min-w-0">
          <p className={cn("font-bold truncate text-sm", isCurrent ? "text-[#FF0055]" : "text-white")}>
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate group-hover:text-white transition-colors">
            {track.artists?.name || "Unknown Artist"}
          </p>
        </div>
      </div>

      {/* 3. Album Name (Hidden on Mobile) */}
      <div className="hidden md:block w-1/3 text-sm text-zinc-500 truncate group-hover:text-zinc-300">
        {track.albums?.title || "Single"}
      </div>

      {/* 4. Actions & Duration */}
      <div className="flex items-center gap-4 text-zinc-500 text-sm">
        <LikeButton trackId={track.id} />
        <span className="font-mono text-xs w-10 text-right">{formatTime(track.duration || 180)}</span>
        <button className="opacity-0 group-hover:opacity-100 hover:text-white transition-all">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}