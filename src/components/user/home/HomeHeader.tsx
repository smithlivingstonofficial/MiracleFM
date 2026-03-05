"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Bell, User } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HomeHeaderProps {
  user: any;
}

// 🎵 Spiritual & Praise Messages
const BLESSINGS = [
  "Praise the Lord, O my soul",
  "Worship in Spirit & Truth",
  "Sing a New Song to Him",
  "God is Good, All the Time",
  "Let the Music Heal Your Soul",
  "His Love Endures Forever",
  "Make a Joyful Noise",
  "In His Presence is Fullness of Joy",
  "Blessed be the Name of the Lord"
];

export default function HomeHeader({ user }: HomeHeaderProps) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % BLESSINGS.length);
        setFade(true);
      }, 500); 
    }, 8000); 

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-4 md:px-8 py-3 flex items-center justify-between bg-[#050505]/85 backdrop-blur-xl border-b border-white/5 transition-all">
      
      {/* --- LEFT: LOGO & BLESSING --- */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
        
        {/* Brand Logo */}
        <Link href="/" className="relative shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg group">
          <Image 
            src="/miraclefm.jpg" 
            alt="Miracle FM" 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-110" 
            priority
          />
          {/* Subtle Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>

        {/* Animated Text */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-pulse shrink-0" />
            <p className="text-zinc-400 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              Miracle FM Live
            </p>
          </div>
          
          <h2 
            className={cn(
              "text-white font-black text-sm md:text-lg leading-none tracking-tight transition-all duration-700 ease-in-out transform truncate pr-2",
              fade 
                ? "opacity-100 translate-y-0 blur-0" 
                : "opacity-0 translate-y-2 blur-sm"
            )}
          >
            {BLESSINGS[index]}
          </h2>
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & PROFILE --- */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        
        {/* Search */}
        <Link href="/search">
          <button className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300">
            <Search size={18} />
          </button>
        </Link>
        
        {/* Notifications */}
        <button className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300 relative group hidden sm:flex">
          <Bell size={18} className="group-hover:animate-swing" />
          <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-[#FF0055] rounded-full" />
        </button>

        {/* User Profile (Moved to Right) */}
        {user ? (
          <Link 
            href="/" 
            className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border border-white/10 active:scale-90 md:hover:border-[#FF0055] transition-all relative shadow-lg group ml-1"
          >
            {user.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-black text-white group-hover:bg-zinc-700 transition-colors">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        ) : (
          <Link href="/signin">
            <button className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#FF0055] flex items-center justify-center text-white active:scale-90 shadow-[0_0_15px_rgba(255,0,85,0.4)] transition-all">
              <User size={18} fill="currentColor" />
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}