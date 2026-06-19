import Image from "next/image";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { Track } from "@/types/music";

type ContinueListeningSectionProps = {
  tracks: Track[];
  title?: string;
  description?: string;
};

const imageFor = (track: Track) =>
  track.cover_url || track.albums?.cover_url || track.artists?.image_url || "/miraclefm-192.png";

export default function ContinueListeningSection({
  tracks,
  title = "Continue Listening",
  description = "Recent worship songs from your listening history.",
}: ContinueListeningSectionProps) {
  if (tracks.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black leading-tight tracking-tight text-white md:text-3xl">{title}</h2>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-500">{description}</p>
        </div>
        <Link href="/library/history" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">
          History
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tracks.slice(0, 8).map((track) => (
          <article
            key={track.id}
            className="group grid min-w-0 grid-cols-[56px_minmax(0,1fr)_38px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-2 transition-colors hover:border-[#FF0055]/30 hover:bg-white/[0.065]"
          >
            <Link href={`/song/${track.id}`} className="relative h-14 w-14 overflow-hidden rounded-md bg-zinc-900">
              <Image src={imageFor(track)} alt="" fill className="object-cover" sizes="56px" />
            </Link>
            <div className="min-w-0">
              <Link href={`/song/${track.id}`} className="block truncate text-sm font-black text-white group-hover:text-[#FF4D89]">
                {track.title}
              </Link>
              <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{track.artists?.name || "Miracle FM"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                <Clock3 size={11} className="text-[#FF0055]" /> Recent
              </p>
            </div>
            <CollectionPlayButton tracks={tracks} size="sm" />
          </article>
        ))}
      </div>
    </section>
  );
}
