import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Clock, Play, ListMusic } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";

export const revalidate = 60;

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Playlist Info
  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", id)
    .single();

  if (!playlist) return notFound();

  // 2. Fetch Linked Tracks
  const { data: playlistItems } = await supabase
    .from("playlist_tracks")
    .select("track_id, tracks(*, artists(name), albums(title, cover_url))")
    .eq("playlist_id", id)
    .order("added_at", { ascending: true });

  // Extract tracks from the junction object
  const tracks = playlistItems?.map(item => item.tracks) || [];

  return (
    <div className="bg-gradient-to-b from-indigo-900/40 to-black min-h-screen pb-24">
      
      {/* Header */}
      <div className="p-6 md:p-10 flex flex-col md:flex-row items-end gap-8 pt-20">
        <div className="relative w-52 h-52 md:w-64 md:h-64 shrink-0 shadow-2xl shadow-black/50 rounded-lg overflow-hidden">
          {playlist.cover_url ? (
            <Image src={playlist.cover_url} alt={playlist.title} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <ListMusic size={64} className="text-zinc-600" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80 hidden md:block">Public Playlist</span>
          <h1 className="text-4xl md:text-7xl font-black text-white tracking-tight leading-none">
            {playlist.title}
          </h1>
          <p className="text-white/60 font-medium text-sm md:text-base max-w-2xl">{playlist.description}</p>
          
          <div className="flex items-center gap-2 text-sm font-bold text-white/90 mt-2">
            <span className="text-[#FF0055]">Miracle FM</span>
            <span className="w-1 h-1 bg-white/50 rounded-full mx-1" />
            <span>{tracks.length} songs</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 md:px-10 py-6 flex items-center gap-8 bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <button className="w-14 h-14 bg-[#FF0055] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-[#FF0055]/20">
          <Play fill="black" size={24} className="ml-1" />
        </button>
      </div>

      {/* Track List */}
      <div className="px-6 md:px-10 mt-4">
        <div className="flex items-center gap-4 p-3 border-b border-white/10 text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 sticky top-20 bg-black z-10">
          <div className="w-8 text-center">#</div>
          <div className="flex-1">Title</div>
          <div className="hidden md:block w-1/3">Album</div>
          <div className="w-10 text-right"><Clock size={14} /></div>
        </div>

        <div className="space-y-1">
          {tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context="Playlist" allTracks={tracks}/>
          ))}
        </div>
      </div>
    </div>
  );
}