"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Upload, Search, PlusCircle, X, Music, Disc } from "lucide-react";
import { toast } from "sonner";

export default function PlaylistEditor() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // Playlist State
  const [details, setDetails] = useState({ title: "", description: "", cover_url: "" });
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  
  // Search State
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlaylistData();
  }, []);

  // Search logic
  useEffect(() => {
    if (search.length > 2) {
      const timer = setTimeout(searchTracks, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [search]);

  async function fetchPlaylistData() {
    // 1. Get Details
    const { data: pl } = await supabase.from("playlists").select("*").eq("id", id).single();
    if (pl) setDetails(pl);

    // 2. Get Tracks in this playlist
    const { data: tracks } = await supabase
      .from("playlist_tracks")
      .select("track_id, tracks(*, artists(name))")
      .eq("playlist_id", id)
      .order("added_at", { ascending: true });
    
    if (tracks) setPlaylistTracks(tracks.map(t => t.tracks));
  }

  async function searchTracks() {
    const { data } = await supabase
      .from("tracks")
      .select("*, artists(name)")
      .ilike("title", `%${search}%`)
      .limit(5);
    if (data) setSearchResults(data);
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const path = `playlists/${id}-${Date.now()}.jpg`;
      const res = await fetch("/api/upload", { method: "POST", body: JSON.stringify({ fileName: path, contentType: file.type }) });
      const { url } = await res.json();
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      
      setDetails(prev => ({ ...prev, cover_url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${path}` }));
      toast.success("Cover uploaded");
    } catch {
      toast.error("Upload failed");
    }
  };

  const addTrack = async (track: any) => {
    // Check if already exists
    if (playlistTracks.find(t => t.id === track.id)) return toast.error("Track already in playlist");

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: id,
      track_id: track.id
    });

    if (!error) {
      setPlaylistTracks([...playlistTracks, track]);
      setSearch(""); // Clear search
      toast.success("Track added");
    }
  };

  const removeTrack = async (trackId: string) => {
    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .match({ playlist_id: id, track_id: trackId });

    if (!error) {
      setPlaylistTracks(playlistTracks.filter(t => t.id !== trackId));
      toast.success("Track removed");
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    await supabase.from("playlists").update(details).eq("id", id);
    setSaving(false);
    toast.success("Playlist saved");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white transition">
          <ArrowLeft size={20} /> Back to Playlists
        </button>
        <button onClick={saveDetails} disabled={saving} className="bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-full font-black text-sm transition-all">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left: Metadata */}
        <div className="lg:col-span-4 space-y-6">
          <div className="group relative aspect-square rounded-[2.5rem] overflow-hidden bg-panel border-2 border-dashed border-white/10 flex items-center justify-center">
            {details.cover_url ? (
              <Image src={details.cover_url} alt="" fill className="object-cover" />
            ) : (
              <Disc size={48} className="text-zinc-800" />
            )}
            <label className="absolute inset-0 bg-brand/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer">
              <Upload size={32} className="text-white mb-2" />
              <span className="font-black text-xs uppercase text-white">Upload Cover</span>
              <input type="file" hidden onChange={handleCoverUpload} />
            </label>
          </div>

          <div className="space-y-4">
            <input 
              value={details.title}
              onChange={e => setDetails({...details, title: e.target.value})}
              className="w-full bg-black border border-white/10 rounded-xl p-4 font-bold text-white text-lg focus:border-brand outline-none transition-all"
              placeholder="Playlist Title"
            />
            <textarea 
              value={details.description || ""}
              onChange={e => setDetails({...details, description: e.target.value})}
              rows={4}
              className="w-full bg-black border border-white/10 rounded-xl p-4 text-zinc-400 text-sm focus:border-brand outline-none transition-all resize-none"
              placeholder="Description..."
            />
          </div>
        </div>

        {/* Right: Track Manager */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Search Bar */}
          <div className="relative z-20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-panel border border-white/10 rounded-full py-4 pl-12 pr-6 text-sm font-bold text-white focus:ring-4 focus:ring-brand/10 focus:border-brand/20 outline-none transition-all"
                placeholder="Search library to add tracks..."
              />
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-2">
                {searchResults.map(track => (
                  <button 
                    key={track.id}
                    onClick={() => addTrack(track)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center"><Music size={16} className="text-zinc-600"/></div>
                      <div>
                        <p className="font-bold text-sm text-white">{track.title}</p>
                        <p className="text-xs text-zinc-500">{track.artists?.name}</p>
                      </div>
                    </div>
                    <PlusCircle size={20} className="text-brand" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Tracks List */}
          <div className="bg-panel border border-white/[0.05] rounded-[2.5rem] p-8 min-h-[400px]">
            <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-6">Included Tracks ({playlistTracks.length})</h3>
            
            <div className="space-y-2">
              {playlistTracks.length === 0 ? (
                <div className="text-center py-20 text-zinc-600 italic">No tracks added yet.</div>
              ) : (
                playlistTracks.map((track, index) => (
                  <div key={track.id} className="group flex items-center justify-between p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-600 font-mono text-xs w-6">{index + 1}</span>
                      <div className="w-10 h-10 bg-zinc-900 rounded-lg overflow-hidden relative">
                         {track.cover_url ? <Image src={track.cover_url} alt="" fill className="object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Music size={14} className="text-zinc-700"/></div>}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{track.title}</p>
                        <p className="text-xs text-zinc-500">{track.artists?.name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeTrack(track.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}