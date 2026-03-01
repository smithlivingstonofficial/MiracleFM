// src/components/user/CollectionPlayButton.tsx

"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tracks: any[];
  size?: "default" | "large";
}

export default function CollectionPlayButton({ tracks, size = "large" }: Props) {
  const { setQueue, isPlaying, setIsPlaying, currentTrack } = usePlayerStore();

  // Check if we are currently playing this specific collection (by checking the first song)
  const isPlayingThisCollection = currentTrack?.id === tracks[0]?.id && isPlaying;

  const handlePlay = () => {
    if (tracks.length === 0) return;

    if (isPlayingThisCollection) {
      setIsPlaying(false);
    } else {
      // Sends the ENTIRE list to the player queue starting at index 0
      setQueue(tracks, 0); 
    }
  };

  return (
    <button 
      onClick={handlePlay}
      className={cn(
        "flex items-center justify-center rounded-full bg-[#FF0055] text-black hover:bg-[#E6004D] hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,85,0.4)] active:scale-95",
        size === "large" ? "w-14 h-14 md:w-16 md:h-16" : "w-12 h-12"
      )}
    >
      {isPlayingThisCollection ? (
        <Pause fill="black" size={size === "large" ? 28 : 24} />
      ) : (
        <Play fill="black" size={size === "large" ? 28 : 24} className="ml-1" />
      )}
    </button>
  );
}