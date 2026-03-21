// src/components/player/PlayerProgressBar.tsx

"use client";

import { useState, useEffect } from "react";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function PlayerProgressBar({ onSeek }: { onSeek: (time: number) => void }) {
  const progress = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  // Local state to handle smooth dragging without fighting the actual ticking clock
  const[localProgress, setLocalProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sync with global progress ONLY when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalProgress(progress);
    }
  }, [progress, isDragging]);

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const displayProgress = isDragging ? localProgress : progress;
  const progressPercent = Math.min((displayProgress / (duration || 1)) * 100, 100);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    onSeek(localProgress);
    setIsDragging(false);
  };

  return (
    <>
      {/* Mini Progress Bar for Mobile Layout */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <div 
          className="h-full bg-[#FF0055] transition-all duration-100 ease-linear shadow-[0_0_10px_#FF0055]" 
          style={{ width: `${progressPercent}%` }} 
        />
      </div>

      {/* Main Desktop Progress Slider */}
      <div className="hidden md:flex w-full items-center gap-3 text-[11px] font-bold text-zinc-400 mt-2">
        <span className="w-10 text-right tabular-nums tracking-wider">{formatTime(displayProgress)}</span>
        
        <div className="relative flex-1 flex items-center group h-4 cursor-pointer">
          <div className="absolute w-full h-[4px] bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white group-hover:bg-[#FF0055] transition-colors duration-200" 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <div 
            className="absolute w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" 
            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }} 
          />
          <input 
            type="range" 
            min={0} 
            max={duration || 100} 
            step={0.1} 
            value={displayProgress} 
            onChange={handleSeekChange} 
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
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