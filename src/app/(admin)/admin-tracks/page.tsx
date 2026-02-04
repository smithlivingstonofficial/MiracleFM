"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image"; 
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { 
  Search, Music, Edit2, Trash2, Play, Pause, Plus, 
  Calendar, Disc, CheckSquare, Square, X, Filter, 
  UserPlus, ListPlus, Loader2, Album, ChevronDown, 
  ArrowUpDown, Copy, Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TextVerificationModal from "@/components/admin/TextVerificationModal";

type FilterType = "all" | "no_artist" | "no_album" | "no_cover" | "no_genre";
type SortField = "created_at" | "title" | "artist" | "album";
type SortOrder = "asc" | "desc";

export default function AdminTracksPage() {
  // --- STATE ---
  const [tracks, setTracks] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({ field: "created_at", order: "desc" });
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIndex = useRef<number>(-1); 
  const [bulkActionType, setBulkActionType] = useState<"artist" | "playlist" | "album" | null>(null);
  
  // Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // External
  const { setTrack, currentTrack, isPlaying, setIsPlaying } = usePlayerStore();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    const [tRes, aRes, pRes, albRes] = await Promise.all([
      supabase.from("tracks").select("*, artists(name, image_url), albums(title, cover_url)"), 
      supabase.from("artists").select("id, name").order("name"),
      supabase.from("playlists").select("id, title").is("user_id", null),
      supabase.from("albums").select("id, title").order("title")
    ]);
    if (tRes.data) setTracks(tRes.data);
    if (aRes.data) setArtists(aRes.data);
    if (pRes.data) setPlaylists(pRes.data);
    if (albRes.data) setAlbums(albRes.data);
    setLoading(false);
  }

  // --- LOGIC: FILTER & SORT ---
  const processTracks = () => {
    let result = tracks.filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.artists?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.albums?.title?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case "no_artist": return !t.artist_id;
        case "no_album": return !t.album_id;
        case "no_cover": return !t.cover_url;
        case "no_genre": return !t.genre || t.genre.length === 0;
        default: return true;
      }
    });

    return result.sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.field) {
        case "title": aVal = a.title; bVal = b.title; break;
        case "artist": aVal = a.artists?.name || ""; bVal = b.artists?.name || ""; break;
        case "album": aVal = a.albums?.title || ""; bVal = b.albums?.title || ""; break;
        case "created_at": aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
        default: return 0;
      }
      if (aVal < bVal) return sortConfig.order === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
  };

  const processedTracks = processTracks();

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc"
    }));
  };

  // --- LOGIC: INLINE EDITING ---
  const startEditing = (track: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row selection or play
    setEditingId(track.id);
    setEditTitle(track.title);
  };

  const saveTitleEdit = async () => {
    if (!editingId) return;
    
    // Optimistic Update locally
    const oldTracks = [...tracks];
    const updatedTracks = tracks.map(t => t.id === editingId ? { ...t, title: editTitle } : t);
    setTracks(updatedTracks);
    setEditingId(null);

    // Database Update
    const { error } = await supabase.from("tracks").update({ title: editTitle }).eq("id", editingId);
    
    if (error) {
      setTracks(oldTracks); // Revert on fail
      toast.error("Failed to rename track");
    } else {
      toast.success("Track renamed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveTitleEdit();
    if (e.key === "Escape") setEditingId(null);
  };

  // --- LOGIC: SELECTION ---
  const toggleSelect = (id: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex.current !== -1) {
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      const idsInRange = processedTracks.slice(start, end + 1).map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...idsInRange])));
    } else {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
    lastSelectedIndex.current = index;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === processedTracks.length) setSelectedIds([]);
    else setSelectedIds(processedTracks.map(t => t.id));
  };

  // --- ACTIONS ---
  const handlePlayTrack = (track: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setTrack(track);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success("ID Copied");
  };

  const applyBulkUpdate = async (field: "artist_id" | "album_id", value: string) => {
    const { error } = await supabase.from("tracks").update({ [field]: value }).in("id", selectedIds);
    if (!error) {
      toast.success(`Updated ${selectedIds.length} tracks`);
      resetBulkState();
    } else {
      toast.error("Update failed");
    }
  };

  const applyBulkPlaylist = async (playlistId: string) => {
    const tracksToAdd = selectedIds.map(trackId => ({ playlist_id: playlistId, track_id: trackId }));
    const { error } = await supabase.from("playlist_tracks").upsert(tracksToAdd, { onConflict: 'playlist_id, track_id' });
    if (!error) {
      toast.success(`Added to playlist`);
      resetBulkState();
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      }
      toast.success(`Deleted ${selectedIds.length} tracks`);
      resetBulkState();
    } catch (e) {
      toast.error("Batch deletion failed");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const resetBulkState = () => {
    setSelectedIds([]);
    setBulkActionType(null);
    fetchInitialData();
  };

  const getHealthStatus = (track: any) => {
    const missing = [];
    if (!track.artist_id) missing.push("Artist");
    if (!track.album_id) missing.push("Album");
    if (!track.cover_url) missing.push("Cover");
    return missing.length > 0 ? missing.join(", ") : null;
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Media Library</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-zinc-500 font-medium">Manage {tracks.length} encrypted HLS streams.</span>
            {tracks.filter(t => !t.artist_id || !t.album_id).length > 0 && (
              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full font-bold border border-yellow-500/20">
                {tracks.filter(t => !t.artist_id || !t.album_id).length} Issues Found
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Smart Filter */}
          <div className="relative z-20">
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={cn("h-[54px] px-4 rounded-full border flex items-center gap-2 font-bold text-sm transition-all",
                activeFilter !== 'all' ? "bg-brand text-white border-brand" : "bg-panel border-white/[0.05] text-zinc-400 hover:text-white"
              )}
            >
              <Filter size={18} />
              <span className="hidden md:inline">{activeFilter === 'all' ? "Filter" : activeFilter.replace('no_', 'Missing ')}</span>
              <ChevronDown size={14} className={cn("transition-transform", isFilterMenuOpen && "rotate-180")} />
            </button>
            {isFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95">
                   {['all', 'no_artist', 'no_album', 'no_cover', 'no_genre'].map((f: any) => (
                     <button key={f} onClick={() => { setActiveFilter(f); setIsFilterMenuOpen(false); }} className={cn("w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/5 transition-colors flex items-center justify-between", activeFilter === f ? "text-brand" : "text-zinc-400")}>
                       {f.replace('no_', 'Missing ').replace('all', 'Show All')}
                       {activeFilter === f && <Check size={14} />}
                     </button>
                   ))}
                </div>
              </>
            )}
          </div>

          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand transition-colors" size={20} />
            <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full md:w-72 bg-panel border border-white/[0.05] rounded-full py-4 pl-14 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand/20 transition-all" />
          </div>

          <button onClick={() => router.push('/upload')} className="bg-brand hover:bg-brand-hover text-white p-4 rounded-full shadow-lg shadow-brand/20 transition-all hover:scale-105 active:scale-95">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* 2. List Container */}
      <div className="bg-panel border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl relative min-h-[400px]">
        
        {/* Sortable Header */}
        <div className="grid grid-cols-12 px-8 py-6 border-b border-white/[0.05] bg-zinc-900/50 items-center text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black">
          <div className="col-span-1">
            <button onClick={toggleSelectAll} className="hover:text-brand transition-colors">
              {selectedIds.length > 0 && selectedIds.length === processedTracks.length ? <CheckSquare size={22} className="text-brand" /> : <Square size={22} />}
            </button>
          </div>
          <div className="col-span-5 cursor-pointer hover:text-white flex items-center gap-2" onClick={() => handleSort("title")}>
            Track Detail {sortConfig.field === "title" && <ArrowUpDown size={12} className={sortConfig.order === "asc" ? "rotate-180" : ""} />}
          </div>
          <div className="col-span-3 hidden md:flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => handleSort("artist")}>
            Artist / Album {sortConfig.field === "artist" && <ArrowUpDown size={12} className={sortConfig.order === "asc" ? "rotate-180" : ""} />}
          </div>
          <div className="col-span-2 hidden md:flex items-center gap-2 cursor-pointer hover:text-white" onClick={() => handleSort("created_at")}>
            Date {sortConfig.field === "created_at" && <ArrowUpDown size={12} className={sortConfig.order === "asc" ? "rotate-180" : ""} />}
          </div>
          <div className="col-span-1 text-right">Edit</div>
        </div>

        <div className="divide-y divide-white/[0.02]">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4 text-zinc-500"><Loader2 className="animate-spin text-brand" size={32} /></div>
          ) : processedTracks.length === 0 ? (
            <div className="p-20 text-center text-zinc-500 text-sm font-medium">No tracks found.</div>
          ) : processedTracks.map((track, index) => {
            const isSelected = selectedIds.includes(track.id);
            const isCurrent = currentTrack?.id === track.id;
            const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url;
            const healthIssues = getHealthStatus(track);
            const isEditing = editingId === track.id;

            return (
              <div 
                key={track.id} 
                onClick={(e) => toggleSelect(track.id, index, e)} 
                className={cn("grid grid-cols-12 px-8 py-4 items-center group transition-all duration-100 cursor-pointer select-none", isSelected ? "bg-brand/[0.04]" : "hover:bg-white/[0.01]")}
              >
                <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => toggleSelect(track.id, index, e)} className={cn("transition-colors", isSelected ? "text-brand" : "text-zinc-800 group-hover:text-zinc-600")}>
                    {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>
                </div>

                <div className="col-span-5 flex items-center gap-5">
                  <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-zinc-950 border border-white/5 shadow-md group/cover cursor-pointer" onClick={(e) => handlePlayTrack(track, e)}>
                    {displayImage ? <Image src={displayImage} alt="" fill className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-800"><Music size={20} /></div>}
                    <div className={cn("absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity backdrop-blur-[1px]", isCurrent ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100")}>
                      {isCurrent && isPlaying ? <Pause size={18} fill="white" className="text-white" /> : <Play size={18} fill="white" className="text-white ml-1" />}
                    </div>
                  </div>
                  
                  <div className="min-w-0 pr-4 flex-1">
                    <div className="flex items-center gap-2">
                       {/* INLINE EDITING LOGIC */}
                       {isEditing ? (
                         <input
                           autoFocus
                           value={editTitle}
                           onChange={(e) => setEditTitle(e.target.value)}
                           onKeyDown={handleKeyDown}
                           onBlur={saveTitleEdit}
                           onClick={(e) => e.stopPropagation()}
                           className="bg-black border border-brand text-white font-bold text-sm px-2 py-1 rounded-md w-full outline-none"
                         />
                       ) : (
                         <p 
                           onClick={(e) => startEditing(track, e)}
                           className={cn("font-bold text-sm truncate transition-colors cursor-text hover:underline decoration-zinc-600 underline-offset-4", isSelected || isCurrent ? "text-brand" : "text-white")}
                           title="Click to rename"
                         >
                           {track.title}
                         </p>
                       )}
                       
                       {healthIssues && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shrink-0" title={`Missing: ${healthIssues}`} />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">HLS 128k</span>
                       <button onClick={(e) => handleCopyId(track.id, e)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity" title="Copy ID"><Copy size={10} /></button>
                    </div>
                  </div>
                </div>

                {/* Artist/Album Column */}
                <div className="col-span-3 hidden md:block">
                  <p className={cn("text-xs font-bold", track.artists ? "text-zinc-300" : "text-red-500 italic")}>{track.artists?.name || "Unassigned Artist"}</p>
                  <p className={cn("text-[10px] font-medium mt-1", track.albums ? "text-zinc-500" : "text-red-900 italic")}>{track.albums?.title || "No Album"}</p>
                </div>

                <div className="col-span-2 hidden md:block">
                   <div className="flex items-center gap-2 text-zinc-600 font-mono text-[10px] font-bold"><Calendar size={12} /> {new Date(track.created_at).toLocaleDateString()}</div>
                </div>

                <div className="col-span-1 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); router.push(`/tracks/${track.id}`) }} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10"><Edit2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white text-black px-6 py-3 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center gap-6 border border-white/20">
            <div className="flex items-center gap-3 pr-6 border-r border-black/10">
              <div className="bg-brand text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.length}</div>
              <span className="font-bold text-xs uppercase tracking-widest">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'artist' ? null : 'artist')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 rounded-full transition-colors font-bold text-xs uppercase"><UserPlus size={16} /> Artist</button>
                {bulkActionType === 'artist' && <div className="absolute bottom-full mb-4 left-0 w-64 bg-[#121212] text-white rounded-2xl shadow-2xl p-2 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">{artists.map(a => <button key={a.id} onClick={() => applyBulkUpdate('artist_id', a.id)} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-xs font-bold transition-colors">{a.name}</button>)}</div>}
              </div>
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'album' ? null : 'album')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 rounded-full transition-colors font-bold text-xs uppercase"><Album size={16} /> Album</button>
                {bulkActionType === 'album' && <div className="absolute bottom-full mb-4 left-0 w-64 bg-[#121212] text-white rounded-2xl shadow-2xl p-2 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">{albums.map(a => <button key={a.id} onClick={() => applyBulkUpdate('album_id', a.id)} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-xs font-bold transition-colors">{a.title}</button>)}</div>}
              </div>
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'playlist' ? null : 'playlist')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 rounded-full transition-colors font-bold text-xs uppercase"><ListPlus size={16} /> Playlist</button>
                {bulkActionType === 'playlist' && <div className="absolute bottom-full mb-4 left-0 w-64 bg-[#121212] text-white rounded-2xl shadow-2xl p-2 border border-white/10 max-h-60 overflow-y-auto custom-scrollbar">{playlists.map(p => <button key={p.id} onClick={() => applyBulkPlaylist(p.id)} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-xs font-bold transition-colors">{p.title}</button>)}</div>}
              </div>
              <div className="h-6 w-[1px] bg-black/10 mx-2" />
              <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 rounded-full transition-colors font-bold text-xs uppercase"><Trash2 size={16} /> Delete</button>
            </div>
            <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-black/5 rounded-full transition-colors ml-2"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <TextVerificationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} Tracks?`}
        description="This will permanently delete the selected tracks and all associated HLS audio files from Cloudflare R2. This action cannot be undone."
        confirmationText={`DELETE ${selectedIds.length} ITEMS`}
      />
    </div>
  );
}