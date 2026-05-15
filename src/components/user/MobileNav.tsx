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
      <div className="bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-4 py-3.5 flex items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)]">
        
        {routes.map((route) => {
          const isActive = route.href === "/" ? pathname === route.href : pathname.startsWith(route.href);

          return (
            <Link 
              key={route.href}
              href={route.href} 
              // Removed default tap highlight for a custom feel
              className="relative flex flex-col items-center justify-center w-16 group outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }} 
            >
              
              {/* --- AMBIENT GLOW (Only on active) --- */}
              <div className={cn(
                "absolute inset-0 bg-[#FF0055]/20 rounded-full blur-xl transition-opacity duration-500",
                isActive ? "opacity-100" : "opacity-0"
              )} />

              {/* --- ICON & TEXT CONTAINER --- */}
              {/* Slides up smoothly when active */}
              <div className={cn(
                "relative z-10 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center",
                isActive ? "-translate-y-1.5" : "translate-y-1 group-active:scale-90"
              )}>
                
                <route.icon 
                  size={24} 
                  className={cn(
                    "transition-colors duration-300",
                    isActive ? "text-[#FF0055] drop-shadow-[0_0_12px_rgba(255,0,85,0.6)]" : "text-zinc-500"
                  )} 
                  fill={isActive ? "currentColor" : "none"}
                  strokeWidth={isActive ? 2 : 2.5}
                />
                
                {/* Text Label: Fades and slides in when active, disappears when inactive */}
                <div className="h-3 flex items-center justify-center overflow-hidden mt-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                    isActive ? "text-white translate-y-0 opacity-100" : "text-zinc-500 translate-y-4 opacity-0 absolute"
                  )}>
                    {route.label}
                  </span>
                </div>
              </div>

              {/* --- ACTIVE DOT INDICATOR --- */}
              <div className={cn(
                "absolute bottom-[-6px] w-1.5 h-1.5 rounded-full bg-[#FF0055] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_10px_rgba(255,0,85,0.8)]",
                isActive ? "scale-100 opacity-100" : "scale-0 opacity-0 translate-y-2"
              )} />
              
            </Link>
          );
        })}
      </div>
    </div>
  );
}
