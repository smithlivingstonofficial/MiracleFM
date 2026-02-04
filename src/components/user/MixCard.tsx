"use client";

import Image from "next/image";
import { Sparkles, Music } from "lucide-react";
import CollectionPlayButton from "./CollectionPlayButton";

interface MixCardProps {
  tracks: any[];
  title: string;
  description: string;
}

export default function MixCard({ tracks, title, description }: MixCardProps) {
  // 1. HIERARCHY FALLBACK LOGIC
  // We map every track to its best available image
  const allPossibleImages = tracks.map((t) => {
    return t.cover_url || t.albums?.cover_url || t.artists?.image_url || null;
  });

  // 2. FILTER VALID IMAGES
  // We "leave that track" if it has no images at all
  const validImages = allPossibleImages.filter((url): url is string => !!url && url !== "");

  // 3. ARTIST NAME LOGIC (Clean "Feat." text)
  const artistNames = tracks
    .map(t => t.artists?.name)
    .filter((name, index, self) => !!name && self.indexOf(name) === index) // Unique non-null names
    .slice(0, 3);

  if (tracks.length === 0) return null;

  return (
    <div className="group relative bg-zinc-900/40 border border-white/5 p-6 md:p-8 rounded-[3rem] hover:bg-zinc-900/60 transition-all duration-700 shadow-2xl overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF0055]/10 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center">
        
        {/* DYNAMIC COLLAGE COVER */}
        <div className="relative w-56 h-56 md:w-64 md:h-64 shrink-0 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 bg-zinc-950">
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
            {validImages.length >= 4 ? (
              // Case: 4 or more unique images found in the tracklist
              validImages.slice(0, 4).map((url, i) => (
                <div key={i} className="relative w-full h-full border-[0.5px] border-black/20">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))
            ) : validImages.length > 0 ? (
              // Case: 1-3 images found, show the best one prominently
              <div className="col-span-2 row-span-2 relative">
                <Image src={validImages[0]} alt="" fill className="object-cover" />
              </div>
            ) : (
              // Case: Absolute fallback if the whole mix has zero images
              <div className="col-span-2 row-span-2 flex flex-col items-center justify-center bg-zinc-900">
                <Music size={64} className="text-zinc-800" />
              </div>
            )}
          </div>
          
          {/* Subtle Pink Glass Overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FF0055]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* TEXT CONTENT */}
        <div className="flex-1 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF0055]/10 border border-[#FF0055]/20 text-[#FF0055] text-[10px] font-black uppercase tracking-[0.2em]">
            <Sparkles size={14} className="animate-pulse" /> Your Daily Miracle
          </div>
          
          <div className="space-y-3">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-500 transition-all duration-500">
              {title}
            </h2>
            <p className="text-zinc-400 font-medium text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              {description}
            </p>
          </div>
          
          {/* CLEAN ARTIST LIST */}
          {artistNames.length > 0 && (
            <div className="flex flex-col md:flex-row items-center gap-4 pt-2">
               <div className="flex -space-x-3">
                  {tracks
                    .filter(t => t.artists?.image_url) // Only show avatars for tracks with images
                    .slice(0, 5)
                    .map((t, i) => (
                       <div key={i} className="w-10 h-10 rounded-full border-4 border-[#0a0a0a] overflow-hidden relative shadow-xl">
                          <Image src={t.artists.image_url} alt="" fill className="object-cover" />
                       </div>
                  ))}
               </div>
               <p className="text-sm font-bold text-zinc-500">
                 Featuring <span className="text-zinc-200">{artistNames.join(", ")}</span> and more
               </p>
            </div>
          )}
        </div>

        {/* PLAY BUTTON */}
        <div className="shrink-0 flex flex-col items-center gap-4">
          <div className="scale-125 md:scale-[1.5] transition-transform duration-500 group-hover:rotate-[360deg]">
            <CollectionPlayButton tracks={tracks} size="large" />
          </div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-4">Start Session</span>
        </div>
      </div>
    </div>
  );
}