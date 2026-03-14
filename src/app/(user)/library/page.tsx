// src/app/(user)/library/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Heart, Plus, ListMusic, Loader2, Play, Sparkles, ChevronRight, Disc } from "lucide-react";
import Link from "next/link";
import PlaylistCover from "@/components/user/PlaylistCover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LibraryPage() {
  const[user, setUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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
  }, [router, supabase]);

  const handleCreatePlaylist = async () => {
    if (!user) return toast.error("Please log in.");
    if (isCreating) return;
    
    setIsCreating(true);
    const { data, error } = await supabase
      .from("playlists")
      .insert({ title: `My Playlist #${playlists.length + 1}`, user_id: user.id })
      .select().single();

    if (data) {
      toast.success("New playlist created!");
      router.push(`/playlist/${data.id}`);
    } else {
      toast.error("Failed to create playlist.");
      setIsCreating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505]">
      <div className="relative w-20 h-20 flex items-center justify-center">
         <div className="absolute inset-0 border-t-2 border-[#FF0055] rounded-full animate-spin" />
         <div className="absolute inset-2 border-r-2 border-[#ff1a66] rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
         <ListMusic size={24} className="text-zinc-500 animate-pulse" />
      </div>
      <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em] mt-6">Loading Library</p>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] left-[-50px] w-[300px] h-[300px] bg-[#FF0055]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* --- HEADER --- */}
        <div className="pt-8 md:pt-4 flex items-center justify-between gap-4">
          <div>
            <div className="hidden md:flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055] items-center gap-1.5 flex">
                  <Sparkles size={10} /> Your Collection
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white drop-shadow-md leading-none">
              Your Library
            </h1>
          </div>
          
          <button 
            onClick={handleCreatePlaylist}
            disabled={isCreating}
            className="group flex items-center justify-center h-10 px-4 md:h-12 md:px-6 gap-2 bg-[#FF0055] hover:bg-[#ff1a66] disabled:bg-[#FF0055]/50 text-white rounded-full transition-all duration-300 font-bold text-xs md:text-sm shadow-[0_0_20px_rgba(255,0,85,0.3)] hover:shadow-[0_0_30px_rgba(255,0,85,0.5)] active:scale-95 shrink-0"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} className="md:group-hover:rotate-90 transition-transform duration-300" />}
            <span className="font-black tracking-widest uppercase text-[10px] md:text-xs">{isCreating ? "Wait..." : "New"}</span>
          </button>
        </div>

        {/* --- LIKED SONGS BANNER (Mobile Horizontal Optimized) --- */}
        <Link href="/library/liked" className="block group active:scale-[0.98] md:active:scale-100 transition-transform duration-300">
          <div className="relative overflow-hidden flex flex-row items-center gap-4 md:gap-8 p-4 md:p-8 bg-gradient-to-br from-zinc-900/80 to-[#0A0A0A] rounded-[1.5rem] md:rounded-[2rem] border border-white/5 md:group-hover:border-[#FF0055]/30 shadow-lg md:group-hover:shadow-[0_10px_40px_rgba(255,0,85,0.15)] transition-all duration-500">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 bottom-0 w-1/2 bg-gradient-to-l from-[#FF0055]/5 to-transparent opacity-100 pointer-events-none" />

            {/* Heart Icon Container (Smaller on mobile, sits on the left) */}
            <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-[1rem] md:rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-[#FF0055] to-[#ff1a66] flex items-center justify-center shrink-0 shadow-[0_10px_20px_rgba(255,0,85,0.3)] md:group-hover:scale-105 transition-transform duration-500">
              <Heart size={32} className="text-white fill-white drop-shadow-lg relative z-10 md:group-hover:scale-110 md:w-12 md:h-12 transition-transform duration-500" />
              {/* Subtle inner glow for depth */}
              <div className="absolute inset-0 bg-white/20 blur-xl opacity-50" />
            </div>
            
            {/* Text Content */}
            <div className="relative z-10 flex-1 flex items-center justify-between">
              <div>
                <p className="text-[9px] md:text-xs text-[#FF0055] font-black uppercase tracking-[0.2em] mb-1 md:mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={10} /> Auto-Generated
                </p>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white md:group-hover:text-[#FF0055] transition-colors tracking-tighter leading-none mb-1.5 md:mb-2">Liked Songs</h2>
                <p className="text-xs md:text-sm text-zinc-400 font-bold flex items-center gap-1.5">
                  <ListMusic size={14} className="md:w-4 md:h-4 text-zinc-500" /> {likedCount} {likedCount === 1 ? 'track' : 'tracks'}
                </p>
              </div>
              <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 md:group-hover:bg-[#FF0055] md:group-hover:text-white transition-all duration-300 md:group-hover:translate-x-2 shrink-0 border border-white/5">
                 <ChevronRight size={20} className="md:w-6 md:h-6" />
              </div>
            </div>
          </div>
        </Link>

        {/* --- USER PLAYLISTS GRID --- */}
        <div>
          <div className="flex items-center gap-3 mb-5 md:mb-6 px-1">
             <h2 className="text-xl md:text-3xl font-black tracking-tighter text-white">Your Playlists</h2>
             <span className="px-2.5 py-0.5 bg-zinc-900 rounded-full text-zinc-400 font-bold text-[10px] md:text-xs border border-white/5">{playlists.length}</span>
          </div>

          {playlists.length === 0 ? (
            
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center py-16 md:py-20 px-4 text-center border-2 border-dashed border-white/5 rounded-[2rem] md:rounded-[2.5rem] bg-[#0A0A0A]/50 transition-colors hover:border-white/10">
               <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-5 md:mb-6 shadow-xl border border-white/5">
                  <Disc size={28} className="text-zinc-600 md:w-8 md:h-8" />
               </div>
               <h3 className="text-lg md:text-2xl font-black text-white tracking-tighter mb-2">No Playlists Yet</h3>
               <p className="text-xs md:text-sm text-zinc-500 max-w-xs md:max-w-sm mb-6 md:mb-8 font-medium leading-relaxed">Create your first playlist to start organizing your favorite tracks and albums.</p>
               <button 
                  onClick={handleCreatePlaylist}
                  disabled={isCreating}
                  className="bg-[#FF0055] hover:bg-[#ff1a66] text-white px-8 py-3.5 rounded-full font-black text-xs md:text-sm uppercase tracking-widest transition-transform active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,85,0.3)] disabled:opacity-50"
               >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Create Playlist
               </button>
            </div>

          ) : (

            /* PLAYLISTS GRID */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {playlists.map((playlist) => (
                <Link 
                  key={playlist.id} 
                  href={`/playlist/${playlist.id}`} 
                  className="group flex flex-col gap-2.5 md:gap-3 active:scale-95 md:active:scale-100 transition-transform duration-300"
                >
                  <div className="aspect-square relative rounded-[1.25rem] md:rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-md md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)] md:group-hover:border-[#FF0055]/30 md:group-hover:-translate-y-1.5 transition-all duration-500">
                    
                    <PlaylistCover 
                      playlistId={playlist.id} 
                      explicitCover={playlist.cover_url} 
                      className="w-full h-full md:transform md:transition-transform md:duration-700 md:group-hover:scale-110"
                    />
                    
                    {/* Glass Overlay (Desktop Hover) */}
                    <div className="hidden md:block absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />
                    
                    {/* Floating Play Button (Desktop Hover) */}
                    <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <div className="bg-[#FF0055] p-3 md:p-4 rounded-full text-white shadow-xl shadow-black/50 hover:scale-110 hover:bg-[#ff1a66] transition-all">
                        <Play fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 ml-1" />
                      </div>
                    </div>

                  </div>
                  
                  <div className="px-1">
                    <h3 className="font-bold text-white truncate text-sm md:text-base md:group-hover:text-[#FF0055] transition-colors">{playlist.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5 opacity-80 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                       <ListMusic size={10} className="text-[#FF0055] md:text-zinc-500" />
                       <p className="text-[9px] md:text-[10px] text-zinc-400 md:text-zinc-500 font-black uppercase tracking-[0.2em]">Playlist</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          )}
        </div>

      </div>
    </div>
  );
}