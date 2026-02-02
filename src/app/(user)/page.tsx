import { createClient } from "@/lib/supabase/server";
import HeroSection from "@/components/user/HeroSection";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

export const revalidate = 60; // ISR: Re-generate page every 60s

export default async function HomePage() {
  const supabase = await createClient();

  const [bannersRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
    supabase.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("playlists").select("*").limit(6),
    supabase.from("artists").select("*").limit(10),
    supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Banner Slider */}
      <HeroSection banners={bannersRes.data || []} />

      <div className="px-6 md:px-12 space-y-16">
        
        {/* Playlists Grid */}
        <section>
          <h2 className="text-2xl font-black text-white mb-6 tracking-tight">Curated For You</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {(playlistsRes.data || []).map((playlist) => (
              <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group space-y-3 cursor-pointer block">
                <div className="aspect-square relative rounded-2xl overflow-hidden bg-zinc-900 shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                  {playlist.cover_url ? (
                    <Image src={playlist.cover_url} alt={playlist.title} fill className="object-cover" sizes="20vw" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-[#FF0055] p-3 rounded-full shadow-xl transform scale-50 group-hover:scale-100 transition-all duration-300">
                      <Play fill="white" className="text-white" size={20} />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white truncate">{playlist.title}</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Playlist</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* New Albums Row */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">New Releases</h2>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory no-scrollbar">
            {(albumsRes.data || []).map((album) => (
              <Link key={album.id} href={`/album/${album.id}`} className="min-w-[160px] md:min-w-[200px] snap-start group space-y-3 block">
                <div className="aspect-square relative rounded-2xl overflow-hidden bg-zinc-900 shadow-lg group-hover:opacity-80 transition-opacity">
                  {album.cover_url && <Image src={album.cover_url} alt={album.title} fill className="object-cover" sizes="20vw" />}
                </div>
                <div>
                  <h3 className="font-bold text-white truncate text-sm md:text-base">{album.title}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{album.artists?.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Artists Circles */}
        <section>
          <h2 className="text-2xl font-black text-white mb-6 tracking-tight">Popular Artists</h2>
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
            {(artistsRes.data || []).map((artist) => (
              <Link key={artist.id} href={`/artist/${artist.id}`} className="min-w-[140px] text-center group block">
                <div className="w-[140px] h-[140px] relative rounded-full overflow-hidden mb-4 mx-auto border-2 border-transparent group-hover:border-[#FF0055] transition-all">
                  {artist.image_url && <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />}
                </div>
                <h3 className="font-bold text-white group-hover:text-[#FF0055] transition-colors">{artist.name}</h3>
                <p className="text-[10px] font-black uppercase text-zinc-600 mt-1">Artist</p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}