"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, LayoutTemplate, Upload, Music, ListMusic, 
  ImageIcon, Disc, Users, Settings, LogOut, ChevronRight, 
  UserCircle, PanelLeftClose, PanelLeftOpen, Sparkles, Tags, SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem("miraclefm:admin-sidebar-collapsed") === "true"
  );

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("miraclefm:admin-sidebar-collapsed", String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const menu = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Banners", icon: LayoutTemplate, href: "/banners" },
    { name: "Home Layout", icon: SlidersHorizontal, href: "/home-layout" },
    { name: "Bulk Upload", icon: Upload, href: "/upload" },
    { name: "Media Library", icon: Music, href: "/admin-tracks" },
    { name: "Albums", icon: Disc, href: "/albums" },
    { name: "Playlists", icon: ListMusic, href: "/playlists" },
    { name: "Recommendations", icon: Sparkles, href: "/recommendations" },
    { name: "Genres", icon: Tags, href: "/genres" },
    { name: "Artists", icon: Users, href: "/artists" },
    { name: "Cover Art", icon: ImageIcon, href: "/covers" },
    { name: "Settings", icon: Settings, href: "/settings" },
  ];

  return (
    <aside
      className={cn(
        "h-full hidden md:flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] relative z-40 overflow-hidden",
        "bg-[linear-gradient(180deg,rgba(12,12,15,0.99),rgba(3,3,4,0.99))] border-r border-white/10 shadow-[18px_0_80px_-48px_rgba(255,0,85,0.5)]",
        isCollapsed ? "w-[88px]" : "w-[300px]"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,0,85,0.16),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.055),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#FF0055]/45 to-transparent" />

      <div className={cn(
        "flex items-center h-20 shrink-0 transition-all duration-300 relative z-10 px-5",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 group">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div className="absolute inset-[-4px] rounded-xl bg-[#FF0055] opacity-25 blur-lg transition-opacity group-hover:opacity-45" />
            <div className="absolute inset-0 rounded-xl border border-white/10 bg-white/5 shadow-[0_12px_24px_-12px_rgba(255,0,85,0.7)]" />
            <Image src="/miraclefm-192.png" alt="Miracle FM" width={32} height={32} className="absolute inset-1 h-8 w-8 rounded-lg object-cover transition-transform duration-500 group-hover:scale-105" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="flex items-center gap-1 text-[17px] font-black leading-none tracking-tight text-white drop-shadow-[0_1.5px_0_rgba(255,0,85,0.35)]">
                MIRACLE<span className="text-brand">FM</span>
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_12px_rgba(255,0,85,0.8)]" />
              </h1>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">
                Pro Console v2.0
              </p>
            </div>
          )}
        </Link>

        {!isCollapsed && (
          <button
            onClick={toggleCollapsed}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            title="Collapse Sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="relative z-10 mb-4 flex justify-center">
          <button
            onClick={toggleCollapsed}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:bg-[#FF0055]/10 hover:text-[#FF0055]"
            title="Expand Sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        </div>
      )}

      <nav className="relative z-10 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-4 pt-1 no-scrollbar">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex min-h-[42px] items-center overflow-hidden rounded-xl border transition-all duration-200",
                isCollapsed ? "justify-center px-0" : "gap-3 px-3.5",
                isActive
                  ? "border-[#FF0055]/20 bg-[#FF0055]/10 text-white shadow-[0_6px_18px_-10px_rgba(255,0,85,0.4)]"
                  : "border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-[#FF0055] shadow-[0_0_10px_rgba(255,0,85,0.8)]" />
              )}

              <item.icon 
                size={18} 
                className={cn(
                  "shrink-0 transition-colors duration-200",
                  isActive ? "text-[#FF0055]" : "group-hover:text-white"
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              {!isCollapsed && (
                <span className={cn("whitespace-nowrap text-xs font-bold tracking-wide transition-opacity duration-200", isActive ? "text-white" : "")}>
                  {item.name}
                </span>
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

      <div className="relative z-10 p-4 mt-auto">
        <div className={cn(
          "flex items-center rounded-2xl border border-white/10 bg-white/[0.035] transition-all duration-300 hover:border-white/15 hover:bg-white/[0.055]",
          isCollapsed ? "justify-center p-2 flex-col gap-3" : "justify-between p-4"
        )}>
          <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
              <UserCircle size={20} />
            </div>
            
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-white truncate w-28">Admin User</span>
                <span className="text-[10px] font-semibold text-zinc-500">Super Admin</span>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogout}
            className={cn(
              "text-zinc-500 hover:text-red-400 transition-colors shrink-0",
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
