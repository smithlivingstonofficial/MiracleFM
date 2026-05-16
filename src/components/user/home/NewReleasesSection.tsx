import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Disc3, Sparkles } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { Album, Track } from "@/types/music";

interface NewReleasesSectionProps {
  albums: Album[];
  albumTracks: Record<string, Track[]>;
  personalized?: boolean;
}

export default function NewReleasesSection({ albums, albumTracks, personalized = false }: NewReleasesSectionProps) {
  if (albums.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-[#FF0055]">
            <Sparkles size={11} /> {personalized ? "Matched Albums" : "Trending Albums"}
          </div>
          <h2 className="truncate text-2xl font-black tracking-tighter text-white md:text-3xl">Albums</h2>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-500">
            {personalized ? "Ordered from your listening taste and favorite voices." : "Fresh and popular albums to start with."}
          </p>
        </div>
        <Link 
          href="/album" 
          className="flex shrink-0 items-center gap-1 rounded-full border border-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-[#FF0055] md:px-4"
        >
          View All <ChevronRight size={14} />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
        {albums.slice(0, 12).map((album) => {
          const tracks = album.id ? albumTracks[album.id] || [] : [];
          return (
          <article key={album.id} className="group min-w-0 transition-transform duration-300 active:scale-95 md:active:scale-100">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-xl transition-all duration-500 md:group-hover:-translate-y-1 md:group-hover:border-[#FF0055]/30 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)]">
              <Link href={`/album/${album.id}`} className="absolute inset-0 z-0">
              {album.cover_url ? (
                <Image 
                  src={album.cover_url} 
                  alt={album.title} 
                  fill 
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 180px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600">
                  <Disc3 size={40} />
                </div>
              )}
              </Link>

              <div className="absolute inset-0 hidden bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 md:block md:group-hover:opacity-100" />
              <div className="absolute inset-0 hidden translate-y-4 items-center justify-center opacity-0 transition-all duration-500 md:flex md:group-hover:translate-y-0 md:group-hover:opacity-100">
                <CollectionPlayButton tracks={tracks} size="default" />
              </div>
              <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {tracks.length > 0 ? `${tracks.length} Songs` : "Album"}
                </span>
              </div>
            </div>
            
            <div className="px-1 pt-2 md:pt-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/album/${album.id}`} className="block truncate text-sm font-bold text-white transition-colors md:text-base md:group-hover:text-[#FF0055]">
                    {album.title}
                  </Link>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-zinc-500 md:text-xs">{album.artists?.name}</p>
                </div>
                <div className="mt-0.5 shrink-0 md:hidden">
                  <CollectionPlayButton tracks={tracks} size="sm" />
                </div>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
