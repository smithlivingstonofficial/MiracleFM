import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Disc, Search, Sparkles, Play } from "lucide-react";
import HomeHeader from "@/components/user/home/HomeHeader";
import SquareGridAd from "@/components/ads/SquareGridAd"; // Import the Ad Component
import React from "react"; // Required for React.Fragment

export const revalidate = 60;

export default async function AllAlbumsPage() {
  const supabase = await createClient();

  const [userRes, albumsRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("albums")
      .select("*, artists(name)")
      .order("created_at", { ascending: false })
  ]);

  const user = userRes.data.user;
  const albums = albumsRes.data ||[];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-40 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/90 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-[#FF0055]/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <HomeHeader user={user} />

      <div className="px-4 md:px-12 mt-8 md:mt-12 space-y-12">
        
        {/* Page Title Section */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-white/5 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#FF0055] animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Full Library</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
              All Albums
            </h1>
          </div>

          <Link 
            href="/search" 
            className="group w-full md:w-auto flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-zinc-900/50 border border-white/10 hover:border-[#FF0055]/50 hover:bg-zinc-900 transition-all active:scale-95"
          >
            <Search size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-widest">Search Albums</span>
          </Link>
        </div>

        {/* Albums Grid with Embedded Ads */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12">
          {albums.map((album, i) => (
            <React.Fragment key={album.id}>
              
              {/* Inject Ad after the 4th item (index 3) and 14th item (index 13) */}
              {(i === 3 || i === 14) && (
                <SquareGridAd />
              )}

              <Link 
                href={`/album/${album.id}`} 
                className="group block animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards"
                style={{ animationDelay: `${i * 50}ms`, animationDuration: '700ms' }}
              >
                {/* Premium Card Container */}
                <div className="aspect-square relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-all duration-500 group-hover:border-[#FF0055]/40 group-hover:shadow-[0_10px_40px_-10px_rgba(255,0,85,0.3)] group-hover:-translate-y-2">
                  
                  {album.cover_url ? (
                    <Image 
                      src={album.cover_url} 
                      alt={album.title} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-110" 
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <Disc size={48} />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                     <div className="bg-[#FF0055] p-3 md:p-4 rounded-full shadow-2xl transform scale-50 group-hover:scale-100 transition-all duration-300">
                       <Play fill="white" className="text-white w-5 h-5 md:w-6 md:h-6 ml-0.5" />
                     </div>
                  </div>
                </div>
                
                <div className="mt-4 px-2">
                  <h3 className="font-bold text-white truncate text-sm md:text-lg group-hover:text-[#FF0055] transition-colors">
                    {album.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-zinc-500 font-bold truncate group-hover:text-zinc-300 transition-colors">
                      {album.artists?.name}
                    </p>
                    <span className="hidden md:inline-block w-1 h-1 bg-zinc-700 rounded-full" />
                    <span className="hidden md:inline-block text-[10px] font-mono text-zinc-600">
                      {new Date(album.created_at).getFullYear()}
                    </span>
                  </div>
                </div>
              </Link>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}