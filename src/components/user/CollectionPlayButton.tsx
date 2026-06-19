// src/components/user/CollectionPlayButton.tsx

"use client";

import { usePlayerStore } from "@/store/usePlayerStore";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPlayableTrack, type Track } from "@/types/music";

interface Props {
  tracks: Track[];
  size?: "sm" | "default" | "large";
}

export default function CollectionPlayButton({ tracks, size = "large" }: Props) {
  const { setQueue, isPlaying, setIsPlaying, queue } = usePlayerStore();

  const playableTracks = tracks.filter(isPlayableTrack);
  const trackIds = playableTracks.map((track) => track.id).join("|");
  const queueIds = queue.map((track) => track.id).join("|");
  const hasPlayableTracks = playableTracks.length > 0;
  const isCurrentCollection = trackIds.length > 0 && trackIds === queueIds;
  const isPlayingThisCollection = isCurrentCollection && isPlaying;

  const handlePlay = () => {
    if (!hasPlayableTracks) return;

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
      disabled={!hasPlayableTracks}
      aria-label={isPlayingThisCollection ? "Pause collection" : "Play collection"}
      className={cn(
        "flex items-center justify-center rounded-full bg-[#FF0055] text-white hover:bg-[#E6004D] hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,0,85,0.4)] active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100",
        size === "large" ? "w-14 h-14 md:w-16 md:h-16" : size === "sm" ? "w-10 h-10" : "w-12 h-12"
      )}
    >
      {isPlayingThisCollection ? (
        <Pause fill="currentColor" size={size === "large" ? 28 : size === "sm" ? 20 : 24} />
      ) : (
        <Play fill="currentColor" size={size === "large" ? 28 : size === "sm" ? 20 : 24} className="ml-1" />
      )}
    </button>
  );
}
