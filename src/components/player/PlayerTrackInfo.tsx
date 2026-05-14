"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, PlusCircle, ListMusic } from "lucide-react";
import { usePlayerStore } from "@/store/usePlayerStore";
import LikeButton from "../user/LikeButton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Playlist } from "@/types/music";

export default function PlayerTrackInfo({ displayImage }: { displayImage: string }) {
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const toggleFullScreen = usePlayerStore(state => state.toggleFullScreen);
  
  const supabase = createClient();
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Pick<Playlist, "id" | "title">[]>([]);

  const fetchMyPlaylists = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login to add to playlist");
    const { data } = await supabase.from("playlists").select("id, title").eq("user_id", user.id);
    if (data) setMyPlaylists(data);
    setShowPlaylistMenu(!showPlaylistMenu);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: currentTrack.id });
    if (error?.code === '23505') toast.error("Already in playlist");
    else if (!error) toast.success("Added to playlist");
    setShowPlaylistMenu(false);
  };

  if (!currentTrack) return null;

  return (
    <div className="flex items-center gap-3 md:gap-4 w-auto md:w-[30%] min-w-0 h-full flex-1 md:flex-none">
      <button onClick={toggleFullScreen} className="relative w-12 h-12 md:w-16 md:h-16 rounded-[1rem] md:rounded-[1.25rem] overflow-hidden bg-zinc-800 shrink-0 group shadow-lg active:scale-95 transition-transform">
        {displayImage && <Image src={displayImage} alt="" fill className="object-cover" />}
        <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
          <Maximize2 size={20} className="text-white" />
        </div>
      </button>
      
      <div className="min-w-0 flex-1 pr-2 cursor-pointer active:opacity-70 transition-opacity" onClick={toggleFullScreen}>
        <p className="text-[13px] md:text-base font-black text-white truncate drop-shadow-md">{currentTrack.title}</p>
        <p className="text-[10px] md:text-xs font-bold text-zinc-400 truncate uppercase tracking-wide mt-0.5">{currentTrack.artists?.name}</p>
      </div>

      <div className="hidden md:flex items-center gap-3 ml-2 shrink-0">
        <LikeButton trackId={currentTrack.id} />
        <div className="relative">
          <button onClick={fetchMyPlaylists} className="text-zinc-400 hover:text-white transition-colors active:scale-90" aria-label="Save to playlist"><PlusCircle size={20} /></button>
          {showPlaylistMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
              <div className="absolute left-0 bottom-full mb-6 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2">
                <p className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Save to Playlist</p>
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {myPlaylists.map(pl => (
                    <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-3 transition-colors">
                      <ListMusic size={16} className="text-[#FF0055]" /> {pl.title}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
