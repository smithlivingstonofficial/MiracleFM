"use client";

import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Repeat1 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/lib/utils";

export default function PlayerControls() {
  const { 
    isPlaying, setIsPlaying, playNext, playPrevious, 
    toggleShuffle, toggleRepeat, isShuffled, repeatMode 
  } = usePlayerStore();

  return (
    <div className="flex items-center gap-2.5 md:gap-6">
      <button onClick={toggleShuffle} className={cn("hidden md:block active:scale-90 transition-all", isShuffled ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
        <Shuffle size={18} />
      </button>
      
      <button onClick={playPrevious} className="hidden md:block text-zinc-400 hover:text-white active:scale-90 transition-all">
        <SkipBack size={24} fill="currentColor" />
      </button>
      
      <div className="relative group/play flex items-center justify-center">
        {isPlaying && <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-md opacity-40 animate-pulse" />}
        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="relative z-10 w-12 h-12 md:w-12 md:h-12 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-xl">
          {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
        </button>
      </div>

      <button onClick={playNext} className="flex h-11 w-9 items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all md:h-auto md:w-auto">
        <SkipForward className="w-7 h-7 md:w-[24px] md:h-[24px]" fill="currentColor" />
      </button>
      
      <button onClick={toggleRepeat} className={cn("hidden md:block relative active:scale-90 transition-all", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-500 hover:text-white")}>
        {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
      </button>
    </div>
  );
}
