"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { usePlayerStore } from "@/store/usePlayerStore";
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Repeat, Shuffle, Maximize2, Repeat1, PlusCircle, ListMusic 
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import LikeButton from "../user/LikeButton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AudioPlayer() {
  const { 
    currentTrack, 
    isPlaying, 
    setIsPlaying, 
    playNext, 
    playPrevious, 
    toggleShuffle, 
    toggleRepeat, 
    isShuffled, 
    repeatMode,
    toggleFullScreen,
    // --- Get time synchronization actions from the store ---
    setCurrentTime,
    setDuration
  } = usePlayerStore();

  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Local state for UI only
  const [volume, setVolume] = useState(1);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<any[]>([]);

  // We now read time directly from the global store
  const progress = usePlayerStore(state => state.currentTime);
  const duration = usePlayerStore(state => state.duration);

  // --- Audio Engine Logic ---
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const audio = audioRef.current;

    // Reset progress in the global store when track changes
    setCurrentTime(0);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(currentTrack.hls_url);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if(isPlaying) audio.play().catch(() => setIsPlaying(false));
      });
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      audio.src = currentTrack.hls_url;
      if(isPlaying) audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // --- THE FIX: This function now updates the GLOBAL store ---
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time); // Manually update store for immediate feedback
    }
  };

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
    if (error?.code === '23505') toast.error("Already in this playlist");
    else if (!error) toast.success("Added to playlist");
    setShowPlaylistMenu(false);
  };

  const formatTime = (time: number) => {
    if(isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!currentTrack) return null;

  const displayImage = currentTrack.cover_url || currentTrack.albums?.cover_url || currentTrack.artists?.image_url;
  const progressPercent = (progress / (duration || 1)) * 100;
  const volumePercent = volume * 100;

  return (
    <div className={cn(
      "fixed left-0 right-0 z-40 transition-all duration-300 border-t border-white/10 backdrop-blur-xl",
      "bottom-[80px] h-[70px] bg-zinc-900/95 px-3 py-2",
      "md:bottom-0 md:h-[100px] md:bg-black/95 md:px-4 md:py-3"
    )}>
      <audio 
        ref={audioRef} 
        hidden 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleTimeUpdate} // Get duration as soon as available
        onEnded={playNext}
      />
      
      <div className="md:hidden absolute top-0 left-0 right-0 h-[2px] bg-zinc-800">
        <div className="h-full bg-[#FF0055]" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="flex items-center justify-between max-w-[1600px] mx-auto h-full gap-2 md:gap-4">
        
        <div className="flex items-center gap-3 w-auto md:w-[30%] min-w-0">
          <button onClick={toggleFullScreen} className="relative w-10 h-10 md:w-14 md:h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0 group shadow-lg">
            {displayImage && <Image src={displayImage} alt="" fill className="object-cover" />}
            <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
              <Maximize2 size={16} className="text-white" />
            </div>
          </button>
          <div className="min-w-0 flex-1 pr-2 cursor-pointer" onClick={toggleFullScreen}>
            <p className="text-xs md:text-sm font-bold text-white truncate hover:underline">{currentTrack.title}</p>
            <p className="text-[10px] md:text-xs text-zinc-400 truncate">{currentTrack.artists?.name}</p>
          </div>
          <div className="hidden md:flex items-center gap-3 ml-2 shrink-0">
            <LikeButton trackId={currentTrack.id} />
            <div className="relative">
              <button onClick={fetchMyPlaylists} className="text-zinc-400 hover:text-white"><PlusCircle size={20} /></button>
              {showPlaylistMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPlaylistMenu(false)} />
                  <div className="absolute left-0 bottom-full mb-6 w-60 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-2">
                    <p className="px-3 py-2 text-[10px] font-black text-zinc-500 uppercase">Save to</p>
                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                      {myPlaylists.map(pl => (
                        <button key={pl.id} onClick={() => addToPlaylist(pl.id)} className="w-full text-left px-3 py-2.5 text-sm font-bold text-zinc-300 hover:bg-white/5 rounded-lg flex items-center gap-3">
                          <ListMusic size={14} className="text-[#FF0055]" /> {pl.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 max-w-[45%]">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={toggleShuffle} className={cn("hidden md:block", isShuffled ? "text-[#FF0055]" : "text-zinc-400 hover:text-white")}><Shuffle size={18} /></button>
            <button onClick={playPrevious} className="hidden md:block text-zinc-300 hover:text-white"><SkipBack size={26} fill="currentColor" /></button>
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 md:w-11 md:h-11 bg-white rounded-full flex items-center justify-center text-black">
              {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
            </button>
            <button onClick={playNext} className="text-zinc-300 hover:text-white"><SkipForward className="w-6 h-6 md:w-[26px] md:h-[26px]" fill="currentColor" /></button>
            <button onClick={toggleRepeat} className={cn("hidden md:block relative", repeatMode !== "off" ? "text-[#FF0055]" : "text-zinc-400 hover:text-white")}>
              {repeatMode === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
              {repeatMode !== "off" && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#FF0055]" />}
            </button>
          </div>
          <div className="hidden md:flex w-full items-center gap-3 text-[11px] font-mono text-zinc-500 group mt-1">
            <span className="w-10 text-right">{formatTime(progress)}</span>
            <div className="relative flex-1 flex items-center">
              <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                value={progress}
                onChange={handleSeek}
                style={{ "--range-progress": `${progressPercent}%` } as any}
                className="player-slider w-full z-20"
              />
            </div>
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-end gap-4 w-[25%]">
          <div className="flex items-center gap-3 group">
            <Volume2 size={20} className="text-zinc-400" />
            <input 
              type="range" 
              min={0} max={1} step={0.01} 
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if(audioRef.current) audioRef.current.volume = v;
              }}
              style={{ "--range-progress": `${volumePercent}%` } as any}
              className="player-slider w-24"
            />
          </div>
          <button onClick={toggleFullScreen} className="text-zinc-400 hover:text-white"><Maximize2 size={18} /></button>
        </div>

        <div className="md:hidden">
           <LikeButton trackId={currentTrack.id} />
        </div>
      </div>
    </div>
  );
}