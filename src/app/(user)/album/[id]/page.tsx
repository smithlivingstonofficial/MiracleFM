// src/app/(user)/album/[id]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Clock, Disc, Music4, Dot } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import StartRadio from "@/components/user/StartRadio";
import HorizontalAd from "@/components/ads/HorizontalAd";
import ShareButton from "@/components/user/ShareButton";

export const revalidate = 60;

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch Album Details & Tracks
  const { data: album } = await supabase
    .from("albums")
    .select("*, artists(id, name, image_url)")
    .eq("id", id)
    .single();

  if (!album) return notFound();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, artists(name), albums(title, cover_url)")
    .eq("album_id", id)
    .eq("audio_status", "ready")
    .order("created_at", { ascending: true });

  const releaseYear = new Date(album.created_at).getFullYear();
  const trackCount = tracks?.length || 0;
  
  // Get genres from the first track
  const genres = tracks?.[0]?.genre || [];

  return (
    <div className="bg-[#050505] min-h-screen pb-40 relative overflow-x-hidden text-white selection:bg-[#FF0055] selection:text-white">
      
      {/* --- 1. IMMERSIVE COMPACT HERO --- */}
      {/* Reduced height on mobile to bring content up */}
      <div className="relative w-full pt-10 md:pt-32 pb-6 md:pb-12 flex flex-col items-center md:items-start justify-end px-6 md:px-12">
        
        {/* Cinematic Background Blur (Stronger on Mobile) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {album.cover_url ? (
            <div className="relative w-full h-full">
               <Image 
                src={album.cover_url} 
                alt={album.title} 
                fill 
                className="object-cover opacity-60 blur-[60px] md:blur-[80px] scale-150 saturate-150 mask-gradient" 
                priority 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/80 to-[#050505]" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-[#050505]" />
          )}
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-10">
          
          {/* BIGGER ALBUM ART FOR MOBILE */}
          <div className="relative w-[70vw] aspect-square max-w-[280px] md:w-64 md:h-64 rounded-2xl md:rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] overflow-hidden border border-white/10 group shrink-0 animate-in zoom-in duration-700">
             {album.cover_url ? (
               <Image 
                 src={album.cover_url} 
                 alt={album.title} 
                 fill 
                 className="object-cover transition-transform duration-700 group-hover:scale-105" 
                 priority 
               />
             ) : (
               <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                 <Disc size={64} className="text-zinc-700" />
               </div>
             )}
          </div>

          {/* Album Metadata */}
          <div className="text-center md:text-left flex-1 space-y-3 w-full">
            
            {/* Title & Badge */}
            <div className="flex flex-col items-center md:items-start gap-2">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[#FF0055] text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-md">
                    <Disc size={10} className="fill-current" /> Album
                </div>
                
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] drop-shadow-2xl line-clamp-2 px-2 md:px-0">
                {album.title}
                </h1>
            </div>
            
            {/* Artist Chip & Stats */}
            <div className="flex flex-col items-center md:items-start gap-3 md:gap-4">
               {/* Artist Link */}
               <Link href={`/artist/${album.artists?.id}`} className="group flex items-center gap-2 bg-[#0A0A0A]/60 hover:bg-white/10 pr-4 pl-1 py-1 rounded-full border border-white/5 transition-all active:scale-95 backdrop-blur-md">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden relative bg-zinc-800 border border-white/10">
                    {album.artists?.image_url ? (
                      <Image src={album.artists.image_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Music4 size={12} className="text-zinc-500"/></div>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{album.artists?.name}</span>
               </Link>

               {/* Stats Row */}
               <div className="flex items-center gap-1 text-zinc-400 text-[11px] md:text-xs font-bold uppercase tracking-wider">
                  <span>{releaseYear}</span>
                  <Dot size={16} />
                  <span>{trackCount} Songs</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. ACTION BAR (Tight Cluster) --- */}
      <div className="relative z-20 px-6 md:px-12 mb-8">
        <div className="flex flex-row items-center justify-center md:justify-start gap-4 md:gap-6">
          
          {/* Main Play Button - Pulsing */}
          <div className="relative group active:scale-95 transition-transform duration-300">
             <div className="absolute inset-0 bg-[#FF0055] rounded-full blur-md opacity-40 animate-pulse" />
             <div className="relative shadow-[0_0_20px_rgba(255,0,85,0.3)] rounded-full bg-[#FF0055]">
                <CollectionPlayButton tracks={tracks || []} size="large" />
             </div>
          </div>
          
          {/* Secondary Actions Row */}
          <div className="flex items-center gap-3">
             <div className="active:scale-90 transition-transform">
                <StartRadio genres={genres} label={false} />
             </div>
             
             <ShareButton title={album.title} className="h-12 w-12 backdrop-blur-md" iconSize={22} label="Share album" />
          </div>

        </div>
      </div>

      <div className="px-0 md:px-12 space-y-8 relative z-10">
        
        {/* --- 3. TRACK LIST (Full Bleed on Mobile) --- */}
        <div className="space-y-0.5 md:space-y-1">
          {/* Desktop Table Header */}
          <div className="hidden md:flex items-center gap-4 px-4 pb-3 border-b border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">
            <div className="w-8 text-center">#</div>
            <div className="flex-1">Title</div>
            <div className="w-16 text-right"><Clock size={14} className="ml-auto" /></div>
          </div>

          {tracks?.map((track, i) => (
            <div key={track.id} className="active:scale-[0.99] md:active:scale-100 transition-transform duration-200">
               <TrackRow 
                track={track} 
                index={i} 
                context="Album" 
                allTracks={tracks ?? []}
              />
            </div>
          ))}
        </div>
        
        {/* --- 4. COPYRIGHT FOOTER --- */}
        <div className="mt-8 mx-6 md:mx-0 p-6 text-center md:text-left border-t border-white/5 flex flex-col gap-1.5">
           <p className="text-[10px] md:text-xs text-zinc-400 font-bold uppercase tracking-widest">
              Released on {new Date(album.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
           </p>
           <p className="text-[9px] md:text-[10px] text-rose-600 font-black uppercase tracking-widest">
              © {releaseYear} {album.artists?.name}. All Rights Reserved.
           </p>
        </div>

        {/* --- ADD AD AT THE BOTTOM OF THE LIST --- */}
        {tracks && tracks.length > 3 && (
          <div className="pt-8 pb-4">
            <HorizontalAd />
          </div>
        )}

      </div>
    </div>
  );
}
