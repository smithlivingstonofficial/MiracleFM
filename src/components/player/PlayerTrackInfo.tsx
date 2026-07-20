"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2, Music2, PlusCircle, ListMusic } from "lucide-react";
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
    if (!user) return toast.message("Sign in to add this song to a playlist.");
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

  const openFullScreenOnSmallScreens = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1280) return;
    toggleFullScreen();
  };

  return (
    <div className="flex items-center gap-3 md:gap-4 w-auto md:w-[32%] min-w-0 h-full flex-1 md:flex-none">
      <button onClick={openFullScreenOnSmallScreens} className="relative h-[54px] w-[54px] md:w-[52px] md:h-[52px] rounded-[1.2rem] md:rounded-[0.95rem] overflow-hidden bg-zinc-800 shrink-0 group shadow-[0_12px_30px_-15px_rgba(255,255,255,0.3)] active:scale-95 transition-transform border border-white/15 xl:cursor-default xl:active:scale-100">
        {displayImage ? (
          <Image src={displayImage} alt="" fill className="object-cover" sizes="(max-width: 768px) 54px, 52px" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-600">
            <Music2 size={22} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-white/10" />
        <div className="hidden md:flex xl:hidden absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
          <Maximize2 size={16} className="text-white" />
        </div>
      </button>
      
      <div className="min-w-0 flex-1 pr-2 cursor-pointer active:opacity-70 transition-opacity xl:cursor-default xl:active:opacity-100" onClick={openFullScreenOnSmallScreens}>
        <p className="text-[13px] md:text-[15px] font-black text-white truncate drop-shadow-md leading-tight">{currentTrack.title}</p>
        <p className="text-[10px] md:text-[11px] font-black text-zinc-400 truncate uppercase tracking-[0.12em] mt-1">{currentTrack.artists?.name}</p>
      </div>

      <div className="hidden md:flex items-center gap-2 ml-2 shrink-0">
        <LikeButton trackId={currentTrack.id} />
        <div className="relative">
          <button onClick={fetchMyPlaylists} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white hover:bg-white/10 transition-colors active:scale-90" aria-label="Save to playlist"><PlusCircle size={18} /></button>
          {showPlaylistMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
              <div className="absolute left-0 bottom-full mb-6 w-64 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2">
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
