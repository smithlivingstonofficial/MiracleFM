"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import LikeButton from "@/components/user/LikeButton";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Track } from "@/types/music";

type HomeTrackCardProps = {
  track: Track;
  index: number;
  tracks: Track[];
};

export default function HomeTrackCard({ track, index, tracks }: HomeTrackCardProps) {
  const { currentTrack, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const isCurrent = currentTrack?.id === track.id;
  const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url || "/miraclefm-192.png";

  const handlePlay = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }
    setQueue(tracks, index);
  };

  return (
    <article
      className={cn(
        "group grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)_92px] items-center gap-3 rounded-2xl border border-white/[0.04] bg-[#0A0A0A]/90 p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors md:grid-cols-[56px_minmax(0,1fr)_104px] md:p-2.5",
        isCurrent ? "border-[#FF0055]/25 bg-white/[0.08]" : "hover:bg-white/[0.04]"
      )}
    >
      <button
        type="button"
        onClick={handlePlay}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-900 text-white shadow-sm transition-transform active:scale-95 md:h-14 md:w-14"
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <Image src={displayImage} alt="" fill className="object-cover" sizes="56px" />
        <span className={cn("absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity", isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </span>
      </button>

      <div className="min-w-0">
        <Link
          href={`/song/${track.id}`}
          className={cn(
            "block max-w-full truncate text-sm font-black leading-5 transition-colors md:text-base",
            isCurrent ? "text-[#FF0055]" : "text-white hover:text-[#FF0055]"
          )}
        >
          {track.title}
        </Link>
        <p className="mt-0.5 max-w-full truncate text-xs font-medium text-zinc-400 md:text-sm">{track.artists?.name || "Miracle FM"}</p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={handlePlay}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95",
            isCurrent && isPlaying ? "bg-white text-black" : "bg-[#FF0055] text-black shadow-[0_0_20px_rgba(255,0,85,0.25)] hover:bg-[#ff1a66]"
          )}
          aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.03]">
          <LikeButton trackId={track.id} />
        </div>
      </div>
    </article>
  );
}
