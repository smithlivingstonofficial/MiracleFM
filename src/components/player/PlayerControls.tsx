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
    <div className="flex items-center gap-2 md:gap-4">
      <button onClick={toggleShuffle} className={cn("hidden md:grid h-10 w-10 place-items-center rounded-full border border-transparent active:scale-90 transition-all", isShuffled ? "text-[#FF0055] bg-[#FF0055]/10 border-[#FF0055]/20" : "text-zinc-500 hover:text-white hover:bg-white/[0.055] hover:border-white/10")}>
        <Shuffle size={18} />
      </button>
      
      <button onClick={playPrevious} className="hidden md:grid h-10 w-10 place-items-center rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.055] active:scale-90 transition-all">
        <SkipBack size={23} fill="currentColor" />
      </button>
      
      <div className="relative group/play flex items-center justify-center">
        {isPlaying && <div className="absolute inset-[-7px] bg-[#FF0055] rounded-full blur-xl opacity-45 animate-pulse" />}
        <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="relative z-10 w-12 h-12 md:w-14 md:h-14 bg-white hover:bg-zinc-200 rounded-full flex items-center justify-center text-black active:scale-90 transition-transform shadow-[0_18px_42px_-18px_rgba(255,255,255,0.75)] ring-1 ring-white/60">
          {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
        </button>
      </div>

      <button onClick={playNext} className="flex h-11 w-9 items-center justify-center rounded-full text-zinc-400 hover:text-white active:scale-90 transition-all md:h-10 md:w-10 md:hover:bg-white/[0.055]">
        <SkipForward className="w-7 h-7 md:w-[23px] md:h-[23px]" fill="currentColor" />
      </button>
      
      <button onClick={toggleRepeat} className={cn("hidden md:grid h-10 w-10 place-items-center rounded-full border border-transparent relative active:scale-90 transition-all", repeatMode !== "off" ? "text-[#FF0055] bg-[#FF0055]/10 border-[#FF0055]/20" : "text-zinc-500 hover:text-white hover:bg-white/[0.055] hover:border-white/10")}>
        {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
      </button>
    </div>
  );
}
