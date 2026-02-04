"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, LayoutTemplate, Upload, Music, ListMusic, 
  ImageIcon, Disc, Users, Settings, LogOut, ChevronRight, 
  UserCircle, PanelLeftClose, PanelLeftOpen 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Banners", icon: LayoutTemplate, href: "/banners" },
    { name: "Bulk Upload", icon: Upload, href: "/upload" },
    { name: "Media Library", icon: Music, href: "/admin-tracks" },
    { name: "Albums", icon: Disc, href: "/albums" },
    { name: "Playlists", icon: ListMusic, href: "/playlists" },
    { name: "Artists", icon: Users, href: "/artists" },
    { name: "Cover Art", icon: ImageIcon, href: "/covers" },
    { name: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 hidden md:flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out z-40 pb-32", // Added pb-32 to prevent player overlap
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      
      {/* 1. Header & Toggle (Fixed at Top) */}
      <div className={cn(
        "flex items-center h-24 shrink-0 transition-all duration-300 relative",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-1">
              MIRACLE<span className="text-brand">FM</span>
              <div className="w-2 h-2 rounded-full bg-brand animate-pulse ml-1" />
            </h1>
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.25em] mt-1">
              Pro Console v2.0
            </p>
          </div>
        )}

        {isCollapsed && (
          <span className="text-brand font-black text-2xl">M</span>
        )}

        {/* Toggle Button - Now positioned at the top */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5",
            isCollapsed ? "absolute -bottom-4" : "" // Subtle adjustment
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden pt-4">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-xl transition-all duration-300 min-h-[48px]",
                isCollapsed ? "justify-center px-0" : "gap-3.5 px-4",
                isActive 
                  ? "bg-brand text-white shadow-[0_0_20px_rgba(255,0,85,0.3)]" 
                  : "text-text-muted hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <item.icon 
                size={20} 
                className={cn(
                  "transition-transform duration-300 shrink-0", 
                  isActive ? "scale-105" : "group-hover:scale-110 group-hover:text-brand"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              {!isCollapsed && (
                <span className={cn("text-sm font-medium whitespace-nowrap opacity-100 transition-opacity duration-300", isActive ? "font-bold" : "")}>
                  {item.name}
                </span>
              )}
              
              {!isCollapsed && isActive && (
                <ChevronRight size={14} className="ml-auto text-white/80" />
              )}

              {/* Tooltip for Collapsed State */}
              {isCollapsed && (
                <div className="absolute left-14 z-50 ml-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Footer Profile Card (Pushed up by pb-32) */}
      <div className="p-3 mt-auto">
        <div className={cn(
          "bg-panel border border-border rounded-2xl flex items-center transition-all duration-300 group hover:border-border-hover",
          isCollapsed ? "justify-center p-2 flex-col gap-4" : "justify-between p-4"
        )}>
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-text-muted shrink-0">
              <UserCircle size={20} />
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate w-24">Admin User</span>
                <span className="text-[10px] text-text-dim">Super Admin</span>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className={cn(
              "text-text-muted hover:text-red-500 transition-colors shrink-0",
              isCollapsed ? "w-full flex justify-center py-2 border-t border-white/5" : "p-2"
            )}
            title="Logout"
          >
            <LogOut size={isCollapsed ? 18 : 16} />
          </button>
        </div>
      </div>
    </aside>
  );
}