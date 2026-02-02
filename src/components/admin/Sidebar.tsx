"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, LayoutTemplate, Upload, Music, ListMusic, ImageIcon, Disc, Users, Settings, LogOut, ChevronRight, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();

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
    <aside className="w-[280px] h-screen sticky top-0 hidden md:flex flex-col border-r border-border bg-surface z-50">
      
      {/* 1. Brand Header */}
      <div className="px-8 pt-10 pb-8">
        <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-1">
          MIRACLE<span className="text-brand">FM</span>
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse ml-1" />
        </h1>
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.25em] mt-2">
          Pro Console v2.0
        </p>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300",
                isActive 
                  ? "bg-brand text-white shadow-[0_0_20px_rgba(255,0,85,0.3)]" 
                  : "text-text-muted hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <item.icon 
                size={20} 
                className={cn(
                  "transition-transform duration-300", 
                  isActive ? "scale-105" : "group-hover:scale-110 group-hover:text-brand"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn("text-sm font-medium", isActive ? "font-bold" : "")}>
                {item.name}
              </span>
              
              {isActive && (
                <ChevronRight size={14} className="ml-auto text-white/80" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Footer Profile Card */}
      <div className="p-4 mt-auto">
        <div className="bg-panel border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-border-hover transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-text-muted">
              <UserCircle size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Admin User</span>
              <span className="text-[10px] text-text-dim">Super Admin</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-text-muted hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}