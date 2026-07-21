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
    if (!user) {
      toast.error("Please sign in to create a playlist");
      return;
    }

    const response = await fetch("/api/playlists/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `My Playlist #${userPlaylists.length + 1}`,
      }),
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
        "hidden md:flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-30 overflow-visible",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Inner container to apply overflow clipping for blur circles and background gradients */}
      <div className="absolute inset-0 overflow-hidden flex flex-col bg-[linear-gradient(180deg,#120718_0%,#09030c_100%)] border-r border-white/[0.06] shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
        {/* Dynamic Glowing Mesh Aura */}
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-tr from-[#FF0055]/15 to-transparent blur-3xl opacity-80" />
        <div className="pointer-events-none absolute right-0 bottom-1/4 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.1)_0%,transparent_70%)] blur-2xl opacity-70" />
        <div className="pointer-events-none absolute left-1/4 bottom-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,0,85,0.05)_0%,transparent_70%)] blur-xl opacity-60" />

        {/* Right boundary glow line */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#FF0055]/20 to-transparent" />

        {/* Top Spacer */}
        <div className="h-4 shrink-0" />

        {/* --- 2. NAVIGATION LINKS --- */}
        <div className="px-3 space-y-1.5 relative z-10 py-2.5 bg-white/[0.025] backdrop-blur-md rounded-2xl border border-white/[0.04] mx-3">
          {navRoutes.map((route) => {
            const isActive = route.href === "/" ? pathname === route.href : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-[#FF0055]/15 to-transparent text-white border-[#FF0055]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(255,0,85,0.06)]"
                    : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.045] hover:border-white/[0.04] hover:translate-x-0.5",
                  isCollapsed && "justify-center px-0 py-2.5 hover:translate-x-0"
                )}
              >
                {/* Active Indicator Strip */}
                {isActive && (
                  <>
                    <div className="absolute inset-y-2.5 left-0 w-0.75 rounded-r-full bg-[#FF0055] shadow-[0_0_8px_rgba(255,0,85,0.8)]" />
                    {!isCollapsed && <div className="absolute right-3.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#FF0055] shadow-[0_0_8px_rgba(255,0,85,1)]" />}
                  </>
                )}

                <route.icon
                  size={19}
                  className={cn(
                    "shrink-0 transition-all duration-300",
                    isActive ? "text-[#FF0055] drop-shadow-[0_0_6px_rgba(255,0,85,0.6)]" : "text-zinc-400 group-hover:text-zinc-100 group-hover:scale-105"
                  )}
                />

                {!isCollapsed && (
                  <span className={cn("font-bold tracking-tight", isActive && "text-white")}>
                    {route.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="my-3 px-5">
          <div className="h-px w-full bg-white/[0.04]" />
        </div>

        {/* --- 3. LIBRARY & PLAYLISTS --- */}
        <div className={cn(
          "flex-1 overflow-y-auto no-scrollbar pb-12 relative z-10 space-y-1.5",
          !isCollapsed ? "px-3 mx-3 mt-1.5 bg-white/[0.015] backdrop-blur-md rounded-2xl border border-white/[0.03] p-3" : "px-3"
        )}>

          {/* Library Header */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1 mb-2 group">
              <button
                onClick={() => router.push('/library')}
                className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
              >
                <ListMusic size={14} className="text-[#FF0055]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]/95">Your Library</span>
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-400 transition-all hover:bg-[#FF0055] hover:text-white hover:scale-105 shadow-md active:scale-95"
                title="Create Playlist"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <button onClick={handleCreatePlaylist} className="text-zinc-600 transition-colors hover:text-[#FF0055]"><PlusCircle size={22} /></button>
            </div>
          )}

          {/* Collections Buttons */}
          <div className="mb-3 space-y-1.5">
            <Link
              href="/library/liked"
              className={cn(
                "group flex items-center gap-3 rounded-xl border transition-all duration-300",
                isCollapsed 
                  ? "justify-center px-0 bg-transparent border-transparent" 
                  : "border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent p-2.5 hover:border-[#FF0055]/30 hover:bg-[#FF0055]/5 hover:translate-x-0.5 hover:shadow-[0_4px_15px_rgba(255,0,85,0.05)]"
              )}
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF0055] via-fuchsia-500 to-violet-600 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(255,0,85,0.4)]">
                <Heart size={15} className="fill-white text-white transition-transform duration-300 group-hover:scale-110" />
              </div>
              {!isCollapsed && (
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold text-white transition-colors group-hover:text-[#FF4D89]">Liked Songs</span>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-zinc-500 mt-0.5"><Sparkles size={8} className="text-[#FF0055]" /> Auto Playlist</span>
                </div>
              )}
            </Link>
          </div>

          {/* User Playlists List */}
          <div className="space-y-1 pt-1.5 border-t border-white/[0.04]">
            {userPlaylists.map((pl) => (
              <Link
                key={pl.id}
                href={`/playlist/${pl.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 transition-all duration-300 hover:bg-white/[0.045] hover:border-white/[0.03] hover:translate-x-0.5",
                  isCollapsed && "justify-center px-0 py-2 hover:translate-x-0"
                )}
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 transition-all duration-300 group-hover:border-[#FF0055]/30 group-hover:scale-103">
                  <PlaylistCover
                    playlistId={pl.id}
                    explicitCover={pl.cover_url}
                    className="w-full h-full object-cover"
                  />
                </div>
                {!isCollapsed && (
                  <span className="truncate text-sm font-semibold text-zinc-400 transition-colors group-hover:text-zinc-100">
                    {pl.title}
                  </span>
                )}
              </Link>
            ))}
          </div>

        </div>

        {/* --- 4. BOTTOM GRADIENT (Fade out effect) --- */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#09030c] to-transparent pointer-events-none" />
      </div>

      {/* Floating Edge Toggle Button (Centered vertically on the sidebar edge) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#0c0512] text-zinc-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),0_0_12px_rgba(255,0,85,0.15)] hover:bg-[#FF0055] hover:text-white hover:border-[#FF0055] hover:scale-105 active:scale-95 transition-all duration-300"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
      </button>
    </aside>
  );
}
