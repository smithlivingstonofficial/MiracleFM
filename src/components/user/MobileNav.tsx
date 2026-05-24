// src/components/user/MobileNav.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Library, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();
  
  const routes =[
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
    { label: "Faith", icon: BookOpen, href: "/faith" },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[420px]">
      
      {/* --- FLOATING GLASS ISLAND --- */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(22,22,26,0.94),rgba(5,5,6,0.95))] backdrop-blur-2xl border border-white/10 rounded-[1.8rem] px-3 py-2 flex items-center justify-between shadow-[0_24px_70px_-22px_rgba(0,0,0,0.95)] ring-1 ring-white/[0.05]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,0,85,0.22),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(255,255,255,0.06),transparent_36%)]" />
        
        {routes.map((route) => {
          const isActive = route.href === "/" ? pathname === route.href : pathname.startsWith(route.href);

          return (
            <Link 
              key={route.href}
              href={route.href} 
              // Removed default tap highlight for a custom feel
              className="relative flex h-[54px] flex-1 items-center justify-center group outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }} 
            >
              
              {/* --- AMBIENT GLOW (Only on active) --- */}
              <div className={cn(
                "absolute left-1/2 top-1 h-8 w-12 -translate-x-1/2 rounded-full bg-[#FF0055]/24 blur-xl transition-opacity duration-500",
                isActive ? "opacity-100" : "opacity-0"
              )} />

              {/* --- ICON & TEXT CONTAINER --- */}
              {/* Slides up smoothly when active */}
              <div className={cn(
                "relative z-10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex h-[46px] flex-col items-center justify-center group-active:scale-95",
                isActive ? "-translate-y-0.5 scale-105" : "translate-y-0 scale-100"
              )}>
                
                <route.icon 
                  size={23} 
                  className={cn(
                    "transition-colors duration-300",
                    isActive ? "text-[#FF0055] drop-shadow-[0_0_12px_rgba(255,0,85,0.6)]" : "text-zinc-500 group-active:text-zinc-300"
                  )} 
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={isActive ? 2 : 2.5}
                />
                
                {/* Text Label: Fades and slides in when active, disappears when inactive */}
                <div className="mt-1 flex h-3.5 items-center justify-center overflow-hidden">
                  <span className={cn(
                    "text-[9px] font-black uppercase leading-none tracking-[0.04em] transition-colors duration-300",
                    isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    {route.label}
                  </span>
                </div>
              </div>

              {/* --- ACTIVE DOT INDICATOR --- */}
              <div className={cn(
                "absolute bottom-0.5 h-1 w-6 rounded-full bg-[#FF0055] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_12px_rgba(255,0,85,0.8)]",
                isActive ? "scale-100 opacity-100" : "scale-0 opacity-0 translate-y-2"
              )} />
              
            </Link>
          );
        })}
      </div>
    </div>
  );
}
