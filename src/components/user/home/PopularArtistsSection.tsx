import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Mic2, Sparkles, TrendingUp } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { Artist, Track } from "@/types/music";

interface PopularArtistsSectionProps {
  artists: Artist[];
  artistTracks: Record<string, Track[]>;
  personalized?: boolean;
}

export default function PopularArtistsSection({ artists, artistTracks, personalized = false }: PopularArtistsSectionProps) {
  if (artists.length === 0) return null;

  return (
    <section className="px-4 pb-12 md:px-8 md:pb-16">
      <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#FF0055]">
            {personalized ? <Sparkles size={11} /> : <TrendingUp size={11} />} {personalized ? "Voices For You" : "Trending Voices"}
          </div>
          <h2 className="text-2xl font-black tracking-tighter text-white md:text-4xl">
            Artists
          </h2>
          <p className="mt-1 max-w-lg text-sm font-medium text-zinc-500">
            {personalized ? "Ordered from artists, genres, and songs close to your worship taste." : "Worship leaders listeners are returning to most."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
        {artists.slice(0, 12).map((a, index) => {
          const tracks = a.id ? artistTracks[a.id] || [] : [];
          return (
          <article
            key={a.id} 
            className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A]/80 p-3 shadow-[0_18px_45px_rgba(0,0,0,0.24)] transition-all duration-500 active:scale-95 md:p-4 md:hover:-translate-y-1 md:hover:border-[#FF0055]/30 md:hover:bg-white/[0.04]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#FF0055]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute left-3 top-3 z-20 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-300 backdrop-blur-md">
              #{index + 1}
            </div>

            <Link href={`/artist/${a.id}`} className="block">
              <div className="relative mx-auto mb-3 mt-4 h-24 w-24 rounded-full p-[3px] md:h-32 md:w-32 md:p-1">
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] shadow-[0_0_22px_rgba(255,0,85,0.28)] transition-all duration-500 md:group-hover:shadow-[0_0_34px_rgba(255,0,85,0.48)]" />

                <div className="relative z-10 h-full w-full overflow-hidden rounded-full border-[4px] border-[#050505] bg-zinc-900">
                  {a.image_url ? (
                    <Image 
                      src={a.image_url} 
                      alt={a.name} 
                      fill 
                      className="object-cover transition-transform duration-700 md:group-hover:scale-110"
                      sizes="(max-width: 768px) 96px, 128px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-500">
                      <Mic2 size={34} />
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 text-center">
                <p className="truncate text-sm font-black text-white transition-colors md:text-base md:group-hover:text-[#FF0055]">{a.name}</p>
                <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
                  {tracks.length > 0 ? `${tracks.length} Songs` : "Artist"}
                </p>
              </div>
            </Link>

            <div className="absolute left-1/2 top-[90px] z-20 translate-x-7 rounded-full bg-[#FF0055] p-0.5 text-black shadow-[0_0_20px_rgba(255,0,85,0.35)] md:top-[116px] md:translate-x-10" title={`Play ${a.name}`}>
              <CollectionPlayButton tracks={tracks} size="sm" />
            </div>
          </article>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center md:mt-12">
        <Link href="/artist" className="group relative inline-flex items-center justify-center active:scale-95 transition-transform duration-300">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#FF0055]/0 via-[#FF0055]/70 to-[#FF0055]/0 opacity-30 blur-lg transition-opacity duration-500 group-hover:opacity-70" />
          <div className="relative flex items-center gap-3 overflow-hidden rounded-full border border-[#FF0055]/30 bg-[#050505] px-7 py-3.5 shadow-2xl transition-all duration-300 group-hover:border-[#FF0055] md:px-10">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#FF0055]/10 to-transparent transition-transform duration-1000 ease-in-out group-hover:translate-x-full" />
            <span className="relative z-10 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#FF0055] group-hover:text-white transition-colors">
              Discover More Artists
            </span>
            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 transition-colors duration-300 group-hover:bg-[#FF0055]">
              <ArrowRight size={12} className="text-[#FF0055] group-hover:text-white md:group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
