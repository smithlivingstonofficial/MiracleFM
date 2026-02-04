import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Play, CheckCircle2, MoreHorizontal, Shuffle, Music4, Calendar } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import StartRadio from "@/components/user/StartRadio";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";

export const revalidate = 60;

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Parallel Data Fetching
  const [artistRes, topTracksRes, albumsRes] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).single(),
    supabase.from("tracks").select("*, albums(title, cover_url), artists(name)").eq("artist_id", id).order('play_count', { ascending: false }).limit(10),
    supabase.from("albums").select("*").eq("artist_id", id).order("created_at", { ascending: false })
  ]);

  const artist = artistRes.data;
  const topTracks = topTracksRes.data || [];
  const albums = albumsRes.data || [];

  // Extract all unique genres from the top tracks for the Radio
  const genres = Array.from(new Set(topTracks.flatMap(t => t.genre || [])));

  if (!artist) return notFound();

  return (
    <div className="bg-black min-h-screen pb-32 relative overflow-hidden">
      
      {/* 1. Immersive Hero Header */}
      <div className="relative h-[45vh] md:h-[55vh] w-full overflow-hidden">
        {artist.image_url ? (
          <Image src={artist.image_url} alt={artist.name} fill className="object-cover opacity-60 blur-3xl scale-110" priority />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />

        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="relative w-32 h-32 md:w-56 md:h-56 rounded-full shadow-2xl overflow-hidden border-4 border-black shrink-0 animate-in zoom-in duration-700">
            {artist.image_url ? (
              <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500"><Music4 size={48} /></div>
            )}
          </div>

          <div className="text-center md:text-left mb-4">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3 text-white/90">
              <CheckCircle2 size={18} className="text-[#FF0055] fill-current" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Artist</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
              {artist.name}
            </h1>
            <p className="text-zinc-400 font-medium mt-6 max-w-2xl line-clamp-2 italic">
              {artist.bio || "Bringing heavenly sounds to your soul."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-12 mt-8 space-y-16 relative z-10">
        
        {/* 2. Action Buttons */}
        <div className="flex items-center justify-center md:justify-start gap-6">
          <CollectionPlayButton tracks={topTracks} size="large" />
          
          <StartRadio genres={genres} artistId={id} />

          <button className="px-8 py-3 rounded-full border border-white/10 hover:border-[#FF0055] hover:text-[#FF0055] text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md">
            Follow
          </button>
          <button className="text-zinc-500 hover:text-white transition-colors">
            <MoreHorizontal size={32} />
          </button>
        </div>

        {/* 3. Popular Tracks */}
        {topTracks.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h2 className="text-2xl font-black text-white mb-6 tracking-tight flex items-center gap-3">
              Popular <div className="h-[1px] flex-1 bg-white/5" />
            </h2>
            <div className="space-y-1">
              {topTracks.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} allTracks={topTracks} />
              ))}
            </div>
          </section>
        )}

        {/* 4. Discography (Albums) */}
        {albums.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <h2 className="text-2xl font-black text-white mb-8 tracking-tight">Discography</h2>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar">
              {albums.map((album) => (
                <Link key={album.id} href={`/album/${album.id}`} className="min-w-[200px] md:min-w-[240px] snap-start group block">
                  <div className="aspect-square relative rounded-[2rem] overflow-hidden bg-zinc-900 shadow-xl group-hover:-translate-y-2 transition-transform duration-500 border border-white/5 group-hover:border-[#FF0055]/30">
                    {album.cover_url && (
                      <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="25vw" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <Play fill="white" className="text-white" size={32} />
                    </div>
                  </div>
                  <div className="mt-5 px-2">
                    <h3 className="font-bold text-white truncate text-lg">{album.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-zinc-500">
                      <span className="text-xs font-bold uppercase tracking-widest">Album</span>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <span className="text-xs font-bold font-mono">{new Date(album.created_at).getFullYear()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}