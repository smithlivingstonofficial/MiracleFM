import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Play, CheckCircle2, Music4, Disc } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import StartRadio from "@/components/user/StartRadio";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import ShareButton from "@/components/user/ShareButton";
import FollowArtistButton from "@/components/user/FollowArtistButton";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import { absoluteUrl, compactObject, DEFAULT_IMAGE, SITE_NAME } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: artist } = await supabase
    .from("artists")
    .select("name, image_url, bio")
    .eq("id", id)
    .single();

  if (!artist) return { title: "Artist" };

  const description = artist.bio || `Listen to ${artist.name}'s Tamil Christian worship songs on Miracle FM.`;

  return {
    title: `${artist.name} Songs`,
    description,
    alternates: {
      canonical: `/artist/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${artist.name} Songs | ${SITE_NAME}`,
      description,
      url: `/artist/${id}`,
      type: "profile",
      images: [{ url: artist.image_url || DEFAULT_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artist.name} Songs | ${SITE_NAME}`,
      description,
      images: [artist.image_url || DEFAULT_IMAGE],
    },
  };
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Parallel Data Fetching
  const[artistRes, topTracksRes, albumsRes] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).single(),
    supabase
      .from("tracks")
      .select("*, albums(id, title, cover_url), artists(id, name, image_url)")
      .eq("artist_id", id)
      .eq("audio_status", "ready")
      .order('play_count', { ascending: false })
      .limit(10),
    supabase.from("albums").select("*").eq("artist_id", id).order("created_at", { ascending: false })
  ]);

  const artist = artistRes.data;
  const topTracks = topTracksRes.data || [];
  const albums = albumsRes.data ||[];

  if (!artist) return notFound();

  // 2. Extract unique genres from the Array field for the Radio
  const genres = Array.from(new Set(
    topTracks
      .flatMap(t => t.genre ||[])
      .filter(g => typeof g === 'string')
  ));
  const artistDescription = artist.bio || `Listen to ${artist.name}'s Tamil Christian worship songs on Miracle FM.`;
  const artistJsonLd = compactObject({
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.name,
    url: absoluteUrl(`/artist/${id}`),
    image: absoluteUrl(artist.image_url || DEFAULT_IMAGE),
    description: artistDescription,
    album: albums.map((album) =>
      compactObject({
        "@type": "MusicAlbum",
        name: album.title,
        url: album.id ? absoluteUrl(`/album/${album.id}`) : undefined,
        image: album.cover_url ? absoluteUrl(album.cover_url) : undefined,
      })
    ),
    track: topTracks.map((track) =>
      compactObject({
        "@type": "MusicRecording",
        name: track.title,
        url: absoluteUrl(`/song/${track.id}`),
      })
    ),
  });

  return (
    <div className="bg-[#050505] min-h-screen pb-40 relative overflow-x-hidden text-white selection:bg-[#FF0055] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(artistJsonLd) }}
      />
      
      {/* --- 1. IMMERSIVE HERO SECTION --- */}
      <div className="relative w-full pt-6 md:pt-16 pb-4 md:pb-7 flex flex-col items-center md:items-start justify-end px-4 md:px-8">
        
        {/* Cinematic Background Blur */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {artist.image_url ? (
            <Image 
                src={artist.image_url} 
                alt={artist.name} 
                fill 
                className="object-cover opacity-50 blur-[80px] scale-150 saturate-150" 
                priority 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-[#050505]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/78 to-[#050505]/28" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-7">
          
          {/* Circular Avatar with Glowing Ring */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full p-[3px] bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] shadow-[0_0_24px_rgba(255,0,85,0.24)] shrink-0 animate-in zoom-in duration-700">
             <div className="absolute inset-[-10%] bg-[conic-gradient(from_0deg,transparent_0%,#FF0055_50%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-40 mix-blend-overlay rounded-full" />
             <div className="w-full h-full rounded-full overflow-hidden bg-[#050505] border-[4px] border-[#050505] relative z-10 shadow-inner">
                {artist.image_url ? (
                  <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500"><Music4 size={48} /></div>
                )}
             </div>
          </div>

          {/* Typography */}
          <div className="text-center md:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-1.5 mb-2">
              <CheckCircle2 size={16} className="text-[#FF0055] fill-current" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-200">Verified Artist</span>
            </div>
            <h1 className="break-words text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.94] drop-shadow-2xl">
              {artist.name}
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm font-medium mt-3 max-w-2xl line-clamp-2 leading-relaxed px-4 md:px-0">
              {artist.bio || "Bringing heavenly sounds to your soul. Listen to the latest releases and top tracks."}
            </p>
          </div>
        </div>
      </div>

      {/* --- 2. ACTION BAR --- */}
      <div className="relative z-20 px-4 md:px-8 mt-3 md:mt-5">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 md:gap-4">
          
          <div className="active:scale-95 transition-transform duration-300 shadow-[0_0_20px_rgba(255,0,85,0.3)] rounded-full">
             <CollectionPlayButton tracks={topTracks} size="default" />
          </div>
          
          <div className="active:scale-95 transition-transform duration-300">
             <StartRadio genres={genres} artistId={id} />
          </div>

          <FollowArtistButton artistId={id} />

          <ShareButton title={artist.name} className="h-10 w-10 backdrop-blur-md" iconSize={18} label="Share artist" />
        </div>
      </div>

      <div className="px-4 md:px-8 mt-7 md:mt-10 space-y-8 md:space-y-10 relative z-10">
        
        {/* --- 3. POPULAR TRACKS --- */}
        {topTracks.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-6 md:mb-8 tracking-tighter">
              Popular
            </h2>
            <div className="space-y-1">
              {topTracks.map((track, i) => (
                <div key={track.id}>
                  <div className="active:scale-[0.99] md:active:scale-100 transition-transform duration-300">
                    <TrackRow track={track} index={i} allTracks={topTracks} />
                  </div>
                  {shouldRenderSongListAdAfter(i, topTracks.length) && <SongListAdRow fallbackIndex={i} />}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- ADVERTISEMENT BANNER --- */}
        {/* Inserted cleanly between Tracks and Albums with animation */}
        {topTracks.length > 3 && topTracks.length < 8 && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <ResponsiveAd variant="banner" className="px-0 md:px-0" />
          </section>
        )}

        {/* --- 4. DISCOGRAPHY (ALBUMS) --- */}
        {albums.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
            <div className="flex items-end justify-between mb-4 md:mb-5">
               <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Releases</h2>
            </div>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-5 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {albums.map((album, i, arr) => (
                <Link 
                    key={album.id} 
                    href={`/album/${album.id}`} 
                    className={`min-w-[132px] w-[132px] md:min-w-[170px] md:w-[170px] snap-start group flex flex-col gap-2 active:scale-95 md:active:scale-100 transition-transform duration-300 ${i === arr.length - 1 ? 'pr-4 md:pr-0' : ''}`}
                >
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-zinc-900 shadow-lg border border-white/5 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)] md:group-hover:border-[#FF0055]/30 md:group-hover:-translate-y-1 transition-all duration-300">
                    
                    {album.cover_url ? (
                      <Image 
                        src={album.cover_url} 
                        alt={album.title} 
                        fill 
                        className="object-cover md:transition-transform md:duration-700 md:group-hover:scale-110" 
                        sizes="(max-width: 768px) 150px, 220px" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Disc size={40} className="text-zinc-600"/></div>
                    )}
                    
                    <div className="hidden md:block absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]" />
                    
                    <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <div className="bg-[#FF0055] p-3 md:p-4 rounded-full text-white shadow-xl shadow-black/50 hover:scale-110 hover:bg-[#ff1a66] transition-all">
                          <Play fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 ml-1" />
                        </div>
                    </div>
                  </div>
                  
                  <div className="px-1">
                    <h3 className="font-bold text-sm md:text-base text-zinc-100 truncate md:group-hover:text-white transition-colors">{album.title}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] md:text-[10px] text-zinc-500 font-black uppercase tracking-widest">Album</span>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <span className="text-[10px] md:text-xs font-bold text-zinc-400">{new Date(album.created_at).getFullYear()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
