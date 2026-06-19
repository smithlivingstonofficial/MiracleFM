// src/components/user/HeroSection.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Banner = {
  id?: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_link?: string | null;
};

export default function HeroSection({ banners }: { banners: Banner[] }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!banners || banners.length === 0) return null;

  const hero = banners[0];
  const targetLink = hero.target_link || "#";

  // Toggle function for the Details view
  const toggleDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDetailsOpen(!isDetailsOpen);
  };

  return (
    <div 
      className="group relative mx-auto aspect-video w-full select-none overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#050505] shadow-[0_24px_80px_rgba(0,0,0,0.42)] md:rounded-[2rem] xl:rounded-[2.25rem]"
    >
      {/* -----------------------------------------------------------
          LAYER 1: BACKGROUND IMAGE (Animated State)
      ------------------------------------------------------------ */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <Image 
          src={hero.image_url || "/miraclefm.jpg"} 
          alt={hero.title} 
          fill 
          className={cn(
            "object-cover transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
            // Zoom in and Blur when Details are open
            isDetailsOpen ? "scale-110 blur-xl brightness-[0.25]" : "scale-100 blur-0 brightness-[0.94] group-hover:scale-[1.035] group-hover:brightness-100"
          )}
          priority
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),transparent_34%,rgba(0,0,0,0.72)),linear-gradient(90deg,rgba(0,0,0,0.44),transparent_44%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/[0.08]" />

      {/* -----------------------------------------------------------
          LAYER 2: DEFAULT VIEW (Buttons Only)
          Visible when details are CLOSED
      ------------------------------------------------------------ */}
      <div 
        className={cn(
            "absolute inset-0 flex flex-col justify-end p-4 md:p-10 transition-all duration-500",
            isDetailsOpen ? "opacity-0 pointer-events-none translate-y-4" : "opacity-100 translate-y-0"
        )}
      >
        {/* Clickable Area for the main banner (goes to link) */}
        <Link href={targetLink} className="absolute inset-0 z-0" aria-label={`Learn more about ${hero.title}`} />

        {/* Floating Action Bar */}
        <div className="relative z-10 flex items-end justify-between gap-3">
            <div className="min-w-0 pr-2">
                {/* <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/75 backdrop-blur-md md:text-[9px]">
                    <Sparkles size={10} className="text-[#FF0055]" />
                    Featured
                </div> */}
                <h1 className="line-clamp-2 max-w-xl text-2xl font-black leading-[1.12] tracking-tight text-white drop-shadow-2xl md:text-5xl">
                    {hero.title}
                </h1>
                {hero.description && (
                    <p className="mt-2 hidden max-w-lg text-sm font-semibold leading-relaxed text-zinc-200/90 md:line-clamp-2">
                        {hero.description}
                    </p>
                )}
            </div>

            {/* Left: Play Button */}
            <Link 
                href={targetLink}
                className="hidden shrink-0 items-center gap-2 rounded-full bg-[#FF0055] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_24px_rgba(255,0,85,0.34)] transition-transform hover:bg-[#ff1a66] hover:scale-105 active:scale-95 sm:flex md:px-7"
            >
                <span>Learn More</span>
                <ArrowUpRight size={15} />
            </Link>

            {/* Right: Details Button */}
            <button 
                onClick={toggleDetails}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-md transition-all hover:border-white/30 hover:bg-black/65 active:scale-95 md:h-12 md:w-12"
                aria-label="Show banner details"
            >
                <Info className="w-4 h-4 md:w-5 md:h-5" />
            </button>
        </div>
      </div>


      {/* -----------------------------------------------------------
          LAYER 3: DETAILS VIEW (Overlay Content)
          Visible when details are OPEN
      ------------------------------------------------------------ */}
      <div 
        className={cn(
            "absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-500 md:p-12",
            isDetailsOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Close Interaction (Click background to close) */}
        <div className="absolute inset-0" onClick={toggleDetails} />

        {/* Content Card */}
        <div className="relative max-w-2xl w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
            
            {/* Featured Badge */}
            {/* <div className="flex justify-center">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055] flex items-center gap-2 shadow-lg">
                    <Sparkles size={10} /> Premium Selection
                </span>
            </div> */}

            {/* Title */}
            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                {hero.title}
            </h1>

            {/* Description */}
            <p className="text-zinc-300 text-xs md:text-base font-medium leading-relaxed max-w-lg mx-auto line-clamp-3 md:line-clamp-none">
                {hero.description}
            </p>

            {/* Action Buttons in Modal */}
            <div className="flex items-center justify-center gap-3 pt-2">
                <Link 
                    href={targetLink}
                    className="flex h-10 items-center gap-2 rounded-full bg-white px-6 text-xs font-black uppercase tracking-wide text-black transition-transform hover:bg-zinc-200 active:scale-95 md:h-12 md:px-8 md:text-sm"
                >
                    Learn More
                    <ArrowUpRight size={15} />
                </Link>
                
                <button 
                    onClick={toggleDetails}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-white/20 bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                    aria-label="Close Details"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
      </div>

    </div>
  );
}
