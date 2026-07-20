"use client";

import Link from "next/link";
import Image from "next/image";
import { Radio, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface HomeHeaderProps {
  user: SupabaseUser | null;
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSearchPage = pathname === "/search";
  const searchParamQuery = searchParams.get("q") || "";
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSearchPage) return;

    const interval = setInterval(() => {
      setFade(false);
      timeoutRef.current = setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % BLESSINGS.length);
        setFade(true);
      }, 500); 
    }, 8000); 

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isSearchPage]);

  const updateSearchUrl = (value: string) => {
    const trimmedValue = value.trim();
    router.replace(trimmedValue ? `/search?q=${encodeURIComponent(trimmedValue)}` : "/search", { scroll: false });
  };

  const renderProfileAction = () => {
    if (user) {
      return (
        <Link
          href="/profile"
          className="relative ml-1 h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5 shadow-[0_16px_34px_-20px_rgba(255,255,255,0.45)] transition-all active:scale-90 md:h-12 md:w-12 md:hover:border-[#FF0055]"
        >
          {user.user_metadata?.avatar_url ? (
            <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover" sizes="(max-width: 768px) 40px, 48px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-black text-white transition-colors group-hover:bg-zinc-700">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      );
    }

    return (
      <Link href="/signin">
        <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF0055] text-white shadow-[0_0_24px_rgba(255,0,85,0.45)] transition-all active:scale-90 md:h-12 md:w-12">
          <User size={18} fill="currentColor" />
        </button>
      </Link>
    );
  };

  if (isSearchPage) {
    return (
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-[#050505]/82 px-4 py-3 shadow-[0_18px_60px_-46px_rgba(255,0,85,0.65)] backdrop-blur-2xl transition-all md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,0,85,0.12),transparent_34%,rgba(255,255,255,0.035))]" />

        <Link href="/" className="relative z-10 h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_18px_38px_-20px_rgba(255,0,85,0.95)] md:h-14 md:w-14">
          <Image src="/miraclefm.jpg" alt="Miracle FM" fill className="object-cover" priority sizes="(max-width: 768px) 44px, 56px" />
        </Link>

        <div className="relative z-10 min-w-0 flex-1">
          <div className="group relative">
            <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-[#FF0055] md:left-5">
              <Search size={19} />
            </div>
            <input
              value={searchParamQuery}
              onChange={(event) => updateSearchUrl(event.target.value)}
              placeholder="Search songs, artists, albums, lyrics..."
              className="h-11 w-full rounded-full border border-white/10 bg-white/[0.055] pl-11 pr-11 text-sm font-black text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_44px_-34px_rgba(255,0,85,0.9)] transition-all placeholder:text-zinc-600 focus:border-[#FF0055]/55 focus:bg-black/80 focus:ring-4 focus:ring-[#FF0055]/10 md:h-12 md:pl-12 md:pr-12 md:text-base"
              autoFocus
            />
            {searchParamQuery ? (
              <button
                type="button"
                onClick={() => updateSearchUrl("")}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/5 p-1.5 text-zinc-500 transition-all hover:bg-white/10 hover:text-white active:scale-90 md:right-4"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : (
              <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 md:flex">
                Search
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 shrink-0">
          {renderProfileAction()}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 px-4 md:px-10 py-3 flex items-center justify-between bg-[#050505]/76 backdrop-blur-2xl border-b border-white/10 transition-all shadow-[0_18px_60px_-46px_rgba(255,0,85,0.65)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,0,85,0.10),transparent_32%,rgba(255,255,255,0.035))]" />
      
      {/* --- LEFT: LOGO & BLESSING --- */}
      <div className="flex items-center gap-3 md:gap-4 overflow-hidden relative z-10">
        
        {/* Brand Logo */}
        <Link href="/" className="relative shrink-0 w-11 h-11 md:w-14 md:h-14 rounded-2xl overflow-hidden border border-white/15 shadow-[0_18px_38px_-20px_rgba(255,0,85,0.95)] group bg-white/5">
          <Image 
            src="/miraclefm.jpg" 
            alt="Miracle FM" 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-110" 
            priority
            sizes="(max-width: 768px) 44px, 56px"
          />
          {/* Subtle Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>

        {/* Animated Text */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0055] opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0055]" />
            </span>
            <p className="text-zinc-400 text-[8px] md:text-[10px] font-black uppercase tracking-[0.24em] whitespace-nowrap">
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
      <div className="flex items-center gap-2 md:gap-3 shrink-0 relative z-10">
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">
          <Radio size={14} className="text-[#FF0055]" />
          Premium live
        </div>
        
        {/* Search */}
        <Link href="/search">
          <button
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        </Link>

        {/* User Profile (Moved to Right) */}
        {renderProfileAction()}
      </div>
    </header>
  );
}
