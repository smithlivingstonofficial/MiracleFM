import Link from "next/link";
import { Sparkles, ChevronRight, Play, Music4 } from "lucide-react";
import PlaylistCover from "@/components/user/PlaylistCover";
import type { Playlist } from "@/types/music";

interface EditorialSectionProps {
  playlists: Playlist[];
}

export default function EditorialSection({ playlists }: EditorialSectionProps) {
  return (
    <section className="px-4 md:px-8">
      <div className="flex justify-between items-end mb-5 md:mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
            Curated For You <Sparkles size={16} className="text-[#FF0055]" />
          </h2>
        </div>
        <Link href="/library" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 active:text-white md:hover:text-white transition-colors py-1">
          View All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        {playlists.map(p => (
          <Link key={p.id} href={`/playlist/${p.id}`} className="group flex flex-col gap-2 md:gap-3 active:scale-95 md:active:scale-100 transition-transform duration-300">
            <div className="aspect-square relative rounded-2xl md:rounded-[2rem] overflow-hidden bg-zinc-900 shadow-lg border border-white/5 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)] md:group-hover:border-[#FF0055]/30 md:group-hover:-translate-y-1.5 transition-all duration-500">
              
              <PlaylistCover playlistId={p.id} explicitCover={p.cover_url} className="w-full h-full md:transform md:transition-transform md:duration-700 md:group-hover:scale-110" />
              
              <div className="hidden md:block absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />
              
              <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                <div className="bg-[#FF0055] p-4 rounded-full text-white shadow-xl shadow-black/50 hover:scale-110 hover:bg-[#ff1a66] transition-all">
                  <Play fill="currentColor" className="w-6 h-6 ml-1" />
                </div>
              </div>
            </div>

            <div className="px-1">
              <p className="font-bold text-sm md:text-base text-zinc-100 truncate md:group-hover:text-[#FF0055] transition-colors">{p.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5 opacity-80 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                <Music4 size={10} className="text-[#FF0055] md:text-zinc-500" />
                <p className="text-[9px] md:text-[10px] text-zinc-400 md:text-zinc-500 font-bold uppercase tracking-widest">Playlist</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
