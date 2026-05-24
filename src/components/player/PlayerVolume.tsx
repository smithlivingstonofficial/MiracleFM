"use client";

import { useEffect, useRef, useState } from "react";
import { Volume1, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";

export default function PlayerVolume({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(1);
  const toggleFullScreen = usePlayerStore(state => state.toggleFullScreen);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [audioRef, isMuted, volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0) previousVolumeRef.current = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    if (isMuted || volume === 0) {
      const restoredVolume = previousVolumeRef.current || 1;
      setVolume(restoredVolume);
      setIsMuted(false);
      return;
    }

    previousVolumeRef.current = volume;
    setIsMuted(true);
  };

  const effectiveVolume = isMuted ? 0 : volume;
  const volumePercent = Math.round(effectiveVolume * 100);
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : effectiveVolume < 0.55 ? Volume1 : Volume2;

  return (
    <div className="hidden md:flex items-center justify-end gap-5 w-[25%]">
      <div className="flex items-center gap-3 group rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">
        <button
          type="button"
          onClick={toggleMute}
          className="grid h-6 w-6 place-items-center text-zinc-400 transition-colors hover:text-white"
          aria-label={effectiveVolume === 0 ? "Unmute audio" : "Mute audio"}
        >
          <VolumeIcon size={18} />
        </button>
        <div className="relative h-6 w-28 flex items-center">
          <div className="absolute left-0 right-0 h-[5px] overflow-hidden rounded-full bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF0055] to-white shadow-[0_0_14px_rgba(255,0,85,0.55)]"
              style={{ width: `${volumePercent}%` }}
            />
          </div>
          <div
            className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-white opacity-0 shadow-[0_0_16px_rgba(255,255,255,0.5)] transition-opacity group-hover:opacity-100"
            style={{ left: `${volumePercent}%` }}
          />
        <input 
          type="range" 
          min={0} max={1} step={0.01} 
            value={effectiveVolume} 
          onChange={handleVolumeChange} 
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Volume"
        />
        </div>
      </div>
      <button onClick={toggleFullScreen} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all">
        <Maximize2 size={18} />
      </button>
    </div>
  );
}
