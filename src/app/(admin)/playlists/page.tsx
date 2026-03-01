"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, ListMusic, Trash2 } from "lucide-react"; // Removed unused imports
import { toast } from "sonner";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchPlaylists();
  }, []);

  async function fetchPlaylists() {
    // UPDATED: Added .is("user_id", null) to filter out user-created playlists
    const { data, error } = await supabase
      .from("playlists")
      .select("*, playlist_tracks(count)")
      .is("user_id", null) 
      .order("created_at", { ascending: false });
      
    if (error) {
      toast.error("Error loading playlists");
      console.error(error);
    }
    
    if (data) setPlaylists(data);
  }

  const createPlaylist = async () => {
    // UPDATED: Explicitly set user_id to null to ensure it's an Editorial Playlist
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

  const deletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!confirm("Delete this playlist? This cannot be undone.")) return;
    
    // Using Supabase client directly is often faster/easier than an API route for simple deletes
    // provided you have RLS policies set up for admins.
    const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);

    if (error) {
        toast.error("Failed to delete");
    } else {
        toast.success("Playlist deleted");
        fetchPlaylists(); // Refresh list
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
          className="bg-[#FF0055] hover:bg-[#E6004D] text-white h-14 px-8 rounded-full font-black text-sm shadow-lg shadow-[#FF0055]/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus size={20} /> Create New
        </button>
      </div>

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
                onClick={(e) => deletePlaylist(playlist.id, e)}
                className="p-2 text-zinc-600 hover:text-red-500 transition-colors bg-white/5 rounded-full hover:bg-white/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}