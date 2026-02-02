"use client";

import { useEffect, useState } from "react";
import Image from "next/image"; 
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { Search, Music, Edit2, Trash2, Play, Pause, Plus, Calendar, Disc } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminTracksPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { setTrack, currentTrack, isPlaying, setIsPlaying } = usePlayerStore();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchTracks();
  }, []);

  async function fetchTracks() {
    // FETCH 3 LEVELS: Track, Artist, Album
    const { data } = await supabase
      .from("tracks")
      .select(`
        *, 
        artists(name, image_url),
        albums(title, cover_url)
      `)
      .order("created_at", { ascending: false });
    if (data) setTracks(data);
  }

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artists?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.albums?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Track deleted");
      fetchTracks();
    } else {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-white">Media Library</h1>
          <p className="text-zinc-500 mt-2 text-lg font-medium">
            Manage {tracks.length} encrypted HLS audio streams.
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand transition-colors" size={20} />
            <input 
              placeholder="Search tracks, artists, albums..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 bg-panel border border-white/[0.05] rounded-full py-3.5 pl-14 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand/20 transition-all placeholder:text-zinc-600"
            />
          </div>
          <button 
            onClick={() => router.push('/upload')}
            className="bg-brand hover:bg-brand-hover text-white p-3.5 rounded-full shadow-lg shadow-brand/20 transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="bg-panel border border-white/[0.05] rounded-[2rem] overflow-hidden shadow-2xl relative">
        <div className="grid grid-cols-12 px-8 py-5 border-b border-white/[0.05] bg-zinc-900/50 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
          <div className="col-span-6 md:col-span-5">Track Detail</div>
          <div className="col-span-3 md:col-span-3 hidden md:block">Artist / Album</div>
          <div className="col-span-3 md:col-span-3 hidden md:block">Date Added</div>
          <div className="col-span-6 md:col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/[0.02]">
          {filteredTracks.map((track) => {
            const isCurrent = currentTrack?.id === track.id;
            
            // THE ULTIMATE FALLBACK: Track -> Album -> Artist
            const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url;
            
            return (
              <div 
                key={track.id} 
                className={cn(
                  "grid grid-cols-12 px-6 md:px-8 py-4 items-center group transition-colors duration-300",
                  isCurrent ? "bg-brand/[0.03]" : "hover:bg-white/[0.02]"
                )}
              >
                <div className="col-span-6 md:col-span-5 flex items-center gap-5">
                  <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/[0.05] shadow-lg">
                    {displayImage ? (
                      <Image 
                        src={displayImage} 
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
                        <Music size={24} />
                      </div>
                    )}
                    
                    <button 
                      onClick={() => isCurrent ? setIsPlaying(!isPlaying) : setTrack(track)}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-all duration-300",
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-full shadow-xl transform transition-transform duration-300",
                        isCurrent ? "bg-brand text-white scale-100" : "bg-white text-black scale-90 group-hover:scale-100"
                      )}>
                         {isCurrent && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                      </div>
                    </button>
                  </div>

                  <div className="min-w-0 pr-4">
                    <p className={cn(
                      "text-base font-bold truncate transition-colors mb-1",
                      isCurrent ? "text-brand" : "text-white group-hover:text-brand"
                    )}>
                      {track.title}
                    </p>
                    <span className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                      HLS 128k
                    </span>
                  </div>
                </div>

                {/* Artist & Album Column */}
                <div className="col-span-3 hidden md:block">
                  <p className="text-sm font-bold text-zinc-300">
                    {track.artists?.name || "Unassigned"}
                  </p>
                  {track.albums && (
                    <div className="flex items-center gap-1.5 mt-1 text-zinc-500">
                      <Disc size={12} />
                      <p className="text-xs font-medium truncate">{track.albums.title}</p>
                    </div>
                  )}
                </div>

                <div className="col-span-3 hidden md:block">
                   <div className="flex items-center gap-2 text-zinc-600">
                     <Calendar size={14} />
                     <p className="text-xs font-bold font-mono">
                       {new Date(track.created_at).toLocaleDateString()}
                     </p>
                   </div>
                </div>

                <div className="col-span-6 md:col-span-1 flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => router.push(`/tracks/${track.id}`)}
                    className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(track.id)}
                    className="p-2.5 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}