import Link from "next/link";
import Image from "next/image";
import { Mic2 } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { Artist, Track } from "@/types/music";

interface PopularArtistsSectionProps {
  artists: Artist[];
  artistTracks: Record<string, Track[]>;
  personalized?: boolean;
  title?: string;
  description?: string;
  maxItems?: number;
}

export default function PopularArtistsSection({
  artists,
  artistTracks,
  title = "Artists",
  maxItems = 12,
}: PopularArtistsSectionProps) {
  if (artists.length === 0) return null;

  return (
    <section className="px-4 pb-12 md:px-8 md:pb-16">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
        </div>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar md:-mx-8 md:px-8">
        {artists.slice(0, maxItems).map((a, index) => {
          const tracks = a.id ? artistTracks[a.id] || [] : [];
          return (
          <article
            key={a.id} 
            className="group relative w-[148px] min-w-[148px] overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]/80 p-3 transition-all duration-300 active:scale-95 md:w-[164px] md:min-w-[164px] md:hover:-translate-y-1 md:hover:border-[#FF0055]/30 md:hover:bg-white/[0.04]"
          >
            <div className="absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
              #{index + 1}
            </div>

            <Link href={`/artist/${a.id}`} className="block">
              <div className="relative mx-auto mb-3 mt-5 h-28 w-28 rounded-full p-[3px] md:h-32 md:w-32 md:p-1">
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] shadow-[0_0_22px_rgba(255,0,85,0.28)] transition-all duration-500 md:group-hover:shadow-[0_0_34px_rgba(255,0,85,0.48)]" />
                <div className="absolute -right-1 bottom-4 h-9 w-9 rounded-full bg-[#FF0055] shadow-[0_0_26px_rgba(255,0,85,0.42)]" />

                <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-[4px] border-[#050505] bg-zinc-900">
                  {a.image_url ? (
                    <Image
                      src={a.image_url}
                      alt={a.name}
                      fill
                      className="object-cover transition-transform duration-700 md:group-hover:scale-105"
                      sizes="128px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                      <Mic2 size={34} />
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 text-center">
                <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-white transition-colors md:group-hover:text-[#FF0055]">{a.name}</p>
                <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                  {tracks.length > 0 ? `${tracks.length} Songs` : "Artist"}
                </p>
              </div>
            </Link>

            <div className="absolute right-3 top-[100px] z-20 rounded-full bg-[#FF0055] p-0.5 text-white shadow-[0_0_20px_rgba(255,0,85,0.35)] opacity-100 md:top-[116px] md:opacity-0 md:transition-opacity md:group-hover:opacity-100" title={`Play ${a.name}`}>
              <CollectionPlayButton tracks={tracks} size="sm" />
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
