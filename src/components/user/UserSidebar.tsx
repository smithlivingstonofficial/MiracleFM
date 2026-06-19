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
        "bg-[linear-gradient(180deg,rgba(9,9,11,0.99),rgba(4,4,5,0.99))] border-r border-white/[0.07]",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,0,85,0.08),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#FF0055]/18 to-transparent" />
      
      {/* --- 1. BRAND HEADER --- */}
      <div className={cn("h-20 flex items-center px-4 shrink-0 relative z-10", isCollapsed ? "justify-center px-0" : "justify-between")}>
        
        {/* Animated Logo */}
        <Link href="/" className="flex min-w-0 items-center gap-3 group">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045]">
              <Image src="/miraclefm-192.png" alt="Miracle FM" width={32} height={32} className="h-8 w-8 rounded-lg object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] font-extrabold tracking-tight text-white leading-none">
                MIRACLE <span className="text-[#FF0055]">FM</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.26em] text-zinc-500 mt-1.5">Premium</span>
            </div>
          )}
        </Link>

        {/* Toggle Button */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)} 
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* Toggle Open Button (Visible only when collapsed) */}
      {isCollapsed && (
        <div className="flex justify-center mb-4 relative z-10">
          <button onClick={() => setIsCollapsed(false)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-500 transition-colors hover:bg-[#FF0055]/10 hover:text-[#FF0055]" aria-label="Expand sidebar">
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* --- 2. NAVIGATION LINKS --- */}
      <div className="px-3 space-y-1 relative z-10">
        {navRoutes.map((route) => {
          const isActive = route.href === "/" ? pathname === route.href : pathname.startsWith(route.href);
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 relative overflow-hidden",
                isActive
                  ? "bg-white/[0.065] text-white border-[#FF0055]/24"
                  : "text-zinc-500 border-transparent hover:text-zinc-100 hover:bg-white/[0.05]",
                isCollapsed && "justify-center px-0 py-2.5"
              )}
            >
              {/* Active Indicator Strip */}
              {isActive && (
                <>
                  <div className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-[#FF0055]" />
                  {!isCollapsed && <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#FF0055]/90" />}
                </>
              )}

              <route.icon 
                size={19} 
                className={cn(
                  "shrink-0 transition-colors", 
                  isActive ? "text-[#FF4D89]" : "group-hover:text-white"
                )} 
              />
              
              {!isCollapsed && (
                <span className={cn("font-semibold tracking-tight", isActive && "text-white")}>
                  {route.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="my-4 px-5">
        <div className="h-px w-full bg-white/[0.06]" />
      </div>

      {/* --- 3. LIBRARY & PLAYLISTS --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-12 px-3 space-y-1 relative z-10">
        
        {/* Library Header */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between px-1.5 mb-3 group">
            <button 
                onClick={() => router.push('/library')}
                className="flex items-center gap-2 text-zinc-500 transition-colors hover:text-white"
            >
                <ListMusic size={13} className="text-[#FF4D89]" />
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">Your Playlists</span>
            </button>
            <button 
              onClick={handleCreatePlaylist} 
              className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-500 transition-all hover:bg-[#FF0055] hover:text-white"
              title="Create Playlist"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
             <button onClick={handleCreatePlaylist} className="text-zinc-600 transition-colors hover:text-[#FF0055]"><PlusCircle size={22} /></button>
          </div>
        )}

        {/* Collections Buttons */}
        <div className="mb-4 space-y-1.5">
            <Link 
                href="/library/liked" 
                className={cn(
                    "group flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-all",
                    isCollapsed ? "justify-center px-0 bg-transparent border-transparent" : "border-white/[0.07] bg-white/[0.04] hover:border-[#FF0055]/25 hover:bg-white/[0.065]"
                )}
            >
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF0055] via-fuchsia-500 to-violet-600 transition-transform group-hover:scale-105">
                    <Heart size={14} className="fill-white text-white" />
                </div>
                {!isCollapsed && (
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#FF4D89]">Liked Songs</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-500"><Sparkles size={8}/> Auto Playlist</span>
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
                "group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-all hover:bg-white/[0.05]", 
                isCollapsed && "justify-center px-0 py-2"
              )}
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 transition-colors group-hover:border-white/25">
                <PlaylistCover 
                  playlistId={pl.id} 
                  explicitCover={pl.cover_url} 
                  className="w-full h-full" 
                />
              </div>
              {!isCollapsed && (
                <span className="truncate text-sm font-medium text-zinc-400 transition-colors group-hover:text-white">
                    {pl.title}
                </span>
              )}
            </Link>
          ))}
        </div>

      </div>

      {/* --- 4. BOTTOM GRADIENT (Fade out effect) --- */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#040405] to-transparent pointer-events-none" />
      
    </aside>
  );
}
