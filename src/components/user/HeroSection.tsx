// src/components/user/HeroSection.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Info, X, Sparkles } from "lucide-react";
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
      className="relative w-full aspect-video group overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-black/50 mx-auto border border-white/5 bg-[#050505] select-none"
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
            isDetailsOpen ? "scale-110 blur-xl brightness-[0.25]" : "scale-100 blur-0 brightness-100 group-hover:scale-105"
          )}
          priority
        />
      </div>

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

        {/* Gradient for text contrast */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Floating Action Bar */}
        <div className="relative z-10 flex items-center justify-between">
            {/* Left: Play Button */}
            <Link 
                href={targetLink}
                className="flex items-center gap-3 bg-[#FF0055] hover:bg-[#ff1a66] text-white px-5 py-2.5 md:px-8 md:py-3.5 rounded-full font-black text-xs md:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,0,85,0.4)] transition-transform active:scale-95 hover:scale-105"
            >
                {/* <Play fill="currentColor" className="w-4 h-4 md:w-5 md:h-5" /> */}
                <span>Learn More</span>
            </Link>

            {/* Right: Details Button */}
            <button 
                onClick={toggleDetails}
                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-2.5 md:px-6 md:py-3.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all hover:border-white/30 active:scale-95"
            >
                <Info className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden md:inline">Details</span>
            </button>
        </div>
      </div>


      {/* -----------------------------------------------------------
          LAYER 3: DETAILS VIEW (Overlay Content)
          Visible when details are OPEN
      ------------------------------------------------------------ */}
      <div 
        className={cn(
            "absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 md:p-12 transition-all duration-500",
            isDetailsOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Close Interaction (Click background to close) */}
        <div className="absolute inset-0" onClick={toggleDetails} />

        {/* Content Card */}
        <div className="relative max-w-2xl w-full space-y-4 md:space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
            
            {/* Featured Badge */}
            <div className="flex justify-center">
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055] flex items-center gap-2 shadow-lg">
                    <Sparkles size={10} /> Premium Selection
                </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
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
                    className="h-10 px-6 md:h-12 md:px-8 bg-white text-black hover:bg-zinc-200 rounded-full font-black text-xs md:text-sm uppercase tracking-wide flex items-center gap-2 transition-transform active:scale-95"
                >
                    {/* <Play fill="black" size={16} />  */}
                    Learn More
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
