// src/components/user/MixCard.tsx

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sparkles, Music } from "lucide-react";
import CollectionPlayButton from "./CollectionPlayButton";
import type { Track } from "@/types/music";

interface MixCardProps {
  tracks: Track[];
  title: string;
  description: string;
  badgeText?: string;
  href?: string;
}

export default function MixCard({ tracks, title, description, badgeText = "Daily", href }: MixCardProps) {
  const router = useRouter();
  // 1. EXTRACT UNIQUE IMAGES
  // We use a Set to ensure we don't have duplicates
  const uniqueImages = Array.from(new Set(
    tracks
      .map((t) => t.cover_url || t.albums?.cover_url || t.artists?.image_url)
      .filter((url): url is string => !!url && url !== "")
  ));

  // 2. EXTRACT UNIQUE ARTISTS (Max 3 for the top stack)
  const uniqueArtists = tracks
    .filter((t) => t.artists?.image_url)
    .map((t) => t.artists)
    .filter((artist): artist is { name: string; image_url: string } => Boolean(artist?.name && artist.image_url))
    .filter((artist, i, allArtists) => allArtists.findIndex((candidate) => candidate.name === artist.name) === i)
    .slice(0, 3);

  if (tracks.length === 0) return null;

  // 3. RENDER HELPER FOR GRID CELLS
  // This decides how the grid looks based on image count
  const renderGrid = () => {
    const count = uniqueImages.length;
    
    // Fallback if NO images
    if (count === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <Music size={40} className="text-zinc-700" />
            </div>
        );
    }

    // Logic to fill the 2x2 grid (4 slots)
    // If we have 1 image, it takes all slots.
    // If we have 4+, we take the first 4.
    const displayImages = uniqueImages.slice(0, 4);

    return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5 bg-black">
            {displayImages.map((url, i) => {
                // Determine span classes based on total count
                let spanClass = "col-span-1 row-span-1";
                
                if (count === 1) spanClass = "col-span-2 row-span-2"; // 1 Big Image
                else if (count === 2) spanClass = "col-span-1 row-span-2"; // 2 Vertical Split
                else if (count === 3 && i === 0) spanClass = "col-span-1 row-span-2"; // 1 Big Left
                
                return (
                    <div key={i} className={`relative w-full h-full overflow-hidden ${spanClass}`}>
                        <Image 
                            src={url} 
                            alt="Mix Art" 
                            fill 
                            className="object-cover hover:scale-110 transition-transform duration-700" 
                        />
                    </div>
                );
            })}
        </div>
    );
  };

  return (
    <div
      onClick={() => href && router.push(href)}
      className={`group relative w-full bg-[#0A0A0A] border border-white/10 rounded-lg overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.26)] flex flex-col transition-colors md:hover:border-[#FF0055]/30 md:hover:bg-white/[0.035] ${href ? "cursor-pointer" : ""}`}
      role={href ? "link" : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={(event) => {
        if (!href) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      aria-label={href ? `Open ${title}` : undefined}
    >
      
      {/* --- HEADER (Top Row: Text Left, Controls Right) --- */}
      <div className="flex items-start justify-between p-3 pb-2 md:p-4 md:pb-3">
         
         {/* Left: Text Info */}
         <div className="space-y-2 pr-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#FF0055]/10 border border-[#FF0055]/20 text-[#FF0055] text-[9px] font-black uppercase tracking-[0.18em]">
                <Sparkles size={10} className="animate-pulse" /> {badgeText}
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-[1.12]">{title}</h2>
                <p className="text-zinc-400 text-[10px] font-bold mt-1 line-clamp-1">{description}</p>
            </div>
         </div>

         {/* Right: Controls (Play + Avatars) */}
         <div className="flex flex-col items-end gap-3">
             
             {/* Play Button */}
             <div className="relative group/play" onClick={(event) => event.stopPropagation()}>
                <div className="absolute inset-0 bg-[#FF0055] rounded-full blur opacity-40 group-hover/play:opacity-80 animate-pulse" />
                <div className="relative z-10 bg-[#FF0055] hover:bg-[#ff1a66] rounded-full p-0.5 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer">
                    <CollectionPlayButton tracks={tracks} size="default" />
                </div>
             </div>

             {/* Mini Artist Stack */}
             <div className="flex -space-x-2">
                {uniqueArtists.map((artist, i) => (
                    <div key={i} className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-[#0A0A0A] bg-zinc-800 relative overflow-hidden shadow-sm">
                        {artist.image_url && <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />}
                    </div>
                ))}
             </div>
         </div>
      </div>

      {/* --- BODY (Square Art Grid) --- */}
      <div className="relative w-full aspect-square mt-2 border-t border-white/5">
         {renderGrid()}
         
         {/* Optional: Song Count Overlay on bottom right of the image */}
         <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-md">
             <span className="text-[10px] font-black text-white uppercase tracking-widest">{tracks.length} Songs</span>
         </div>
      </div>

    </div>
  );
}
