import { createClient } from "@/lib/supabase/server";
import { Heart, Play } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import Link from "next/link";
import { redirect } from "next/navigation";

export const revalidate = 0; // Dynamic page, fetch fresh data every time

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin"); // Protect the route
  }

  const { data: likes } = await supabase
    .from("user_likes")
    .select("track_id, tracks(*, artists(name), albums(title, cover_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Extract tracks safely
  const tracks = likes?.map((l) => l.tracks).filter(Boolean) || [];

  return (
    <div className="p-6 md:p-10 min-h-screen pb-32 bg-gradient-to-b from-indigo-900/30 to-black">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-end gap-8 mb-10 pt-10">
        <div className="w-52 h-52 bg-gradient-to-br from-[#4b3ae6] to-[#8d5be3] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20">
          <Heart size={80} className="text-white fill-white drop-shadow-lg" />
        </div>
        
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-widest text-white/80">Private Collection</span>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
            Liked Songs
          </h1>
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-300">
            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-white">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span>{user.email}</span>
            <span className="w-1 h-1 bg-zinc-500 rounded-full mx-1" />
            <span>{tracks.length} tracks</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {tracks.length > 0 && (
        <div className="mb-8">
          <button className="w-14 h-14 bg-[#FF0055] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-[#FF0055]/20">
            <Play fill="black" size={24} className="ml-1" />
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {tracks.length > 0 ? (
          tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} index={i} context="Library" allTracks={tracks}/>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
            <p className="text-zinc-500 text-lg font-medium">You haven't liked any songs yet.</p>
            <Link 
              href="/" 
              className="inline-block bg-white text-black px-8 py-3 rounded-full font-bold text-sm hover:bg-zinc-200 transition-colors"
            >
              Discover Music
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}