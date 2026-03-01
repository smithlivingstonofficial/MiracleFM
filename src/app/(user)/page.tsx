// src/app/(user)/page.tsx

import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/user/HeroSection";
import PlaylistCover from "@/components/user/PlaylistCover";
import MixCard from "@/components/user/MixCard";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles, Play, Music4, Search, Bell, Disc, Mic2, ArrowRight } from "lucide-react";

export const revalidate = 0; 

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Data Fetching
  const [bannersRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
    supabase.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").is("user_id", null).limit(6),
    supabase.from("artists").select("*").limit(12),
    supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  // 2. Daily Mix Logic
  let dailyMix: any[] =[];
  if (user) {
    const { data: mixData } = await supabase.rpc('get_personalized_mix', { uid: user.id, limit_count: 20 });
    if (mixData && mixData.length > 0) {
      const { data: enrichedTracks } = await supabase
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .in("id", mixData.map((t: any) => t.id));
      dailyMix = enrichedTracks ||[];
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[500px] md:h-[600px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] right-[-50px] md:top-[-200px] md:right-[-100px] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#FF0055]/10 md:bg-[#FF0055]/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="flex items-center gap-3 md:gap-4">
           {user && (
             <Link href="/profile" className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden border border-white/10 active:scale-90 md:hover:border-[#FF0055] transition-all relative shadow-lg">
               {user.user_metadata?.avatar_url ? (
                 <Image src={user.user_metadata.avatar_url} alt="User" fill className="object-cover" />
               ) : (
                 <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                     {user.email?.charAt(0).toUpperCase()}
                 </div>
               )}
             </Link>
           )}
           <div className="flex flex-col justify-center">
             <div className="flex items-center gap-1.5 mb-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055] animate-pulse" />
               <p className="text-zinc-400 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em]">Premium</p>
             </div>
             <h2 className="text-white font-black text-base md:text-lg leading-none tracking-tight">{greeting}</h2>
           </div>
        </div>
        <div className="flex gap-2">
           <Link href="/search" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-300 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300">
              <button className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-300 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300">
                  <Search size={16} />
              </button>
           </Link>
           <button className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-zinc-300 active:scale-90 md:hover:text-white md:hover:bg-[#FF0055] md:hover:border-[#FF0055] transition-all duration-300 relative">
               <Bell size={16} />
               <span className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-2 h-2 bg-[#FF0055] rounded-full border border-[#050505]"></span>
           </button>
        </div>
      </header>

      {/* --- GRID LAYOUT: HERO & MIX CARD --- */}
      <div className="px-4 md:px-8 mt-4 md:mt-6 mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 w-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
             <HeroSection banners={bannersRes.data ||[]} />
          </div>

          {user && dailyMix.length > 0 && (
             <div className="lg:col-span-1 w-full h-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
               <MixCard 
                 tracks={dailyMix}
                 title="Daily Mix"
                 description="Fresh tunes for your spirit."
               />
             </div>
          )}
        </div>
      </div>

      {/* --- REST OF SECTIONS --- */}
      <div className="space-y-16 md:space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-forwards">
        
        {/* --- SECTION: EDITORIAL PICKS (Playlists) --- */}
        <section className="px-4 md:px-8">
          <div className="flex justify-between items-end mb-5 md:mb-6">
             <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
                    Curated For You <Sparkles size={16} className="text-[#FF0055]" />
                </h2>
             </div>
             <Link href="/library" className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 active:text-white md:hover:text-white transition-colors py-1">
                 View All <ChevronRight size={14} />
             </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
             {(playlistsRes.data ||[]).map(p => (
                <Link key={p.id} href={`/playlist/${p.id}`} className="group flex flex-col gap-2 md:gap-3 active:scale-95 md:active:scale-100 transition-transform duration-300">
                   <div className="aspect-square relative rounded-2xl md:rounded-[2rem] overflow-hidden bg-zinc-900 shadow-lg border border-white/5 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)] md:group-hover:border-[#FF0055]/30 md:group-hover:-translate-y-1.5 transition-all duration-500">
                      
                      <PlaylistCover playlistId={p.id} explicitCover={p.cover_url} className="w-full h-full md:transform md:transition-transform md:duration-700 md:group-hover:scale-110" />
                      
                      <div className="hidden md:block absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />
                      
                      <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <div className="bg-[#FF0055] p-4 rounded-full text-white shadow-xl shadow-black/50 hover:scale-110 hover:bg-[#ff1a66] transition-all">
                          <Play fill="currentColor" className="w-6 h-6 ml-1" />
                        </div>
                      </div>
                   </div>

                   <div className="px-1">
                       <p className="font-bold text-sm md:text-base text-zinc-100 truncate md:group-hover:text-[#FF0055] transition-colors">{p.title}</p>
                       <div className="flex items-center gap-1.5 mt-0.5 opacity-80 md:opacity-60 md:group-hover:opacity-100 transition-opacity">
                           <Music4 size={10} className="text-[#FF0055] md:text-zinc-500" />
                           <p className="text-[9px] md:text-[10px] text-zinc-400 md:text-zinc-500 font-bold uppercase tracking-widest">Playlist</p>
                       </div>
                   </div>
                </Link>
             ))}
          </div>
        </section>

        {/* --- SECTION: NEW RELEASES (Albums) --- */}
        <section>
          <div className="flex justify-between items-end mb-5 md:mb-6 px-4 md:px-8">
             <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white">Albums</h2>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar pl-4 md:pl-8 pr-4 md:pr-8">
             {(albumsRes.data ||[]).map((a, i, arr) => (
               <Link 
                 key={a.id} 
                 href={`/album/${a.id}`} 
                 className={`min-w-[140px] w-[140px] md:min-w-[200px] md:w-[200px] snap-start group flex flex-col gap-2 md:gap-3 active:scale-95 md:active:scale-100 transition-transform duration-300 ${i === arr.length - 1 ? 'pr-4 md:pr-0' : ''}`}
               >
                 <div className="aspect-square relative rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-md md:group-hover:shadow-[0_10px_25px_rgba(255,0,85,0.15)] md:group-hover:border-[#FF0055]/30 md:group-hover:-translate-y-1 transition-all duration-500">
                    
                    {a.cover_url ? (
                        <Image src={a.cover_url} alt={a.title} fill className="object-cover md:transition-transform md:duration-700 md:group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Disc size={40} className="text-zinc-600" /></div>
                    )}

                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                 </div>

                 <div className="px-1">
                     <p className="font-bold text-sm md:text-base text-zinc-100 truncate md:group-hover:text-white transition-colors">{a.title}</p>
                     <p className="text-[10px] md:text-xs text-zinc-400 md:text-zinc-500 font-bold uppercase tracking-wider truncate mt-0.5">{a.artists?.name}</p>
                 </div>
               </Link>
             ))}
          </div>
        </section>
        
         {/* --- SECTION: TOP ARTISTS (Strict #FF0055 Theme + 3x3 Grid) --- */}
         <section className="pb-10 px-4 md:px-8">
          <div className="flex justify-between items-end mb-8 md:mb-10">
             <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
               Artists 
               {/* <Mic2 size={16} className="text-[#FF0055]" /> */}
             </h2>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-8 gap-x-2 md:gap-8">
             {(artistsRes.data ||[]).slice(0, 9).map((a) => (
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
             <Link href="/library" className="group relative inline-flex items-center justify-center active:scale-95 transition-transform duration-300">
                
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

      </div>
    </div>
  );
}