"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();
  
  const routes = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Library", icon: Library, href: "/library" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe pt-2 px-6 h-[80px] flex items-start justify-around shadow-2xl shadow-black">
      {routes.map((route) => (
        <Link 
          key={route.href}
          href={route.href} 
          className={cn(
            "flex flex-col items-center gap-1.5 pt-2 transition-all active:scale-90",
            pathname === route.href ? "text-white" : "text-zinc-500"
          )}
        >
          <route.icon 
            size={24} 
            className={cn(pathname === route.href && "text-[#FF0055] drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]")} 
            fill={pathname === route.href ? "currentColor" : "none"}
          />
          <span className={cn(
            "text-[10px] font-bold tracking-wide",
            pathname === route.href ? "text-white" : "text-zinc-500"
          )}>
            {route.label}
          </span>
        </Link>
      ))}
    </div>
  );
}