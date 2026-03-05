import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Mic2, Sparkles, Search } from "lucide-react";
import HomeHeader from "@/components/user/home/HomeHeader";

export const revalidate = 60;

export default async function AllArtistsPage() {
  const supabase = await createClient();

  // 1. Fetch User & Artists in Parallel
  const [userRes, artistsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("artists").select("*").order("name", { ascending: true })
  ]);

  const user = userRes.data.user;
  const artists = artistsRes.data || [];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-40 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/90 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] bg-[#FF0055]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* 1. Header (Reused from Home) */}
      <HomeHeader user={user} />

      <div className="px-4 md:px-12 mt-8 md:mt-12 space-y-12">
        
        {/* 2. Page Title Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-white/5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#FF0055] animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Full Roster</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Discover Artists
            </h1>
          </div>

          {/* Quick Search Button */}
          <Link 
            href="/search" 
            className="group w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-zinc-900/50 border border-white/10 hover:border-[#FF0055]/50 hover:bg-zinc-900 transition-all active:scale-95"
          >
            <Search size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-widest">Search Roster</span>
          </Link>
        </div>

        {/* 3. Artists Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-16">
          {artists.map((artist, i) => (
            <Link 
              key={artist.id} 
              href={`/artist/${artist.id}`} 
              className="flex flex-col items-center group active:scale-95 transition-transform duration-300 animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
              style={{ animationDelay: `${i * 50}ms`, animationDuration: '700ms' }} // Staggered animation
            >
              {/* Premium Avatar Container */}
              <div className="relative w-32 h-32 md:w-44 md:h-44 mb-4 md:mb-6">
                
                {/* Rotating Glow Ring (Visible on Hover) */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-[#FF0055] to-transparent rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                
                {/* Border Ring */}
                <div className="absolute inset-0 rounded-full border-[3px] md:border-4 border-zinc-800 group-hover:border-[#FF0055] transition-colors duration-500 z-10" />

                {/* Image Wrapper */}
                <div className="absolute inset-[3px] md:inset-[4px] rounded-full overflow-hidden bg-[#050505] z-10">
                  {artist.image_url ? (
                    <Image 
                      src={artist.image_url} 
                      alt={artist.name} 
                      fill 
                      className="object-cover md:filter md:grayscale md:group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-110" 
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                       <Mic2 size={32} />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Text Info */}
              <div className="text-center w-full px-1">
                <h3 className="font-black text-white text-sm md:text-lg group-hover:text-[#FF0055] transition-colors truncate w-full leading-tight">
                  {artist.name}
                </h3>
                <div className="mt-2 inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-white/5 border border-white/5 group-hover:border-[#FF0055]/20 transition-colors">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-400">
                    Artist
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}