// src/components/player/PlayerProgressBar.tsx

"use client";

import { useState } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function PlayerProgressBar({ onSeek }: { onSeek: (time: number) => void }) {
  const progress = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  // Local state to handle smooth dragging without fighting the actual ticking clock.
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const displayProgress = dragProgress ?? progress;
  const progressPercent = Math.min((displayProgress / (duration || 1)) * 100, 100);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragProgress(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    onSeek(dragProgress ?? progress);
    setDragProgress(null);
  };

  return (
    <>
      {/* Mini Progress Bar for Mobile Layout */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-[#FF0055] to-white transition-all duration-100 ease-linear shadow-[0_0_12px_#FF0055]" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      {/* Main Desktop Progress Slider */}
      <div className="hidden md:flex w-full max-w-[720px] items-center gap-3 text-[11px] font-black text-zinc-500 mt-1.5">
        <span className="w-10 text-right tabular-nums tracking-wider">{formatTime(displayProgress)}</span>
        
        <div className="relative flex-1 flex items-center group h-5 cursor-pointer">
          <div className="absolute w-full h-[5px] bg-white/10 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
            <div 
              className="h-full bg-gradient-to-r from-[#FF0055] to-white group-hover:to-[#FF7BAA] transition-colors duration-200 shadow-[0_0_16px_rgba(255,0,85,0.6)]" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <div 
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_18px_rgba(255,255,255,0.55)] opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" 
            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }} 
          />
          <input 
            type="range" 
            min={0} 
            max={duration || 100} 
            step={0.1} 
            value={displayProgress} 
            onChange={handleSeekChange} 
            onMouseDown={() => setDragProgress(progress)}
            onTouchStart={() => setDragProgress(progress)}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
          />
        </div>
        
        <span className="w-10 text-left tabular-nums tracking-wider">{formatTime(duration)}</span>
      </div>
    </>
  );
}
