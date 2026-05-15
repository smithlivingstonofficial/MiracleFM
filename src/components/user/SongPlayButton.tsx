"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/usePlayerStore";
import { isPlayableTrack, type Track } from "@/types/music";

type SongPlayButtonProps = {
  track: Track;
  queue?: Track[];
  className?: string;
  label?: string;
};

export default function SongPlayButton({ track, queue, className, label = "Play" }: SongPlayButtonProps) {
  const { currentTrack, isPlaying, setIsPlaying, setQueue, setTrack } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;
  const isPlayable = isPlayableTrack(track);

  const handleClick = () => {
    if (!isPlayable) return;

    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (queue?.length) {
      const startIndex = Math.max(0, queue.findIndex((item) => item.id === track.id));
      setQueue(queue, startIndex);
      return;
    }

    setTrack(track);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isPlayable}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#FF0055] px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_24px_rgba(255,0,85,0.35)] transition-all hover:bg-[#ff1a66] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      <span>{isCurrent && isPlaying ? "Pause" : label}</span>
    </button>
  );
}
