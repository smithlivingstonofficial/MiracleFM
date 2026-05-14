// src/app/admin/playlists/[id]/page.tsx

"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Upload, Search, PlusCircle, X, Music, Disc, 
  Check, Loader2, GripVertical, Trash2, ListFilter
} from "lucide-react";
import { toast } from "sonner";
import { buildMediaUrl } from "@/lib/media";

export default function PlaylistEditor() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  // State
  const[details, setDetails] = useState({ title: "", description: "", cover_url: "" });
  const[playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  
  // Search Library State
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Local Filter State
  const [localFilter, setLocalFilter] = useState("");
  
  // Action States
  const[saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPlaylistData();
  }, [id]);

  // Debounced Search Logic
  useEffect(() => {
    if (search.trim().length > 2) {
      setIsSearching(true);
      const timer = setTimeout(searchTracks, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [search]);

  async function fetchPlaylistData() {
    const { data: pl } = await supabase.from("playlists").select("*").eq("id", id).single();
    if (pl) setDetails({ title: pl.title || "", description: pl.description || "", cover_url: pl.cover_url || "" });

    // Fetch tracks with rich relations for cover art
    const { data: tracks } = await supabase
      .from("playlist_tracks")
      .select("track_id, tracks(*, artists(name, image_url), albums(title, cover_url))")
      .eq("playlist_id", id)
      .order("added_at", { ascending: true });
    
    if (tracks) setPlaylistTracks(tracks.map(t => t.tracks));
  }

  async function searchTracks() {
    const { data } = await supabase
      .from("tracks")
      .select("*, artists(name, image_url), albums(title, cover_url)")
      .ilike("title", `%${search}%`)
      .limit(8);
    
    if (data) setSearchResults(data);
    setIsSearching(false);
  }

  // Cover Upload Logic (Kept your logic, added state)
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const path = `playlists/${id}-${Date.now()}.jpg`;
      const res = await fetch("/api/upload", { method: "POST", body: JSON.stringify({ fileName: path, contentType: file.type }) });
      const { url } = await res.json();
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      
      setDetails(prev => ({ ...prev, cover_url: buildMediaUrl(path) }));
      toast.success("Cover uploaded successfully");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addTrack = async (track: any) => {
    if (playlistTracks.find(t => t.id === track.id)) {
        return toast.error("Track already in playlist");
    }

    // Optimistic UI Update
    setPlaylistTracks(prev => [...prev, track]);
    setSearch(""); // Clear search automatically

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: id,
      track_id: track.id
    });

    if (error) {
      // Revert if failed
      setPlaylistTracks(prev => prev.filter(t => t.id !== track.id));
      toast.error("Failed to add track");
    } else {
      toast.success("Track added");
    }
  };

  const removeTrack = async (trackId: string) => {
    const originalTracks = [...playlistTracks];
    // Optimistic UI Update
    setPlaylistTracks(prev => prev.filter(t => t.id !== trackId));

    const { error } = await supabase
      .from("playlist_tracks")
      .delete()
      .match({ playlist_id: id, track_id: trackId });

    if (error) {
      setPlaylistTracks(originalTracks); // Revert
      toast.error("Failed to remove track");
    } else {
      toast.success("Track removed");
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    const { error } = await supabase.from("playlists").update(details).eq("id", id);
    setSaving(false);
    
    if (error) toast.error("Failed to save details");
    else toast.success("Playlist saved successfully");
  };

  // Local Filter Logic
  const filteredTracks = useMemo(() => {
    return playlistTracks.filter(t => 
      t.title?.toLowerCase().includes(localFilter.toLowerCase()) || 
      t.artists?.name?.toLowerCase().includes(localFilter.toLowerCase())
    );
  }, [playlistTracks, localFilter]);

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32 animate-in fade-in duration-700">
      
      {/* --- STICKY HEADER --- */}
      <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between transition-all">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="font-bold text-sm uppercase tracking-wider">Back</span>
        </button>
        <button 
          onClick={saveDetails} 
          disabled={saving} 
          className="bg-[#FF0055] hover:bg-[#ff1a66] disabled:bg-zinc-800 disabled:text-zinc-500 text-white px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-[#FF0055]/20 active:scale-95 flex items-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? "Saving..." : "Save Playlist"}
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* --- LEFT: METADATA & COVER --- */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Cover Art Upload */}
          <div className="group relative aspect-square w-full max-w-[320px] mx-auto lg:mx-0 rounded-[2rem] overflow-hidden bg-zinc-900 shadow-2xl border border-white/5 transition-all hover:border-[#FF0055]/50">
            {details.cover_url ? (
              <Image src={details.cover_url} alt="Cover" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                 <Disc size={64} className="text-zinc-800 mb-4" />
                 <p className="text-zinc-600 font-bold text-xs uppercase tracking-widest">No Cover Art</p>
              </div>
            )}
            
            {/* Upload Overlay */}
            <label className={`absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all cursor-pointer ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {uploading ? (
                <Loader2 size={32} className="text-[#FF0055] animate-spin mb-2" />
              ) : (
                <Upload size={32} className="text-white mb-2 group-hover:-translate-y-1 transition-transform" />
              )}
              <span className="font-black text-[10px] uppercase tracking-[0.2em] text-white">
                {uploading ? "Uploading..." : "Change Cover"}
              </span>
              <input type="file" accept="image/*" hidden onChange={handleCoverUpload} disabled={uploading} />
            </label>
          </div>

          {/* Details Inputs */}
          <div className="space-y-4">
            <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Playlist Title</label>
                <input 
                value={details.title}
                onChange={e => setDetails({...details, title: e.target.value})}
                className="w-full bg-transparent border-b border-white/10 p-2 font-black text-white text-3xl focus:border-[#FF0055] outline-none transition-all placeholder:text-zinc-800"
                placeholder="Give it a name"
                />
            </div>
            <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-2">Description</label>
                <textarea 
                value={details.description || ""}
                onChange={e => setDetails({...details, description: e.target.value})}
                rows={3}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl p-4 mt-1 text-zinc-300 text-sm focus:border-[#FF0055]/50 focus:bg-zinc-900 outline-none transition-all resize-none placeholder:text-zinc-700"
                placeholder="What is this playlist about?"
                />
            </div>
          </div>
        </div>


        {/* --- RIGHT: TRACK MANAGER --- */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* SEARCH LIBRARY AREA */}
          <div className="relative z-30">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Search size={12} /> Add to Playlist
            </h3>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#FF0055] transition-colors" size={20} />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-900/80 border border-white/10 rounded-full py-4 pl-14 pr-12 text-sm font-bold text-white focus:ring-2 focus:ring-[#FF0055]/20 focus:border-[#FF0055]/50 outline-none transition-all placeholder:text-zinc-600 shadow-xl"
                placeholder="Search for songs or artists..."
              />
              {isSearching && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 text-[#FF0055] animate-spin" size={18} />}
              {search && !isSearching && (
                  <button onClick={() => setSearch("")} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                      <X size={18} />
                  </button>
              )}
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            {search.length > 2 && !isSearching && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm font-bold text-zinc-500">No tracks found.</div>
                ) : (
                  searchResults.map(track => {
                    const isAdded = playlistTracks.some(t => t.id === track.id);
                    const art = track.cover_url || track.albums?.cover_url || track.artists?.image_url;
                    
                    return (
                        <div key={track.id} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors group/item">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-black rounded-lg overflow-hidden relative border border-white/5 shadow-md">
                                    {art ? <Image src={art} alt="" fill className="object-cover" /> : <Music size={16} className="text-zinc-600 m-auto h-full"/>}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-white line-clamp-1">{track.title}</p>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider line-clamp-1">{track.artists?.name}</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => !isAdded && addTrack(track)}
                                disabled={isAdded}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                    isAdded 
                                    ? 'bg-white/5 text-zinc-500 cursor-default' 
                                    : 'bg-[#FF0055]/10 text-[#FF0055] hover:bg-[#FF0055] hover:text-white border border-[#FF0055]/20'
                                }`}
                            >
                                {isAdded ? <Check size={14} /> : <PlusCircle size={14} />}
                                {isAdded ? 'Added' : 'Add'}
                            </button>
                        </div>
                    );
                  })
                )}
              </div>
            )}
          </div>


          {/* CURRENT TRACKS LIST */}
          <div className="bg-zinc-900/30 border border-white/[0.05] rounded-[2rem] p-6 md:p-8 min-h-[400px]">
            
            {/* List Header & Local Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Included Tracks</h3>
                    <p className="text-xs font-bold text-zinc-500 mt-0.5">{playlistTracks.length} songs added</p>
                </div>
                
                <div className="relative w-full md:w-64">
                    <ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
                    <input 
                        value={localFilter}
                        onChange={(e) => setLocalFilter(e.target.value)}
                        placeholder="Filter playlist..."
                        className="w-full bg-black/50 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs font-bold text-white focus:border-[#FF0055]/50 outline-none transition-all placeholder:text-zinc-600"
                    />
                </div>
            </div>
            
            {/* The List */}
            <div className="space-y-1">
              {playlistTracks.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl mt-4">
                    <Disc size={48} className="text-zinc-800 mx-auto mb-3" />
                    <p className="text-zinc-500 font-bold text-sm">Your playlist is empty.</p>
                    <p className="text-zinc-700 text-xs font-medium mt-1">Search above to add some tracks.</p>
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="text-center py-10 text-zinc-600 font-medium text-sm">No matches for "{localFilter}"</div>
              ) : (
                filteredTracks.map((track, index) => {
                  const art = track.cover_url || track.albums?.cover_url || track.artists?.image_url;
                  
                  return (
                    <div key={track.id} className="group flex items-center justify-between p-2 hover:bg-white/[0.03] rounded-xl transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-3 md:gap-4 w-full overflow-hidden">
                            {/* Drag Handle (Visual only for now, indicates lists) */}
                            <GripVertical size={14} className="text-zinc-800 group-hover:text-zinc-600 cursor-grab active:cursor-grabbing hidden md:block" />
                            
                            <span className="text-zinc-600 font-black text-[10px] w-4 text-right hidden md:block">{index + 1}</span>
                            
                            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-black rounded-lg overflow-hidden relative shadow-md">
                                {art ? <Image src={art} alt="" fill className="object-cover"/> : <Music size={16} className="text-zinc-700 m-auto h-full"/>}
                            </div>
                            
                            <div className="truncate pr-4">
                                <p className="font-bold text-sm text-white truncate group-hover:text-[#FF0055] transition-colors">{track.title}</p>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate mt-0.5">{track.artists?.name}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => removeTrack(track.id)}
                            className="p-2.5 text-zinc-600 hover:text-white hover:bg-[#FF0055] rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-lg"
                            title="Remove from playlist"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
