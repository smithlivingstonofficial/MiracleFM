// src/components/user/UserSidebar.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Home, Search, Library, Plus, Heart, 
  PanelLeftClose, PanelLeftOpen, ListMusic, Disc, Sparkles, PlusCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PlaylistCover from "./PlaylistCover";

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);

  useEffect(() => {
    fetchUserPlaylists();
  }, []);

  async function fetchUserPlaylists() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("playlists")
        .select("id, title, cover_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setUserPlaylists(data);
    }
  }

  const handleCreatePlaylist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Please login to create playlists");

    const { data, error } = await supabase
      .from("playlists")
      .insert({ 
        title: `My Playlist #${userPlaylists.length + 1}`,
        user_id: user.id 
      })
      .select().single();

    if (data) {
      toast.success("Playlist created");
      setUserPlaylists([data, ...userPlaylists]);
      router.push(`/playlist/${data.id}`);
      router.refresh();
    } else {
      toast.error("Failed to create playlist");
    }
  };

  const navRoutes = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
  ];

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-full bg-[#050505] border-r border-white/5 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-30",
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      
      {/* --- 1. BRAND HEADER --- */}
      <div className={cn("h-24 flex items-center px-6 shrink-0", isCollapsed ? "justify-center px-0" : "justify-between")}>
        
        {/* Animated Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 flex items-center justify-center">
             <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-md opacity-40 group-hover:opacity-60 animate-pulse transition-opacity" />
              <img src="/miraclefm.jpg" alt="Logo" className="absolute inset-0 w-full h-full object-cover rounded-full transition-opacity" />
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white leading-none">
                MIRACLE <span className="text-[#FF0055]">FM</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 mt-0.5">Premium</span>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="text-zinc-600 hover:text-white transition-colors p-1"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Toggle Open Button (Visible only when collapsed) */}
      {isCollapsed && (
        <div className="flex justify-center mb-6">
          <button onClick={() => setIsCollapsed(false)} className="text-zinc-500 hover:text-[#FF0055] transition-colors">
            <PanelLeftOpen size={24} />
          </button>
        </div>
      )}

      {/* --- 2. NAVIGATION LINKS --- */}
      <div className="px-4 space-y-2">
        {navRoutes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                isActive ? "bg-[#FF0055]/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5",
                isCollapsed && "justify-center px-0 py-3"
              )}
            >
              {/* Active Indicator Strip */}
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FF0055] rounded-r-full" />}

              <route.icon 
                size={22} 
                className={cn(
                  "transition-colors", 
                  isActive ? "text-[#FF0055]" : "group-hover:text-white"
                )} 
              />
              
              {!isCollapsed && (
                <span className={cn("font-bold text-sm tracking-wide", isActive && "text-white")}>
                  {route.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="my-6 px-6">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* --- 3. LIBRARY & PLAYLISTS --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 px-4 space-y-1">
        
        {/* Library Header */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-2 mb-4 group">
            <button 
                onClick={() => router.push('/library')}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
            >
                <ListMusic size={14} />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Your Playlists</span>
            </button>
            <button 
              onClick={handleCreatePlaylist} 
              className="text-zinc-500 hover:text-[#FF0055] hover:bg-[#FF0055]/10 p-1.5 rounded-full transition-all"
              title="Create Playlist"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
             <button onClick={handleCreatePlaylist} className="text-zinc-600 hover:text-[#FF0055]"><PlusCircle size={24} /></button>
          </div>
        )}

        {/* Collections Buttons */}
        <div className="space-y-2 mb-6">
            <Link 
                href="/library/liked" 
                className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all group border border-transparent",
                    isCollapsed ? "justify-center px-0 bg-transparent" : "bg-gradient-to-r from-[#FF0055]/10 to-transparent hover:border-[#FF0055]/20"
                )}
            >
                <div className="relative w-9 h-9 flex items-center justify-center bg-gradient-to-br from-[#FF0055] to-purple-600 rounded-lg shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                    <Heart size={16} className="text-white fill-white" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-[#FF0055] transition-colors">Liked Songs</span>
                        <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1"><Sparkles size={8}/> Auto Playlist</span>
                    </div>
                )}
            </Link>
        </div>

        {/* User Playlists List */}
        <div className="space-y-1">
          {userPlaylists.map((pl) => (
            <Link 
              key={pl.id} 
              href={`/playlist/${pl.id}`} 
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group", 
                isCollapsed && "justify-center px-0 py-3"
              )}
            >
              <div className="relative w-9 h-9 rounded-[8px] overflow-hidden shrink-0 border border-white/5 group-hover:border-white/20 transition-colors">
                <PlaylistCover 
                  playlistId={pl.id} 
                  explicitCover={pl.cover_url} 
                  className="w-full h-full" 
                />
              </div>
              {!isCollapsed && (
                <span className="text-sm font-medium text-zinc-400 group-hover:text-white truncate transition-colors">
                    {pl.title}
                </span>
              )}
            </Link>
          ))}
        </div>

      </div>

      {/* --- 4. BOTTOM GRADIENT (Fade out effect) --- */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" />
      
    </aside>
  );
}