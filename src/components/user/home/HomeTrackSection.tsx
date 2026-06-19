import { ChevronRight } from "lucide-react";
import Link from "next/link";
import HomeTrackCard from "@/components/user/home/HomeTrackCard";
import type { Track } from "@/types/music";

type HomeTrackSectionProps = {
  title: string;
  description?: string;
  tracks: Track[];
  viewAllHref?: string;
  context: string;
};

export default function HomeTrackSection({ title, description, tracks, viewAllHref }: HomeTrackSectionProps) {
  if (tracks.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black leading-tight tracking-tight text-white md:text-3xl">{title}</h2>
          {description && <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-500">{description}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#FF0055] md:px-4"
          >
            View <ChevronRight size={14} />
          </Link>
        )}
      </div>

      <div className="grid min-w-0 gap-2 md:gap-3 lg:grid-cols-2">
        {tracks.slice(0, 8).map((track, index) => (
          <HomeTrackCard key={track.id} track={track} index={index} tracks={tracks} />
        ))}
      </div>
    </section>
  );
}
