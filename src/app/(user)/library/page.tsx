"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Heart, Plus, ListMusic, Loader2 } from "lucide-react";
import Link from "next/link";
import PlaylistCover from "@/components/user/PlaylistCover";
import { toast } from "sonner";

export default function LibraryPage() {
  const [user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }
      setUser(user);

      const [playlistsRes, likesRes] = await Promise.all([
        supabase.from("playlists").select("id, title, cover_url").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_likes").select("track_id", { count: 'exact', head: true }).eq("user_id", user.id)
      ]);

      if (playlistsRes.data) setPlaylists(playlistsRes.data);
      setLikedCount(likesRes.count || 0);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCreatePlaylist = async () => {
    if (!user) return toast.error("Please log in.");
    
    const { data, error } = await supabase
      .from("playlists")
      .insert({ title: `My Playlist #${playlists.length + 1}`, user_id: user.id })
      .select().single();

    if (data) {
      toast.success("New playlist created!");
      router.push(`/playlist/${data.id}`);
    } else {
      toast.error("Failed to create playlist.");
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-[#FF0055] w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen pb-32 bg-black animate-in fade-in duration-500">
      <div className="p-6 md:p-12 space-y-10">
        
        {/* Header */}
        <div className="pt-16 md:pt-8 flex items-center justify-between">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            Your Library
          </h1>
          <button 
            onClick={handleCreatePlaylist}
            className="flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-6 md:py-3 gap-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors font-bold text-sm"
          >
            <Plus size={24} />
            <span className="hidden md:inline">New Playlist</span>
          </button>
        </div>

        {/* Liked Songs Card */}
        <Link href="/library/liked" className="block group">
          <div className="flex items-center gap-6 p-4 md:p-6 bg-gradient-to-r from-indigo-900/50 to-zinc-900 rounded-[2rem] border border-transparent hover:border-white/10 transition-all duration-300">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center shrink-0 shadow-2xl group-hover:scale-105 transition-transform">
              <Heart size={48} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-pink-300 transition-colors">Liked Songs</h2>
              <p className="text-sm text-zinc-400 font-medium mt-1">{likedCount} tracks</p>
            </div>
          </div>
        </Link>

        {/* User Playlists Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {playlists.map((playlist) => (
            <Link 
              key={playlist.id} 
              href={`/playlist/${playlist.id}`} 
              className="group block"
            >
              <div className="aspect-square relative rounded-[2rem] overflow-hidden bg-zinc-900 shadow-lg transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[#FF0055]/10">
                <PlaylistCover 
                  playlistId={playlist.id} 
                  explicitCover={playlist.cover_url} 
                  className="w-full h-full"
                />
              </div>
              <div className="mt-4 px-1">
                <h3 className="font-bold text-white truncate text-base group-hover:text-[#FF0055] transition-colors">{playlist.title}</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Playlist</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}