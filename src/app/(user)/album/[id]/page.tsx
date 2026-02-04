import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Clock, Disc, Share2, MoreHorizontal, Calendar, Music4 } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import StartRadio from "@/components/user/StartRadio";

export const revalidate = 60;

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Album Details & Tracks
  const { data: album } = await supabase
    .from("albums")
    .select("*, artists(id, name, image_url)")
    .eq("id", id)
    .single();

  if (!album) return notFound();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, artists(name), albums(title, cover_url)")
    .eq("album_id", id)
    .order("created_at", { ascending: true });

  const releaseYear = new Date(album.created_at).getFullYear();
  const trackCount = tracks?.length || 0;
  
  // Get genres from the first track (it's now an array)
  const genres = tracks?.[0]?.genre || [];

  return (
    <div className="min-h-screen pb-32 bg-black relative overflow-hidden">
      
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#FF0055]/5 to-transparent pointer-events-none" />

      <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* 1. The "Premium Card" Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-6 md:p-10 mt-16 md:mt-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-10">
            
            {/* Album Cover */}
            <div className="relative w-52 h-52 md:w-64 md:h-64 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden group border border-white/5">
              {album.cover_url ? (
                <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Disc size={64} className="text-zinc-700" />
                </div>
              )}
            </div>

            {/* Metadata Info */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                <Disc size={12} className="text-[#FF0055]" /> Album Release
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-xl">
                {album.title}
              </h1>
              
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 pt-2 justify-center md:justify-start">
                <Link href={`/artist/${album.artists?.id}`} className="group/artist flex items-center gap-3 bg-black/40 hover:bg-black/60 pr-4 pl-1 py-1 rounded-full border border-white/5 transition-colors">
                  <div className="w-8 h-8 rounded-full overflow-hidden relative bg-zinc-800 border border-white/10">
                    {album.artists?.image_url ? (
                      <Image src={album.artists.image_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music4 size={14} className="text-zinc-500"/></div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-white group-hover/artist:text-[#FF0055] transition-colors">{album.artists?.name}</span>
                </Link>

                <div className="hidden md:block w-[1px] h-8 bg-white/10" />

                <div className="flex items-center gap-6 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{releaseYear}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music4 size={14} />
                    <span>{trackCount} Songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Play Button & Actions */}
            <div className="flex flex-row md:flex-col items-center gap-4 shrink-0">
              <CollectionPlayButton tracks={tracks ?? []} size="large" />
              
              <div className="flex gap-2">
                <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5">
                  <Share2 size={18} />
                </button>
                {/* Launch Radio based on the album genres */}
                <StartRadio genres={genres} label={false} />
                <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* 2. Track List */}
        <div className="space-y-4 px-2">
          <div className="hidden md:flex items-center gap-4 px-4 pb-2 border-b border-white/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Title</div>
            <div className="w-10 text-right"><Clock size={14} /></div>
          </div>

          <div className="space-y-1">
            {tracks?.map((track, i) => (
              <TrackRow 
                key={track.id} 
                track={track} 
                index={i} 
                context="Album" 
                allTracks={tracks ?? []}
              />
            ))}
          </div>
          
          <div className="mt-16 p-8 text-center md:text-left text-xs text-zinc-600 font-bold border-t border-white/5 flex flex-col gap-2">
            <p>{new Date(album.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <p className="uppercase tracking-widest">© {releaseYear} {album.artists?.name}. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}