"use client";

import { useState } from "react";
import { Volume2, Maximize2 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function PlayerVolume({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const[volume, setVolume] = useState(1);
  const toggleFullScreen = usePlayerStore(state => state.toggleFullScreen);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  return (
    <div className="hidden md:flex items-center justify-end gap-6 w-[25%]">
      <div className="flex items-center gap-3 group">
        <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
        <input 
          type="range" 
          min={0} max={1} step={0.01} 
          value={volume} 
          onChange={handleVolumeChange} 
          className="w-24 opacity-80 group-hover:opacity-100 transition-opacity" 
        />
      </div>
      <button onClick={toggleFullScreen} className="text-zinc-400 hover:text-white active:scale-90 transition-all">
        <Maximize2 size={18} />
      </button>
    </div>
  );
}