import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/user/HeroSection";
import PlaylistCover from "@/components/user/PlaylistCover";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = await createClient();

  const [bannersRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
    supabase.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").limit(6),
    supabase.from("artists").select("*").limit(10),
    supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-8 md:space-y-12 pb-32 animate-in fade-in duration-700">
      
      {/* 1. Hero Section (Responsive Wrapper) */}
      <div className="relative group">
         <div className="absolute inset-x-0 -top-20 md:-top-40 -z-10 h-[400px] md:h-[600px] bg-[#FF0055]/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none" />
         <HeroSection banners={bannersRes.data || []} />
      </div>

      <div className="px-4 md:px-12 space-y-12 md:space-y-16">
        
        {/* 2. Curated Playlists (Mobile: Scroll, Desktop: Grid) */}
        <section>
          <div className="flex items-end justify-between mb-4 md:mb-6 px-1">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter">Curated For You</h2>
              <p className="text-zinc-500 text-xs md:text-sm font-medium mt-1">Hand-picked worship for your soul.</p>
            </div>
          </div>
          
          <div className="flex md:grid overflow-x-auto md:overflow-visible gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(playlistsRes.data || []).map((playlist) => (
              <Link 
                key={playlist.id} 
                href={`/playlist/${playlist.id}`} 
                className="min-w-[140px] md:min-w-0 snap-start group block"
              >
                <div className="aspect-square relative rounded-2xl md:rounded-[2rem] overflow-hidden bg-zinc-900 shadow-lg transition-transform duration-500 group-hover:-translate-y-2 group-hover:shadow-[#FF0055]/10">
                  <PlaylistCover 
                    playlistId={playlist.id} 
                    explicitCover={playlist.cover_url} 
                    className="w-full h-full"
                  />
                </div>
                
                <div className="mt-3 px-1">
                  <h3 className="font-bold text-white truncate text-sm md:text-base group-hover:text-[#FF0055] transition-colors">{playlist.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">Playlist</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. New Releases (Horizontal Scroll) */}
        <section>
          <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter">New Releases</h2>
            <Link href="/browse" className="flex items-center gap-1 text-[10px] md:text-xs font-black text-zinc-500 hover:text-[#FF0055] transition-colors uppercase tracking-widest">
              View All <ChevronRight size={12} />
            </Link>
          </div>
          
          <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(albumsRes.data || []).map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="min-w-[150px] md:min-w-[220px] snap-start group block">
                <div className="aspect-square relative rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-xl group-hover:opacity-90 transition-all border border-white/5">
                  {album.cover_url && (
                    <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="(max-width: 768px) 40vw, 20vw" />
                  )}
                </div>
                <div className="mt-3 md:mt-4 px-1">
                  <h3 className="font-bold text-white truncate text-sm md:text-lg">{album.title}</h3>
                  <p className="text-xs md:text-sm text-zinc-500 font-bold">{album.artists?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Popular Artists (Circles) */}
        <section>
          <h2 className="text-xl md:text-3xl font-black text-white mb-6 md:mb-10 tracking-tighter px-1">Popular Artists</h2>
          <div className="flex gap-6 md:gap-10 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {(artistsRes.data || []).map((artist) => (
              <Link key={artist.id} href={`/artist/${artist.id}`} className="min-w-[100px] md:min-w-[160px] text-center group block">
                <div className="w-[100px] h-[100px] md:w-[160px] md:h-[160px] relative rounded-full overflow-hidden mb-3 md:mb-5 mx-auto border-2 md:border-4 border-zinc-900 group-hover:border-[#FF0055] transition-all duration-500 shadow-2xl">
                  {artist.image_url ? (
                    <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 font-black text-2xl">
                       {artist.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-xs md:text-lg group-hover:text-[#FF0055] transition-colors truncate px-1">{artist.name}</h3>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}