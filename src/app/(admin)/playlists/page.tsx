"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, ListMusic, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import TextVerificationModal from "@/components/admin/TextVerificationModal";

type Playlist = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  playlist_tracks?: { count: number }[];
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchPlaylists = useCallback(async () => {
    const { data, error } = await supabase
      .from("playlists")
      .select("*, playlist_tracks(count)")
      .is("user_id", null) 
      .order("created_at", { ascending: false });
      
    if (error) {
      toast.error("Error loading playlists");
      console.error(error);
    }
    
    if (data) setPlaylists(data as Playlist[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchPlaylists();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchPlaylists]);

  const createPlaylist = async () => {
    const { data, error } = await supabase
      .from("playlists")
      .insert({ 
        title: "New Editorial Playlist", 
        description: "Curated collection",
        user_id: null 
      })
      .select()
      .single();
    
    if (error) {
      console.error(error);
      toast.error("Failed to create playlist");
      return;
    }

    if (data) {
      toast.success("Playlist created");
      router.push(`/playlists/${data.id}`); 
    }
  };

  const deletePlaylist = async () => {
    if (!playlistToDelete) return;

    const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistToDelete.id);

    if (error) {
        toast.error("Failed to delete");
    } else {
        toast.success("Playlist deleted");
        void fetchPlaylists();
    }

    setPlaylistToDelete(null);
  };

  return (
    <>
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Editorial Playlists</h1>
          <p className="text-zinc-500 mt-2 font-medium text-lg">
            Curate collections for "Sunday Worship", "Quiet Time", etc.
          </p>
        </div>
        <button 
          onClick={createPlaylist}
          className="bg-[#FF0055] hover:bg-[#E6004D] text-white h-14 px-8 rounded-full font-black text-sm shadow-lg shadow-[#FF0055]/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} /> Create New
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-brand" size={28} />
        </div>
      ) : playlists.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.05] bg-panel p-12 text-center">
          <ListMusic className="mx-auto mb-3 text-zinc-700" size={36} />
          <h2 className="text-lg font-bold text-white">No editorial playlists yet</h2>
          <p className="mt-2 text-sm text-zinc-500">Create a playlist to start curating the home experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {playlists.map((playlist) => (
          <div 
            key={playlist.id}
            onClick={() => router.push(`/playlists/${playlist.id}`)}
            className="group bg-zinc-900/50 border border-white/[0.05] hover:border-[#FF0055]/30 p-4 rounded-[2rem] transition-all hover:-translate-y-1 cursor-pointer"
          >
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-4 shadow-lg group-hover:shadow-[#FF0055]/10 transition-all">
              {playlist.cover_url ? (
                <Image src={playlist.cover_url} alt={playlist.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                  <ListMusic size={48} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Empty Cover</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">Edit List</span>
              </div>
            </div>
            
            <div className="px-2 pb-2 flex justify-between items-start">
              <div className="overflow-hidden">
                <h3 className="font-bold text-white text-lg truncate">{playlist.title}</h3>
                <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-wider">
                  {playlist.playlist_tracks?.[0]?.count || 0} Tracks
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPlaylistToDelete(playlist);
                }}
                className="p-2 text-zinc-600 hover:text-red-500 transition-colors bg-white/5 rounded-full hover:bg-white/10"
                title="Delete playlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          ))}
        </div>
      )}
      </div>

      <TextVerificationModal
        isOpen={Boolean(playlistToDelete)}
        onClose={() => setPlaylistToDelete(null)}
        onConfirm={deletePlaylist}
        title="Delete Playlist"
        description={`This permanently deletes "${playlistToDelete?.title || "this playlist"}" and removes its track ordering. Audio files and tracks remain in the library.`}
        confirmationText="DELETE"
      />
    </>
  );
}
