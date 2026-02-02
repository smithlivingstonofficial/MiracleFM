"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, ListMusic, Trash2, Edit3, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  async function fetchPlaylists() {
    // Get playlist + count of tracks
    const { data } = await supabase
      .from("playlists")
      .select("*, playlist_tracks(count)")
      .order("created_at", { ascending: false });
    if (data) setPlaylists(data);
  }

  const createPlaylist = async () => {
    const { data, error } = await supabase
      .from("playlists")
      .insert({ title: "New Playlist", description: "Curated collection" })
      .select()
      .single();
    
    if (data) {
      toast.success("Playlist created");
      router.push(`/playlists/${data.id}`); // Redirect to Editor
    } else {
      toast.error("Failed to create");
    }
  };

  const deletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm("Delete this playlist?")) return;
    
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Playlist deleted");
      fetchPlaylists();
    }
  };

  return (
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
          className="bg-brand hover:bg-brand-hover text-white h-14 px-8 rounded-full font-black text-sm shadow-lg shadow-brand/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} /> Create New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {playlists.map((playlist) => (
          <div 
            key={playlist.id}
            onClick={() => router.push(`/playlists/${playlist.id}`)}
            className="group bg-panel border border-white/[0.05] hover:border-white/10 p-4 rounded-[2rem] transition-all hover:-translate-y-1 cursor-pointer"
          >
            <div className="aspect-square relative rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 mb-4 shadow-lg">
              {playlist.cover_url ? (
                <Image src={playlist.cover_url} alt={playlist.title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                  <ListMusic size={48} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Empty Cover</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-white text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest">Edit List</span>
              </div>
            </div>
            
            <div className="px-2 pb-2 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-lg truncate w-40">{playlist.title}</h3>
                <p className="text-xs text-zinc-500 font-bold mt-1">
                  {playlist.playlist_tracks[0]?.count || 0} Tracks
                </p>
              </div>
              <button 
                onClick={(e) => deletePlaylist(playlist.id, e)}
                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}