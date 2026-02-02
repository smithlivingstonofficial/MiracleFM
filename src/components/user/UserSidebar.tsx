"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, Disc, Heart, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserSidebar() {
  const pathname = usePathname();

  const routes = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
  ];

  return (
    <div className="hidden md:flex flex-col w-[280px] h-full bg-black border-r border-white/5 p-6">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-black tracking-tighter text-white">
          MIRACLE<span className="text-[#FF0055]">FM</span>
        </h1>
      </div>

      <div className="space-y-6 flex-1">
        <nav className="space-y-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-full text-sm font-bold transition-all duration-200",
                pathname === route.href 
                  ? "bg-white/10 text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <route.icon size={22} />
              {route.label}
            </Link>
          ))}
        </nav>

        {/* Playlists Section (Placeholder for V2) */}
        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center justify-between px-4 mb-4">
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Your Playlists</span>
            <button className="text-zinc-400 hover:text-white"><Plus size={18} /></button>
          </div>
          <div className="px-4 py-3 flex items-center gap-3 text-zinc-400 hover:text-white cursor-pointer transition-colors">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md">
              <Heart size={14} className="text-white fill-white" />
            </div>
            <span className="text-sm font-bold">Liked Songs</span>
          </div>
        </div>
      </div>
    </div>
  );
}