"use client";
import Image from "next/image";
import { Play } from "lucide-react";

export default function HeroSection({ banners }: { banners: any[] }) {
  if (!banners || banners.length === 0) return null;

  // For V1, we show the first active banner as the main Hero
  const hero = banners[0]; 

  return (
    <div className="relative w-full h-[400px] md:h-[500px] group overflow-hidden rounded-b-[3rem] md:rounded-[3rem] mx-auto md:w-[95%] mt-4">
      <Image 
        src={hero.image_url} 
        alt={hero.title} 
        fill 
        className="object-cover transition-transform duration-1000 group-hover:scale-105"
        priority
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      
      <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-3xl animate-in slide-in-from-bottom-4 duration-700">
        <span className="px-3 py-1 bg-[#FF0055] text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4 inline-block">
          Featured
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4 leading-none">
          {hero.title}
        </h1>
        <p className="text-zinc-300 text-lg md:text-xl font-medium line-clamp-2 mb-8 max-w-xl">
          {hero.description}
        </p>
        
        <button className="bg-[#FF0055] hover:bg-[#E6004D] text-white px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-3 transition-transform active:scale-95 shadow-xl shadow-[#FF0055]/30">
          <Play fill="currentColor" size={18} />
          Listen Now
        </button>
      </div>
    </div>
  );
}