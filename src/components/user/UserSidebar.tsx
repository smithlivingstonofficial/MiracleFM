"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Home, Search, Library, Plus, Heart, 
  PanelLeftClose, PanelLeftOpen, ListMusic, 
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
        .select("id, title")
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

  return (
    <aside className={cn(
      "flex flex-col h-full bg-black border-r border-white/10 transition-all duration-300 ease-in-out relative z-30",
      isCollapsed ? "w-[80px]" : "w-[260px] xl:w-[300px]"
    )}>
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-6 shrink-0">
        {!isCollapsed ? (
          <h1 className="text-2xl font-black tracking-tighter text-white whitespace-nowrap animate-in fade-in">
            MIRACLE<span className="text-[#FF0055]">FM</span>
          </h1>
        ) : (
          <span className="text-[#FF0055] font-black text-2xl mx-auto">M</span>
        )}
        {!isCollapsed && (
          <button onClick={() => setIsCollapsed(true)} className="text-zinc-400 hover:text-white transition-colors">
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center mb-4">
          <button onClick={() => setIsCollapsed(false)} className="text-zinc-400 hover:text-white p-2 hover:bg-white/5 rounded-lg">
            <PanelLeftOpen size={24} />
          </button>
        </div>
      )}

      {/* Nav Section */}
      <div className="flex-1 px-3 space-y-2 overflow-y-auto no-scrollbar">
        <nav className="space-y-1">
          {[
            { label: "Home", icon: Home, href: "/" },
            { label: "Search", icon: Search, href: "/search" },
          ].map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                pathname === route.href ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              <route.icon size={24} className={cn(pathname === route.href && "text-[#FF0055]")} />
              {!isCollapsed && <span className="font-bold">{route.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="my-4 border-t border-white/5" />

        {/* User Playlists Section */}
        {!isCollapsed && (
          <div className="flex items-center justify-between px-4 mb-2 animate-in fade-in">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Your Library</span>
            <button onClick={handleCreatePlaylist} className="text-zinc-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
              <Plus size={16} />
            </button>
          </div>
        )}

        <div className="space-y-1">
          <Link href="/library" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group", isCollapsed && "justify-center px-0")}>
            <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-pink-700 to-red-800 rounded-lg shrink-0">
              <Library size={16} className="text-white fill-white" />
            </div>
            {!isCollapsed && <span className="text-sm font-bold text-white">Your Collections</span>}
          </Link>

          <Link href="/library/liked" className={cn("flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group", isCollapsed && "justify-center px-0")}>
            <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg shrink-0">
              <Heart size={16} className="text-white fill-white" />
            </div>
            {!isCollapsed && <span className="text-sm font-bold text-white">Liked Songs</span>}
          </Link>
          
          {userPlaylists.map((pl) => (
            <Link 
              key={pl.id} 
              href={`/playlist/${pl.id}`} 
              className={cn("flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group", isCollapsed && "justify-center px-0")}
            >
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <PlaylistCover 
                  playlistId={pl.id} 
                  explicitCover={pl.cover_url} 
                  className="w-full h-full" 
                />
              </div>
              {!isCollapsed && <span className="text-sm font-medium text-zinc-400 group-hover:text-white truncate">{pl.title}</span>}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}