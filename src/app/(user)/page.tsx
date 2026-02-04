// src/app/(user)/page.tsx

import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/user/HeroSection";
import PlaylistCover from "@/components/user/PlaylistCover";
import MixCard from "@/components/user/MixCard";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Sparkles, User, Play, Music4 } from "lucide-react";

export const revalidate = 0; // Keeping it dynamic for personalized content

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Parallel Fetching for core sections
  const [bannersRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
    supabase.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").is("user_id", null).limit(6),
    supabase.from("artists").select("*").limit(12),
    supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  // 2. Specialized Logic for Personalized "Daily Mix"
  let dailyMix: any[] = [];
  if (user) {
    // A. Run the algorithm to get IDs
    const { data: mixData } = await supabase.rpc('get_personalized_mix', { 
      uid: user.id, 
      limit_count: 20 
    });
    
    if (mixData && mixData.length > 0) {
      // B. ENRICH: Fetch full objects with Album/Artist joins for the image fallback logic
      const { data: enrichedTracks } = await supabase
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .in("id", mixData.map((t: any) => t.id));
      
      dailyMix = enrichedTracks || [];
    }
  }

  // 3. Greeting Logic
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-6 md:space-y-10 pb-32 animate-in fade-in duration-1000">
      
      {/* --- SECTION 1: PREMIUM GREETING & HERO --- */}
      <div className="relative">
         {/* Atmospheric Background Glow */}
         <div className="absolute inset-x-0 -top-40 -z-10 h-[600px] bg-gradient-to-b from-[#FF0055]/10 via-transparent to-transparent blur-[120px] pointer-events-none" />
         
         <header className="px-6 md:px-12 pt-10 pb-6 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-4 bg-[#FF0055] rounded-full shadow-[0_0_10px_#FF0055]" />
                <span className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[9px]">Miracle FM Premium</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-tight">
                {greeting}{user ? `, ${user.email?.split('@')[0]}` : ''}
              </h1>
            </div>
            
            {user && (
              <Link href="/profile" className="group relative">
                <div className="absolute inset-0 bg-[#FF0055] blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-[#FF0055] font-black text-xl shadow-2xl transition-all active:scale-90 overflow-hidden">
                  {user.user_metadata?.avatar_url ? (
                    <Image 
                      src={user.user_metadata.avatar_url} 
                      alt="Profile" 
                      width={56} // Specify sizes for smaller avatars
                      height={56}
                      className="object-cover rounded-2xl" 
                    />
                  ) : (
                    user.email?.charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
            )}
         </header>

         {/* Featured Banner Slider */}
         <div className="px-0 md:px-4">
           <HeroSection banners={bannersRes.data || []} />
         </div>
      </div>

      <div className="px-4 md:px-12 space-y-20 md:space-y-28">
        
        {/* --- SECTION 2: PERSONALIZED DAILY MIX (The Highlight) --- */}
        {user && dailyMix.length > 0 && (
          <section className="animate-in slide-in-from-bottom-8 duration-1000 delay-200">
            <MixCard 
              tracks={dailyMix}
              title="Your Daily Mix"
              description="Heavenly sounds curated for your spiritual journey, refreshed daily based on your preferences."
            />
          </section>
        )}

        {/* --- SECTION 3: CURATED EDITORIAL COLLECTIONS --- */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">Curated For You</h2>
              <p className="text-zinc-500 text-xs md:text-sm font-medium mt-1 uppercase tracking-widest opacity-80">Miracle FM Editorial Picks</p>
            </div>
            <Link href="/library" className="hidden md:flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-[#FF0055] transition-all uppercase tracking-widest border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8">
            {(playlistsRes.data || []).map((playlist) => (
              <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group block">
                <div className="aspect-square relative rounded-[2rem] overflow-hidden bg-zinc-900 shadow-2xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[#FF0055]/20 border border-white/5">
                  <PlaylistCover 
                    playlistId={playlist.id} 
                    explicitCover={playlist.cover_url} 
                    className="w-full h-full"
                  />
                  {/* Glass Hover Overlay */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-[#FF0055]/10 transition-colors duration-500" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 backdrop-blur-[2px]">
                    <div className="bg-white p-3 rounded-full text-black shadow-2xl">
                      <Play fill="black" size={20} className="ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="mt-4 px-2">
                  <h3 className="font-bold text-white truncate text-base group-hover:text-[#FF0055] transition-colors">{playlist.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Music4 size={10} className="text-zinc-600" />
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Playlist</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* --- SECTION 4: NEW RELEASES (Horizontal Scroll) --- */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">New Releases</h2>
          </div>
          
          <div className="flex gap-6 md:gap-8 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(albumsRes.data || []).map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="min-w-[180px] md:min-w-[260px] snap-start group block">
                <div className="aspect-square relative rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-xl border border-white/5 transition-all duration-500 group-hover:border-[#FF0055]/30">
                  {album.cover_url && (
                    <Image 
                      src={album.cover_url} 
                      alt={album.title} 
                      fill 
                      className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                  )}
                  {/* Subtle Vinyl Shine */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-5 px-2">
                  <h3 className="font-bold text-white truncate text-base md:text-lg group-hover:text-[#FF0055] transition-colors">{album.title}</h3>
                  <p className="text-sm text-zinc-500 font-bold mt-1">{album.artists?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* --- SECTION 5: POPULAR ARTISTS (Premium Circles) --- */}
        <section className="pb-20">
          <div className="flex items-center gap-4 mb-12 px-2">
            <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">Your Favorite Artists</h2>
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>
          
          <div className="flex gap-8 md:gap-14 overflow-x-auto pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(artistsRes.data || []).map((artist) => (
              <Link key={artist.id} href={`/artist/${artist.id}`} className="min-w-[120px] md:min-w-[180px] text-center group block">
                <div className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] relative rounded-full overflow-hidden mb-6 mx-auto border-[6px] border-zinc-900 group-hover:border-[#FF0055] transition-all duration-700 shadow-2xl group-hover:shadow-[#FF0055]/20">
                  {artist.image_url ? (
                    <Image 
                      src={artist.image_url} 
                      alt={artist.name} 
                      fill 
                      className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 font-black text-3xl uppercase">
                       {artist.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-base md:text-xl group-hover:text-[#FF0055] transition-colors truncate px-2">{artist.name}</h3>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[8px] font-black text-zinc-500 uppercase tracking-widest">Artist Profile</span>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}