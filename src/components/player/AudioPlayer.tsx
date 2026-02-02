"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Maximize2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  // Player State
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls();
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;
    }
    
    // Auto play when track changes
    if(isPlaying) audio.play().catch(() => setIsPlaying(false));

  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = time;
    setProgress(time);
  };

  const formatTime = (time: number) => {
    if(isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!currentTrack) return null;

  // Fallback image
  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-50 flex flex-col justify-center h-[90px] md:h-[100px]">
      <audio 
        ref={audioRef} 
        hidden 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={() => setIsPlaying(false)}
      />
      
      <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full">
        
        {/* 1. Track Info */}
        <div className="flex items-center gap-4 w-[30%]">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
            {displayImage && <Image src={displayImage} alt="" fill className="object-cover animate-in fade-in" />}
          </div>
          <div className="hidden md:block overflow-hidden">
            <p className="text-sm font-bold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate hover:text-white cursor-pointer">{currentTrack.artists?.name}</p>
          </div>
        </div>

        {/* 2. Controls & Progress */}
        <div className="flex flex-col items-center w-[40%]">
          <div className="flex items-center gap-6 mb-2">
            <button className="text-zinc-400 hover:text-white transition"><Shuffle size={16} /></button>
            <button className="text-zinc-300 hover:text-white transition"><SkipBack size={24} fill="currentColor" /></button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
            </button>
            
            <button className="text-zinc-300 hover:text-white transition"><SkipForward size={24} fill="currentColor" /></button>
            <button className="text-zinc-400 hover:text-white transition"><Repeat size={16} /></button>
          </div>

          <div className="w-full flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span>{formatTime(progress)}</span>
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#FF0055] hover:h-1.5 transition-all"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 3. Volume & Extras */}
        <div className="flex items-center justify-end gap-4 w-[30%]">
          <Volume2 size={20} className="text-zinc-400" />
          <input 
            type="range" 
            min={0} max={1} step={0.01} 
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if(audioRef.current) audioRef.current.volume = v;
            }}
            className="w-24 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
          <button className="text-zinc-400 hover:text-white"><Maximize2 size={18} /></button>
        </div>

      </div>
    </div>
  );
}