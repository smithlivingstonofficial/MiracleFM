import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Play, CheckCircle2, MoreHorizontal, Shuffle } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";

export const revalidate = 60;

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Parallel Data Fetching
  const [artistRes, topTracksRes, albumsRes] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).single(),
    supabase.from("tracks").select("*, albums(title, cover_url), artists(name)").eq("artist_id", id).limit(5), // Simulate "Top 5"
    supabase.from("albums").select("*").eq("artist_id", id).order("created_at", { ascending: false })
  ]);

  const artist = artistRes.data;
  const topTracks = topTracksRes.data || [];
  const albums = albumsRes.data || [];

  if (!artist) return notFound();

  return (
    <div className="bg-black min-h-screen pb-24">
      
      {/* 1. Immersive Hero Header */}
      <div className="relative h-[40vh] md:h-[50vh] w-full overflow-hidden">
        {/* Background Blur Effect */}
        {artist.image_url ? (
          <Image 
            src={artist.image_url} 
            alt={artist.name} 
            fill 
            className="object-cover opacity-60 blur-3xl scale-110" 
            priority
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full flex items-end gap-8">
          {/* Profile Image (Circle) */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full shadow-2xl overflow-hidden border-4 border-black shrink-0">
            {artist.image_url ? (
              <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800" />
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-white/90">
              <CheckCircle2 size={18} className="text-[#FF0055] fill-current" />
              <span className="text-xs font-bold uppercase tracking-widest">Verified Artist</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none shadow-black drop-shadow-lg">
              {artist.name}
            </h1>
            <p className="text-zinc-300 font-medium mt-4 max-w-2xl line-clamp-2">
              {artist.bio || "No bio available."}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 mt-8 space-y-16">
        
        {/* 2. Action Buttons */}
        <div className="flex items-center gap-4">
          <button className="w-14 h-14 bg-[#FF0055] hover:bg-[#E6004D] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-[#FF0055]/20">
            <Play fill="black" size={24} className="ml-1" />
          </button>
          <button className="px-6 py-3 rounded-full border border-white/20 hover:border-white text-xs font-bold uppercase tracking-widest transition-colors">
            Follow
          </button>
          <button className="text-zinc-400 hover:text-white transition-colors">
            <MoreHorizontal size={32} />
          </button>
        </div>

        {/* 3. Popular Tracks */}
        {topTracks.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white mb-6 tracking-tight">Popular</h2>
            <div className="space-y-1">
              {topTracks.map((track, i) => (
                <TrackRow key={track.id} track={track} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* 4. Discography (Albums) */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-white mb-6 tracking-tight">Discography</h2>
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar">
              {albums.map((album) => (
                <Link 
                  key={album.id} 
                  href={`/album/${album.id}`} 
                  className="min-w-[180px] md:min-w-[220px] snap-start group cursor-pointer block"
                >
                  <div className="aspect-square relative rounded-2xl overflow-hidden bg-zinc-900 shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                    {album.cover_url && (
                      <Image src={album.cover_url} alt={album.title} fill className="object-cover" sizes="25vw" />
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                        <Play fill="white" className="text-white" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="font-bold text-white truncate text-base">{album.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Album</span>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <span className="text-xs text-zinc-500 font-mono">{new Date(album.created_at).getFullYear()}</span>
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