// src/components/user/UserSidebar.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, Home, Search, Library, Plus, Heart,
  PanelLeftClose, PanelLeftOpen, ListMusic, Sparkles, PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import PlaylistCover from "./PlaylistCover";
import { deleteLocalCacheByPrefix, readLocalCache, writeLocalCache } from "@/lib/local-cache";
import type { Playlist } from "@/types/music";

export default function UserSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchUserPlaylists();

    return () => {
      cancelled = true;
    };

    async function fetchUserPlaylists() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const cacheKey = `sidebar-playlists:${user.id}`;
        const cached = readLocalCache<Playlist[]>(cacheKey);
        if (cached) {
          if (!cancelled) setUserPlaylists(cached);
          return;
        }

        const { data } = await supabase
          .from("playlists")
          .select("id, title, cover_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data && !cancelled) {
          writeLocalCache(cacheKey, data);
          setUserPlaylists(data);
        }
      }
    }
  }, [supabase]);

  const handleCreatePlaylist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Please login to create playlists");

    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `My Playlist #${userPlaylists.length + 1}` }),
    });
    const result = await response.json();

    if (response.ok && result.playlist) {
      toast.success("Playlist created");
      setUserPlaylists([result.playlist, ...userPlaylists]);
      deleteLocalCacheByPrefix(`sidebar-playlists:${user.id}`);
      deleteLocalCacheByPrefix(`library:${user.id}`);
      router.push(`/playlist/${result.playlist.id}`);
      router.refresh();
    } else {
      toast.error("Failed to create playlist");
    }
  };

  const navRoutes = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
    { label: "Faith", icon: BookOpen, href: "/faith" },
  ];

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-30 overflow-hidden",
        "bg-[linear-gradient(180deg,rgba(12,12,15,0.98),rgba(3,3,4,0.98))] border-r border-white/10 shadow-[18px_0_80px_-48px_rgba(255,0,85,0.55)]",
        isCollapsed ? "w-[88px]" : "w-[300px]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,0,85,0.18),transparent_34%),radial-gradient(circle_at_84%_32%,rgba(255,255,255,0.06),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#FF0055]/45 to-transparent" />
      
      {/* --- 1. BRAND HEADER --- */}
      <div className={cn("h-28 flex items-center px-5 shrink-0 relative z-10", isCollapsed ? "justify-center px-0" : "justify-between")}>
        
        {/* Animated Logo */}
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
             <div className="absolute inset-[-5px] rounded-2xl bg-[#FF0055] blur-xl opacity-35 group-hover:opacity-60 transition-opacity" />
             <div className="absolute inset-0 rounded-2xl bg-white/10 border border-white/15 shadow-[0_18px_40px_-18px_rgba(255,0,85,0.9)]" />
              <Image src="/miraclefm-192.png" alt="Miracle FM" width={40} height={40} className="absolute inset-1 h-10 w-10 object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" />
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[21px] font-black tracking-tight text-white leading-none drop-shadow-[0_2px_0_rgba(255,0,85,0.45)]">
                MIRACLE <span className="text-[#FF0055]">FM</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.38em] text-zinc-500 mt-1">Premium</span>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/10 transition-colors grid place-items-center"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      {/* Toggle Open Button (Visible only when collapsed) */}
      {isCollapsed && (
        <div className="flex justify-center mb-6 relative z-10">
          <button onClick={() => setIsCollapsed(false)} className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 hover:text-[#FF0055] hover:bg-[#FF0055]/10 transition-colors grid place-items-center" aria-label="Expand sidebar">
            <PanelLeftOpen size={20} />
          </button>
        </div>
      )}

      {/* --- 2. NAVIGATION LINKS --- */}
      <div className="px-4 space-y-2 relative z-10">
        {navRoutes.map((route) => {
          const isActive = route.href === "/" ? pathname === route.href : pathname.startsWith(route.href);
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden border",
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(255,0,85,0.24),rgba(255,255,255,0.055))] text-white border-[#FF0055]/30 shadow-[0_16px_35px_-24px_rgba(255,0,85,0.95)]"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.055] hover:border-white/10",
                isCollapsed && "justify-center px-0 py-3.5"
              )}
            >
              {/* Active Indicator Strip */}
              {isActive && (
                <>
                  <div className="absolute inset-y-3 left-0 w-1 bg-[#FF0055] rounded-r-full shadow-[0_0_18px_rgba(255,0,85,0.9)]" />
                  <div className="absolute right-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/70" />
                </>
              )}

              <route.icon 
                size={21} 
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
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 px-4 space-y-1 relative z-10">
        
        {/* Library Header */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-2 mb-4 group">
            <button 
                onClick={() => router.push('/library')}
                className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
            >
                <ListMusic size={14} className="text-[#FF0055]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Your Playlists</span>
            </button>
            <button 
              onClick={handleCreatePlaylist} 
              className="text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-[#FF0055] border border-white/10 p-1.5 rounded-full transition-all"
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
                    "flex items-center gap-3 px-3 py-3 rounded-2xl transition-all group border",
                    isCollapsed ? "justify-center px-0 bg-transparent border-transparent" : "bg-[linear-gradient(135deg,rgba(255,0,85,0.16),rgba(255,255,255,0.04))] border-white/10 hover:border-[#FF0055]/35 hover:bg-[#FF0055]/10"
                )}
            >
                <div className="relative w-11 h-11 flex items-center justify-center bg-gradient-to-br from-[#FF0055] via-fuchsia-500 to-violet-600 rounded-xl shrink-0 shadow-[0_14px_30px_-16px_rgba(255,0,85,1)] group-hover:scale-105 transition-transform">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.055] transition-all group", 
                isCollapsed && "justify-center px-0 py-3"
              )}
            >
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-white/25 transition-colors shadow-lg">
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
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#030304] to-transparent pointer-events-none" />
      
    </aside>
  );
}
