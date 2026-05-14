import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { Artist } from "@/types/music";

interface PopularArtistsSectionProps {
  artists: Artist[];
}

export default function PopularArtistsSection({ artists }: PopularArtistsSectionProps) {
  return (
    <section className="pb-20 px-4 md:px-8">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8 md:mb-10">
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
          Artists 
        </h2>
      </div>

      {/* Grid Layout (Original Design) */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-8 gap-x-2 md:gap-8">
        {artists.slice(0, 12).map((a) => (
          <Link 
            key={a.id} 
            href={`/artist/${a.id}`} 
            className="flex flex-col items-center group active:scale-95 md:active:scale-100 transition-transform duration-300"
          >
            {/* STORY RING - Strict #FF0055 Theme */}
            <div className="w-[84px] h-[84px] md:w-32 md:h-32 rounded-full p-[3px] md:p-[4px] bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] mb-3 md:mb-4 shadow-[0_0_15px_rgba(255,0,85,0.3)] md:group-hover:shadow-[0_0_25px_rgba(255,0,85,0.6)] transition-all duration-500 relative overflow-hidden">
              
              {/* Rotating animated glow inside the ring */}
              <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0%,#FF0055_50%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-40 mix-blend-overlay" />

              {/* The inner div holds the image */}
              <div className="w-full h-full rounded-full overflow-hidden bg-[#050505] border-[3px] md:border-4 border-[#050505] relative z-10">
                {a.image_url ? (
                  <Image 
                    src={a.image_url} 
                    alt={a.name} 
                    fill 
                    className="object-cover md:filter md:grayscale md:group-hover:grayscale-0 transition-all duration-500 md:scale-100 md:group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-black text-2xl md:text-3xl uppercase">
                    {a.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] md:text-sm font-bold text-center text-zinc-200 md:text-zinc-300 md:group-hover:text-white transition-colors truncate w-full px-1">{a.name}</p>
          </Link>
        ))}
      </div>

      {/* --- STRICT #FF0055 ANIMATED "VIEW ALL" BUTTON --- */}
      <div className="mt-10 md:mt-14 flex justify-center">
        <Link href="/artist" className="group relative inline-flex items-center justify-center active:scale-95 transition-transform duration-300">
          
          {/* #FF0055 Intense Pulse Background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#FF0055]/0 via-[#FF0055] to-[#FF0055]/0 rounded-full blur-lg opacity-40 group-hover:opacity-80 animate-[pulse_2s_ease-in-out_infinite] transition-opacity duration-500" />
          
          {/* Premium Dark Button Surface */}
          <div className="relative bg-[#050505] border border-[#FF0055]/30 group-hover:border-[#FF0055] px-8 py-3.5 rounded-full flex items-center gap-3 transition-all duration-300 shadow-2xl overflow-hidden">
            
            {/* Sweeping Highlight Animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FF0055]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
            
            <span className="relative z-10 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-[#FF0055] group-hover:text-white transition-colors">
              Discover More Artists
            </span>
            <div className="relative z-10 w-6 h-6 rounded-full bg-[#FF0055]/10 border border-[#FF0055]/20 flex items-center justify-center group-hover:bg-[#FF0055] transition-colors duration-300">
              <ArrowRight size={12} className="text-[#FF0055] group-hover:text-white md:group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
