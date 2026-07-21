"use client";

import Link from "next/link";
import Image from "next/image";
import { Radio, Search, User, X, Home, Download, Compass } from "lucide-react";
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

  const [localQuery, setLocalQuery] = useState(searchParamQuery);

  useEffect(() => {
    setLocalQuery(searchParamQuery);
  }, [searchParamQuery]);

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

  const handleSearchFocus = () => {
    if (!isSearchPage) {
      router.push("/search");
    }
  };

  const handleSearchChange = (value: string) => {
    if (!isSearchPage) {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    } else {
      updateSearchUrl(value);
    }
  };

  const renderProfileAction = () => {
    if (user) {
      return (
        <Link
          href="/profile"
          className="relative ml-1 h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-[0_0_12px_rgba(255,0,85,0.1)] ring-2 ring-offset-2 ring-offset-[#050505] ring-[#FF0055]/30 transition-all duration-300 hover:ring-[#FF0055] active:scale-90 md:h-10 md:w-10"
        >
          {user.user_metadata?.avatar_url ? (
            <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover transition-transform duration-500 hover:scale-110" sizes="(max-width: 768px) 36px, 40px" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-black text-white transition-colors hover:bg-zinc-700">
              {user.email?.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      );
    }

    return (
      <Link href="/signin">
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF0055] to-[#E6004D] text-white shadow-[0_4px_15px_rgba(255,0,85,0.3)] transition-all duration-300 hover:scale-105 active:scale-90 md:h-10 md:w-10">
          <User size={15} fill="currentColor" />
        </button>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 px-4 md:px-6 lg:px-8 py-2.5 flex items-center justify-between bg-[#050505]/50 backdrop-blur-2xl border-b border-white/[0.05] transition-all">
      {/* Ambient background mesh glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,0,85,0.04),transparent_40%,rgba(255,255,255,0.015))]" />

      {/* Thin pink reflection border at the very bottom */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FF0055]/15 to-transparent" />

      {/* --- LEFT: LOGO & BLESSING (Hidden on mobile search page to make room) --- */}
      <div className={cn(
        "flex items-center gap-3 overflow-hidden relative z-10 min-w-0 mr-4",
        isSearchPage && "hidden md:flex"
      )}>
        {/* Brand Logo */}
        <Link href="/" className="relative shrink-0 w-8.5 h-8.5 md:w-10 md:h-10 rounded-xl overflow-hidden border border-white/10 shadow-[0_4px_12px_rgba(255,0,85,0.2)] group bg-white/5">
          <Image
            src="/miraclefm.jpg"
            alt="Miracle FM"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-108"
            priority
            sizes="(max-width: 768px) 34px, 40px"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Link>

        {/* Animated Text */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0055] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF0055] shadow-[0_0_6px_#FF0055]" />
            </span>
            <p className="text-zinc-500 text-[8px] md:text-[9px] font-black uppercase tracking-[0.24em] whitespace-nowrap">
              Miracle FM Live
            </p>
          </div>

          <h2
            className={cn(
              "text-white font-black text-xs md:text-sm leading-none tracking-tight transition-all duration-700 ease-in-out transform truncate pr-2 bg-gradient-to-r from-white to-zinc-200 bg-clip-text",
              fade
                ? "opacity-100 translate-y-0 blur-0"
                : "opacity-0 translate-y-2 blur-sm"
            )}
          >
            {BLESSINGS[index]}
          </h2>
        </div>
      </div>

      {/* --- CENTER: SPOTIFY-STYLE CAPSULE LAYOUT (Desktop & tablet only, or full-width search input on mobile search page) --- */}
      <div className={cn(
        "relative z-10 flex-1 max-w-[480px] mx-auto items-center gap-3",
        isSearchPage ? "flex" : "hidden md:flex"
      )}>
        {/* Standalone Circular Home Button */}
        <Link href="/">
          <button
            className={cn(
              "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
              pathname === "/"
                ? "bg-[#FF0055] text-white shadow-[0_0_12px_rgba(255,0,85,0.35)]"
                : "bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
            )}
            title="Home"
          >
            <Home size={16} />
          </button>
        </Link>

        {/* Central Search Capsule */}
        <div className="relative flex-1 group">
          <div className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-[#FF0055]">
            <Search size={16} />
          </div>
          <input
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              handleSearchChange(e.target.value);
            }}
            onFocus={handleSearchFocus}
            placeholder="What do you want to play?"
            className="h-9 md:h-10 w-full rounded-full border border-white/[0.08] bg-white/[0.035] pl-10 pr-10 text-xs font-bold text-white outline-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all placeholder:text-zinc-500 focus:border-[#FF0055]/40 focus:bg-[#050505]/80 focus:ring-4 focus:ring-[#FF0055]/8"
          />

          {localQuery ? (
            <button
              type="button"
              onClick={() => {
                setLocalQuery("");
                handleSearchChange("");
              }}
              className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/5 p-1 text-zinc-500 transition-all hover:bg-white/10 hover:text-white active:scale-90"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-zinc-300 transition-colors pointer-events-none pr-1">
              <Compass size={14} className="animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* --- RIGHT: ACTIONS & PROFILE (Compact) --- */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0 relative z-10 ml-4">

        {/* Compact Install Badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all cursor-pointer">
          <Download size={11} className="text-[#FF0055]" />
          Install App
        </div>

        {/* Compact Search Trigger (Visible only on mobile/tablet when NOT on search page) */}
        {!isSearchPage && (
          <Link href="/search" className="md:hidden">
            <button
              className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400 active:scale-90"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          </Link>
        )}

        {/* User Profile */}
        {renderProfileAction()}
      </div>
    </header>
  );
}
