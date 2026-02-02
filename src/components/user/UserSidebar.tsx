"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Search, Library, Plus, Heart, 
  PanelLeftClose, PanelLeftOpen, Music4 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserSidebar() {
  const pathname = usePathname();
  // Default to false (expanded) for desktop
  const [isCollapsed, setIsCollapsed] = useState(false);

  const routes = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
  ];

  return (
    <aside 
      className={cn(
        "flex flex-col h-full bg-black border-r border-white/10 transition-all duration-300 ease-in-out relative",
        isCollapsed ? "w-[80px]" : "w-[260px] xl:w-[300px]"
      )}
    >
      {/* 1. Header & Toggle */}
      <div className="h-20 flex items-center justify-between px-6 shrink-0">
        {/* Logo Logic */}
        {!isCollapsed ? (
          <h1 className="text-2xl font-black tracking-tighter text-white animate-in fade-in duration-300 whitespace-nowrap">
            MIRACLE<span className="text-[#FF0055]">FM</span>
          </h1>
        ) : (
          <span className="text-[#FF0055] font-black text-2xl mx-auto">M</span>
        )}
        
        {/* Collapse Button */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(true)}
            className="text-zinc-400 hover:text-white transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      {/* Collapsed State Toggle (Centered when collapsed) */}
      {isCollapsed && (
        <div className="flex justify-center mb-4">
          <button 
            onClick={() => setIsCollapsed(false)}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            title="Expand Sidebar"
          >
            <PanelLeftOpen size={24} />
          </button>
        </div>
      )}

      {/* 2. Navigation */}
      <div className="flex-1 px-3 space-y-2 overflow-y-auto no-scrollbar">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative",
              pathname === route.href 
                ? "bg-white/10 text-white font-bold" 
                : "text-zinc-400 hover:text-white hover:bg-white/5",
              isCollapsed && "justify-center px-0"
            )}
          >
            <route.icon 
              size={24} 
              className={cn(
                "shrink-0 transition-colors",
                pathname === route.href ? "text-[#FF0055]" : "group-hover:text-white"
              )} 
            />
            
            {!isCollapsed && (
              <span className="truncate">{route.label}</span>
            )}

            {/* Tooltip for Collapsed State */}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-1 bg-zinc-800 text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-white/10">
                {route.label}
              </div>
            )}
          </Link>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-white/5" />

        {/* 3. Playlists (Collapsible) */}
        {!isCollapsed && (
          <div className="flex items-center justify-between px-4 mb-2 animate-in fade-in">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Your Library</span>
            <button className="text-zinc-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors">
              <Plus size={16} />
            </button>
          </div>
        )}

        {/* Playlist Items */}
        <div className="space-y-1">
          <Link 
            href="/library"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5 group",
              isCollapsed && "justify-center px-0"
            )}
          >
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shrink-0 shadow-lg group-hover:scale-105 transition-transform">
              <Heart size={14} className="text-white fill-white" />
            </div>
            {!isCollapsed && <span className="text-sm font-bold text-white truncate">Liked Songs</span>}
          </Link>

          {/* Dummy Playlist for Visual */}
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5 group",
            isCollapsed && "justify-center px-0"
          )}>
            <div className="p-2 bg-zinc-800 rounded-lg shrink-0 group-hover:bg-zinc-700 transition-colors">
              <Music4 size={14} className="text-zinc-400 group-hover:text-white" />
            </div>
            {!isCollapsed && <span className="text-sm font-medium text-zinc-400 group-hover:text-white truncate">Sunday Worship</span>}
          </div>
        </div>
      </div>
    </aside>
  );
}