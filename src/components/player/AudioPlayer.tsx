"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Maximize2, Repeat1 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    playNext, 
    playPrevious, 
    toggleShuffle, 
    toggleRepeat, 
    isShuffled, 
    repeatMode 
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // --- Audio Engine Logic ---
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    // Reset progress when track changes
    setProgress(0);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if(isPlaying) audio.play().catch(() => setIsPlaying(false));
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;
      if(isPlaying) audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]); // Only re-run if track ID changes

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

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-50 flex flex-col justify-center h-[90px] md:h-[100px] transition-all duration-300">
      <audio 
        ref={audioRef} 
        hidden 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={playNext} // Auto-play next song when current finishes
      />
      
      <div className="flex items-center justify-between max-w-[1600px] mx-auto w-full">
        
        {/* 1. Track Info */}
        <div className="flex items-center gap-4 w-[30%]">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 shadow-lg group">
            {displayImage && <Image src={displayImage} alt="" fill className="object-cover animate-in fade-in" />}
            {/* Expand arrow could go here */}
          </div>
          <div className="hidden md:block overflow-hidden">
            <p className="text-sm font-bold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</p>
            <p className="text-xs text-zinc-400 truncate hover:text-white cursor-pointer">{currentTrack.artists?.name}</p>
          </div>
        </div>

        {/* 2. Controls & Progress */}
        <div className="flex flex-col items-center w-[40%]">
          <div className="flex items-center gap-6 mb-2">
            
            {/* Shuffle */}
            <button 
              onClick={toggleShuffle}
              className={cn("transition-colors", isShuffled ? "text-[#FF0055]" : "text-zinc-400 hover:text-white")}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            {/* Previous */}
            <button 
              onClick={playPrevious}
              className="text-zinc-300 hover:text-white transition hover:scale-110 active:scale-95"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            
            {/* Play/Pause */}
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
            </button>
            
            {/* Next */}
            <button 
              onClick={playNext}
              className="text-zinc-300 hover:text-white transition hover:scale-110 active:scale-95"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
            
            {/* Repeat */}
            <button 
              onClick={toggleRepeat}
              className={cn("transition-colors relative", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-400 hover:text-white")}
              title="Repeat"
            >
              {repeatMode === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
              {repeatMode !== "off" && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF0055]" />}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3 text-xs font-mono text-zinc-400">
            <span className="w-8 text-right">{formatTime(progress)}</span>
            <div className="relative flex-1 group">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-1 bg-transparent appearance-none cursor-pointer z-20"
              />
              <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FF0055] group-hover:bg-[#FF0055] transition-all" 
                  style={{ width: `${(progress / (duration || 1)) * 100}%` }} 
                />
              </div>
            </div>
            <span className="w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 3. Volume */}
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