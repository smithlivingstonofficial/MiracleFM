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
    <div className="flex items-center gap-2 md:gap-3">
      <button onClick={toggleShuffle} className={cn("hidden md:grid h-8 w-8 place-items-center rounded-full border border-transparent active:scale-90 transition-all", isShuffled ? "text-[#FF0055] bg-[#FF0055]/10 border-[#FF0055]/20" : "text-zinc-500 hover:text-white hover:bg-white/[0.055] hover:border-white/10")}>
        <Shuffle size={14} />
      </button>
      
      <button onClick={playPrevious} className="hidden md:grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.055] active:scale-90 transition-all">
        <SkipBack size={18} fill="currentColor" />
      </button>
      
      <div className="relative group/play flex items-center justify-center">
        {isPlaying && <div className="absolute inset-[-5px] bg-[#FF0055] rounded-full blur-xl opacity-45 animate-pulse" />}
        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="relative z-10 w-10 h-10 md:w-11 md:h-11 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-[0_10px_25px_-10px_rgba(255,255,255,0.75)] ring-1 ring-white/60">
          {isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
        </button>
      </div>

      <button onClick={playNext} className="flex h-11 w-9 items-center justify-center rounded-full text-zinc-400 hover:text-white active:scale-90 transition-all md:h-8 md:w-8 md:hover:bg-white/[0.055]">
        <SkipForward className="w-7 h-7 md:w-[18px] md:h-[18px]" fill="currentColor" />
      </button>
      
      <button onClick={toggleRepeat} className={cn("hidden md:grid h-8 w-8 place-items-center rounded-full border border-transparent relative active:scale-90 transition-all", repeatMode !== "off" ? "text-[#FF0055] bg-[#FF0055]/10 border-[#FF0055]/20" : "text-[#8E8E93] hover:text-white hover:bg-white/[0.055] hover:border-white/10")}>
        {repeatMode === "one" ? <Repeat1 size={14} /> : <Repeat size={14} />}
      </button>
    </div>
  );
}
