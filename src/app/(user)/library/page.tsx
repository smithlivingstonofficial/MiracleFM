// src/app/(user)/library/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Heart, Plus, ListMusic, Loader2, Play, Sparkles, ChevronRight, Disc, Bookmark, UserCheck, History } from "lucide-react";
import Link from "next/link";
import PlaylistCover from "@/components/user/PlaylistCover";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/user/Skeletons";
import { toast } from "sonner";
import { deleteLocalCacheByPrefix, readLocalCache, writeLocalCache } from "@/lib/local-cache";
import type { User } from "@supabase/supabase-js";
import type { Playlist } from "@/types/music";

type LibraryCache = {
  playlists: Playlist[];
  likedCount: number;
  savedAlbumsCount: number;
  followedArtistsCount: number;
};

export default function LibraryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [savedAlbumsCount, setSavedAlbumsCount] = useState(0);
  const [followedArtistsCount, setFollowedArtistsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/signin");
        return;
      }
      setUser(user);

      const cacheKey = `library:${user.id}`;
      const cached = readLocalCache<LibraryCache>(cacheKey);
      if (cached) {
        setPlaylists(cached.playlists);
        setLikedCount(cached.likedCount);
        setSavedAlbumsCount(cached.savedAlbumsCount);
        setFollowedArtistsCount(cached.followedArtistsCount);
        setLoading(false);
        return;
      }

      const [playlistsRes, likesRes, savedAlbumsRes, followedArtistsRes] = await Promise.all([
        supabase.from("playlists").select("id, title, description, cover_url, is_public").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_likes").select("track_id", { count: 'exact', head: true }).eq("user_id", user.id),
        supabase.from("saved_albums").select("album_id", { count: 'exact', head: true }).eq("user_id", user.id),
        supabase.from("followed_artists").select("artist_id", { count: 'exact', head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;
      const nextCache = {
        playlists: playlistsRes.data || [],
        likedCount: likesRes.count || 0,
        savedAlbumsCount: savedAlbumsRes.count || 0,
        followedArtistsCount: followedArtistsRes.count || 0,
      };
      writeLocalCache(cacheKey, nextCache);
      setPlaylists(nextCache.playlists);
      setLikedCount(nextCache.likedCount);
      setSavedAlbumsCount(nextCache.savedAlbumsCount);
      setFollowedArtistsCount(nextCache.followedArtistsCount);
      setLoading(false);
    }
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleCreatePlaylist = async () => {
    if (!user) return toast.error("Please log in.");
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `My Playlist #${playlists.length + 1}` }),
      });
      const result = await response.json();

      if (!response.ok || !result.playlist) throw new Error(result.error || "Failed to create playlist");

      toast.success("New playlist created!");
      deleteLocalCacheByPrefix(`library:${user.id}`);
      deleteLocalCacheByPrefix(`sidebar-playlists:${user.id}`);
      router.push(`/playlist/${result.playlist.id}`);
      router.refresh();
    } catch {
      toast.error("Failed to create playlist.");
      setIsCreating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] px-4 py-10 pb-40 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeaderSkeleton />
        <CardGridSkeleton cards={6} />
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* --- AMBIENT BACKGROUND --- */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] left-[-50px] w-[300px] h-[300px] bg-[#FF0055]/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="p-4 pt-5 md:p-8 lg:p-12 max-w-[1600px] mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">

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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
          {[
            {
              href: "/library/history",
              icon: History,
              label: "Recently Played",
              value: "History",
              description: "Valid listens from your account",
            },
            {
              href: "/library/albums",
              icon: Bookmark,
              label: "Saved Albums",
              value: `${savedAlbumsCount}`,
              description: savedAlbumsCount === 1 ? "album saved" : "albums saved",
            },
            {
              href: "/library/artists",
              icon: UserCheck,
              label: "Followed Artists",
              value: `${followedArtistsCount}`,
              description: followedArtistsCount === 1 ? "artist followed" : "artists followed",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-4 rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-[#FF0055]/30 hover:bg-white/[0.06] active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF0055]/15 text-[#FF0055]">
                  <Icon size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{item.label}</p>
                  <p className="mt-0.5 text-xs font-medium text-zinc-500">{item.value} · {item.description}</p>
                </div>
                <ChevronRight size={18} className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </Link>
            );
          })}
        </div>

        <ResponsiveAd variant="banner" className="px-0" />

        {/* --- USER PLAYLISTS GRID --- */}
        <div>
          <div className="mb-5 flex items-center justify-between gap-3 px-1 md:mb-6">
             <div className="flex min-w-0 items-center gap-3">
               <h2 className="truncate text-xl font-black tracking-tighter text-white md:text-3xl">Your Playlists</h2>
               <span className="shrink-0 px-2.5 py-0.5 bg-zinc-900 rounded-full text-zinc-400 font-bold text-[10px] md:text-xs border border-white/5">{playlists.length}</span>
             </div>
             <button 
               onClick={handleCreatePlaylist}
               disabled={isCreating}
               className="group flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FF0055] px-3 text-[10px] font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,0,85,0.28)] transition-all duration-300 hover:bg-[#ff1a66] hover:shadow-[0_0_30px_rgba(255,0,85,0.45)] active:scale-95 disabled:bg-[#FF0055]/50 md:h-11 md:px-5 md:text-xs"
             >
               {isCreating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={17} className="md:group-hover:rotate-90 transition-transform duration-300" />}
               <span>{isCreating ? "Wait" : "New"}</span>
             </button>
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

        <ResponsiveAd variant="banner" className="px-0" />

      </div>
    </div>
  );
}
