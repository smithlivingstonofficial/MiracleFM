import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Clock, Calendar, Disc, Play } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";

// Force dynamic rendering so we always get fresh data (or use revalidate)
export const revalidate = 60;

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Album Details & Tracks
  const { data: album } = await supabase
    .from("albums")
    .select("*, artists(name, image_url)")
    .eq("id", id)
    .single();

  if (!album) return notFound();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, artists(name), albums(title, cover_url)")
    .eq("album_id", id)
    .order("created_at", { ascending: true }); // Usually track_number, but created_at for now

  return (
    <div className="bg-gradient-to-b from-zinc-800/50 to-black min-h-screen pb-24">
      
      {/* 1. Header Section */}
      <div className="p-6 md:p-10 flex flex-col md:flex-row items-end gap-8 pt-20">
        {/* Cover Art */}
        <div className="relative w-52 h-52 md:w-64 md:h-64 shrink-0 shadow-2xl shadow-black/50 rounded-lg overflow-hidden group">
          {album.cover_url ? (
            <Image src={album.cover_url} alt={album.title} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <Disc size={64} className="text-zinc-600" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80 hidden md:block">Album Release</span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none">
            {album.title}
          </h1>
          
          <div className="flex items-center gap-2 text-sm md:text-base font-bold text-white/90">
            {/* Artist Avatar (Small) */}
            <div className="w-6 h-6 rounded-full overflow-hidden relative bg-zinc-800">
              {album.artists?.image_url && <Image src={album.artists.image_url} alt="" fill className="object-cover" />}
            </div>
            <span className="hover:underline cursor-pointer">{album.artists?.name}</span>
            <span className="w-1 h-1 bg-white/50 rounded-full mx-1" />
            <span className="text-white/70">{new Date(album.created_at).getFullYear()}</span>
            <span className="w-1 h-1 bg-white/50 rounded-full mx-1" />
            <span className="text-white/70">{tracks?.length || 0} songs</span>
          </div>
        </div>
      </div>

      {/* 2. Actions Bar */}
      <div className="px-6 md:px-10 py-6 flex items-center gap-8 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <button className="w-14 h-14 bg-[#FF0055] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-[#FF0055]/20">
          <Play fill="black" size={24} className="ml-1" />
        </button>
        {/* You can add Heart/Download buttons here later */}
      </div>

      {/* 3. Track List */}
      <div className="px-6 md:px-10 mt-4">
        {/* Table Header */}
        <div className="flex items-center gap-4 p-3 border-b border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 sticky top-20 bg-black z-10">
          <div className="w-8 text-center">#</div>
          <div className="flex-1">Title</div>
          <div className="hidden md:block w-1/3">Album</div> {/* Usually hidden in album view but good for consistency */}
          <div className="w-10 text-right"><Clock size={14} /></div>
        </div>

        <div className="space-y-1">
          {tracks?.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context="Album" />
          ))}
        </div>
        
        <div className="mt-12 p-8 text-xs text-zinc-500 font-medium border-t border-white/5">
          <p>© {new Date().getFullYear()} {album.artists?.name}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}