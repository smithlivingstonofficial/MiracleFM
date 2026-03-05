import { createClient } from "@/lib/supabase/server";
import { Heart, Music, ShieldCheck } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import Link from "next/link";
import { redirect } from "next/navigation";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";

export const revalidate = 0;

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: likes } = await supabase
    .from("user_likes")
    .select("track_id, tracks(*, artists(name), albums(title, cover_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tracks = likes?.map((l: any) => l.tracks).filter((t: any) => t !== null) || [];

  return (
    <div className="min-h-screen pb-32 bg-black relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FF0055]/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="p-6 md:p-12 max-w-7xl mx-auto space-y-12">
        
        {/* 1. The "Vault Card" Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 via-black to-zinc-950 border border-white/10 shadow-2xl p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">
            
            {/* Unique 3D-Style Icon Container */}
            <div className="w-40 h-40 md:w-56 md:h-56 bg-black rounded-full border-[6px] border-[#FF0055] shadow-[0_0_60px_rgba(255,0,85,0.3)] flex items-center justify-center shrink-0 relative group">
              <Heart size={80} className="text-[#FF0055] fill-[#FF0055] animate-in zoom-in duration-700" />
              <div className="absolute inset-0 rounded-full border border-white/10" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF0055]/10 border border-[#FF0055]/20 text-[#FF0055] text-xs font-black uppercase tracking-widest">
                <ShieldCheck size={12} /> Personal Vault
              </div>
              
              <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">
                Liked <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Songs</span>
              </h1>
              
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Curator</p>
                    <p className="text-sm font-bold text-white">{user.email?.split('@')[0]}</p>
                  </div>
                </div>

                <div className="hidden md:block w-[1px] h-10 bg-white/10" />

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400">
                    <Music size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Total</p>
                    <p className="text-sm font-bold text-white">{tracks.length} Tracks</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Play Button (New Component) */}
            <div className="shrink-0">
              <CollectionPlayButton tracks={tracks} />
            </div>
          </div>
        </div>

        {/* 2. Track List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-bold text-white">Your Collection</h2>
            <div className="h-[1px] flex-1 bg-white/10 ml-6" />
          </div>

          <div className="space-y-1">
            {tracks.length > 0 ? (
              tracks.map((track: any, i: number) => (
                <TrackRow 
                  key={track.id} 
                  track={track} 
                  index={i} 
                  context="Library"
                  allTracks={tracks} 
                />
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-zinc-900/30 rounded-[2rem] border border-dashed border-white/10">
                <Heart size={48} className="text-zinc-700" />
                <div>
                  <p className="text-zinc-300 font-bold text-lg">No saved tracks yet</p>
                  <p className="text-zinc-500 text-sm">Start listening and hit the heart icon.</p>
                </div>
                <Link 
                  href="/" 
                  className="bg-white text-black px-8 py-3 rounded-full font-black text-sm hover:scale-105 transition-transform"
                >
                  Browse Music
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}