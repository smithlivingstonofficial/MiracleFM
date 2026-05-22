"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image"; 
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { 
  Search, Music, Edit2, Trash2, Play, Pause, Plus, 
  Calendar, Disc, CheckSquare, Square, X, Filter, 
  UserPlus, ListPlus, Loader2, Album, ChevronDown, 
  ArrowUpDown, Copy, Check, Tags, Terminal, HardDrive
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TextVerificationModal from "@/components/admin/TextVerificationModal";
import GenrePicker from "@/components/admin/GenrePicker";
import { fallbackGenreRows, normalizeGenreList } from "@/lib/genres";
import type { Genre } from "@/types/music";

type FilterType = "all" | "no_artist" | "no_album" | "no_cover" | "no_genre" | "has_genre";
type SortField = "created_at" | "title" | "artist" | "album";
type SortOrder = "asc" | "desc";
type BulkGenreMode = "replace" | "add" | "remove";
type AudioDeleteMode = "track" | "audio" | "qualities" | "fallback" | "original";
const FILTER_OPTIONS: FilterType[] = ["all", "no_artist", "no_album", "no_cover", "no_genre", "has_genre"];
const AUDIO_QUALITIES = [64, 128, 256];

export default function AdminTracksPage() {
  // --- STATE ---
  const [tracks, setTracks] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [genreOptions, setGenreOptions] = useState<Genre[]>(fallbackGenreRows());
  const [loading, setLoading] = useState(true);
  
  // Filters & Sorting
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeGenreFilter, setActiveGenreFilter] = useState("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({ field: "created_at", order: "desc" });
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const lastSelectedIndex = useRef<number>(-1); 
  const [bulkActionType, setBulkActionType] = useState<"artist" | "playlist" | "album" | "genre" | "encode" | "delete" | null>(null);
  const [bulkGenres, setBulkGenres] = useState<string[]>([]);
  const [bulkGenreMode, setBulkGenreMode] = useState<BulkGenreMode>("add");
  const [bulkEncodeQualities, setBulkEncodeQualities] = useState<number[]>([256]);
  const [audioDeleteMode, setAudioDeleteMode] = useState<AudioDeleteMode>("track");
  
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
    const [tRes, aRes, pRes, albRes, genreRes] = await Promise.all([
      supabase.from("tracks").select("*, artists(name, image_url), albums(title, cover_url), track_audio_variants(bitrate_kbps, size_bytes), encoding_jobs(source_key, source_size_bytes, source_deleted_at, created_at)"), 
      supabase.from("artists").select("id, name").order("name"),
      supabase.from("playlists").select("id, title").is("user_id", null),
      supabase.from("albums").select("id, title").order("title"),
      fetch("/api/genres").then((response) => response.json()).catch(() => ({ genres: fallbackGenreRows() }))
    ]);
    if (tRes.data) setTracks(tRes.data);
    if (aRes.data) setArtists(aRes.data);
    if (pRes.data) setPlaylists(pRes.data);
    if (albRes.data) setAlbums(albRes.data);
    if (genreRes.genres?.length) setGenreOptions(genreRes.genres);
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
        case "has_genre": return Array.isArray(t.genre) && t.genre.length > 0;
        default: return true;
      }
    }).filter((track) => {
      if (!activeGenreFilter) return true;
      return Array.isArray(track.genre) && track.genre.includes(activeGenreFilter);
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

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "0 MB";
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  const latestEncodingJob = (track: any) => {
    const jobs = Array.isArray(track.encoding_jobs) ? [...track.encoding_jobs] : [];
    return jobs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
  };

  const availableBitrates = (track: any) =>
    (Array.isArray(track.track_audio_variants) ? track.track_audio_variants : [])
      .map((variant: any) => Number(variant.bitrate_kbps))
      .filter((bitrate: number) => AUDIO_QUALITIES.includes(bitrate))
      .sort((a: number, b: number) => a - b);

  const encodedSize = (track: any) =>
    (Array.isArray(track.track_audio_variants) ? track.track_audio_variants : []).reduce(
      (total: number, variant: any) => total + Number(variant.size_bytes || 0),
      0
    );

  const hasOriginalSource = (track: any) => {
    const job = latestEncodingJob(track);
    return Boolean(job?.source_key && !job.source_deleted_at);
  };

  const toggleBulkEncodeQuality = (bitrate: number) => {
    setBulkEncodeQualities((current) => {
      if (!current.includes(bitrate)) return [...current, bitrate].sort((a, b) => a - b);
      const next = current.filter((value) => value !== bitrate);
      return next.length > 0 ? next : current;
    });
  };

  const encodeCommandFor = (trackIds: string[], bitrates = bulkEncodeQualities) =>
    `npm run worker:encode -- --tracks "${trackIds.join(",")}" --qualities "${bitrates.join(",")}" --force --no-fallback`;

  const copyEncodeCommand = (trackIds: string[], bitrates = bulkEncodeQualities, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const eligibleIds = trackIds.filter((id) => {
      const track = tracks.find((item) => item.id === id);
      return track && hasOriginalSource(track);
    });

    if (eligibleIds.length === 0) {
      toast.error("No selected tracks have an original source available.");
      return;
    }

    navigator.clipboard.writeText(encodeCommandFor(eligibleIds, bitrates));
    toast.success(`Encode command copied for ${eligibleIds.length} track${eligibleIds.length === 1 ? "" : "s"}`);
  };

  const missingBitratesFor = (track: any) => {
    const available = new Set(availableBitrates(track));
    const missing = AUDIO_QUALITIES.filter((bitrate) => !available.has(bitrate));
    return missing.length > 0 ? missing : [256];
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

  const applyBulkGenre = async (mode: BulkGenreMode, selectedGenres = bulkGenres) => {
    const normalized = normalizeGenreList(selectedGenres);
    if (mode !== "replace" && normalized.length === 0) {
      toast.error("Select at least one genre");
      return;
    }

    const selectedSet = new Set(selectedIds);
    const oldTracks = [...tracks];
    const nextTracks = tracks.map((track) => {
      if (!selectedSet.has(track.id)) return track;
      const currentGenres = normalizeGenreList(Array.isArray(track.genre) ? track.genre : []);
      let nextGenre: string[];
      if (mode === "replace") nextGenre = normalized;
      else if (mode === "add") nextGenre = normalizeGenreList([...currentGenres, ...normalized]);
      else nextGenre = currentGenres.filter((genre) => !normalized.includes(genre));
      return { ...track, genre: nextGenre };
    });

    setTracks(nextTracks);

    const updates = nextTracks
      .filter((track) => selectedSet.has(track.id))
      .map((track) => supabase.from("tracks").update({ genre: track.genre || [] }).eq("id", track.id));
    const results = await Promise.all(updates);
    const failed = results.some((result) => result.error);

    if (failed) {
      setTracks(oldTracks);
      toast.error("Genre update failed");
      return;
    }

    toast.success(`Updated genres for ${selectedIds.length} tracks`);
    setBulkGenres([]);
    resetBulkState();
  };

  const clearBulkGenres = async () => {
    await applyBulkGenre("replace", []);
  };

  const handleBulkDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/admin/tracks/audio/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackIds: selectedIds,
          mode: audioDeleteMode,
          bitrates: audioDeleteMode === "qualities" ? bulkEncodeQualities : undefined,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Audio deletion failed");
      }

      toast.success(deleteSuccessMessage());
      resetBulkState();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Batch deletion failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const deleteSuccessMessage = () => {
    if (audioDeleteMode === "track") return `Deleted ${selectedIds.length} tracks`;
    if (audioDeleteMode === "audio") return `Deleted encoded audio for ${selectedIds.length} tracks`;
    if (audioDeleteMode === "qualities") return `Deleted selected qualities for ${selectedIds.length} tracks`;
    if (audioDeleteMode === "fallback") return `Deleted fallback audio for ${selectedIds.length} tracks`;
    return `Deleted originals for ${selectedIds.length} tracks`;
  };

  const deleteDescription = () => {
    if (audioDeleteMode === "track") return "This permanently deletes the selected tracks and all associated audio files from Cloudflare R2.";
    if (audioDeleteMode === "audio") return "This deletes encoded HLS and fallback audio, but keeps track metadata and original masters.";
    if (audioDeleteMode === "qualities") return `This deletes only the selected HLS qualities: ${bulkEncodeQualities.join(", ")}k.`;
    if (audioDeleteMode === "fallback") return "This deletes only the 160k fallback M4A files.";
    return "This deletes original master files. Future re-encoding will be disabled unless you upload sources again.";
  };

  const resetBulkState = () => {
    setSelectedIds([]);
    setBulkActionType(null);
    setBulkGenres([]);
    fetchInitialData();
  };

  const activeGenreNames = new Set(genreOptions.filter((genre) => genre.is_active).map((genre) => genre.name));

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
                   {FILTER_OPTIONS.map((f) => (
                     <button key={f} onClick={() => { setActiveFilter(f); setIsFilterMenuOpen(false); }} className={cn("w-full text-left px-4 py-3 text-xs font-bold hover:bg-white/5 transition-colors flex items-center justify-between", activeFilter === f ? "text-brand" : "text-zinc-400")}>
                       {f.replace('no_', 'Missing ').replace('has_genre', 'Has Genre').replace('all', 'Show All')}
                       {activeFilter === f && <Check size={14} />}
                     </button>
                   ))}
                </div>
              </>
            )}
          </div>

          <select
            value={activeGenreFilter}
            onChange={(event) => setActiveGenreFilter(event.target.value)}
            className="hidden h-[54px] rounded-full border border-white/[0.05] bg-panel px-4 text-sm font-bold text-zinc-400 outline-none transition focus:border-brand/30 md:block"
          >
            <option value="">All Genres</option>
            {genreOptions.map((genre) => (
              <option key={genre.slug} value={genre.name}>
                {genre.name}
              </option>
            ))}
          </select>

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
            const bitrates = availableBitrates(track);
            const sourceJob = latestEncodingJob(track);
            const sourceAvailable = hasOriginalSource(track);

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
                       <span className={cn(
                         "text-[10px] font-bold uppercase tracking-wider",
                         track.audio_status === "ready" ? "text-green-500" :
                         track.audio_status === "failed" ? "text-red-500" :
                         track.audio_status === "encoding" ? "text-blue-400" :
                         track.audio_status === "queued" ? "text-yellow-400" :
                         "text-zinc-600"
                       )}>
                         {track.audio_status === "ready" ? "Adaptive AAC" :
                          track.audio_status === "failed" ? "Encoding failed" :
                          track.audio_status === "encoding" ? "Encoding" :
                          track.audio_status === "queued" ? "Queued" :
                          "Legacy HLS"}
                       </span>
                       <button onClick={(e) => handleCopyId(track.id, e)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-400 transition-opacity" title="Copy ID"><Copy size={10} /></button>
                       <button
                         onClick={(e) => copyEncodeCommand([track.id], missingBitratesFor(track), e)}
                         disabled={!sourceAvailable}
                         className="opacity-0 group-hover:opacity-100 text-zinc-600 transition-opacity hover:text-brand disabled:cursor-not-allowed disabled:opacity-20"
                         title={sourceAvailable ? "Copy encode command" : "Original source deleted"}
                       >
                         <Terminal size={10} />
                       </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {bitrates.length > 0 ? bitrates.map((bitrate: number) => (
                        <span key={bitrate} className="rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-green-400">
                          {bitrate}k
                        </span>
                      )) : (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                          No HLS
                        </span>
                      )}
                      {track.fallback_audio_url && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-blue-400">
                          Fallback
                        </span>
                      )}
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                        sourceAvailable ? "bg-white/5 text-zinc-500" : "bg-red-500/10 text-red-400"
                      )}>
                        {sourceAvailable ? "Original" : "No original"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Artist/Album Column */}
                <div className="col-span-3 hidden md:block">
                  <p className={cn("text-xs font-bold", track.artists ? "text-zinc-300" : "text-red-500 italic")}>{track.artists?.name || "Unassigned Artist"}</p>
                  <p className={cn("text-[10px] font-medium mt-1", track.albums ? "text-zinc-500" : "text-red-900 italic")}>{track.albums?.title || "No Album"}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {normalizeGenreList(Array.isArray(track.genre) ? track.genre : []).slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest",
                          activeGenreNames.has(genre) ? "bg-white/5 text-zinc-500" : "bg-yellow-500/10 text-yellow-300"
                        )}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 hidden md:block">
                   <div className="flex items-center gap-2 text-zinc-600 font-mono text-[10px] font-bold"><Calendar size={12} /> {new Date(track.created_at).toLocaleDateString()}</div>
                   <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-zinc-600">
                     <HardDrive size={12} />
                     <span>{formatBytes(encodedSize(track))}</span>
                     {sourceJob?.source_size_bytes && <span className="text-zinc-700">+ {formatBytes(sourceJob.source_size_bytes)} src</span>}
                   </div>
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
        <div className="fixed bottom-30 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-10 duration-500">
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
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'genre' ? null : 'genre')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 rounded-full transition-colors font-bold text-xs uppercase"><Tags size={16} /> Genre</button>
                {bulkActionType === 'genre' && (
                  <div className="absolute bottom-full mb-4 left-0 w-[360px] bg-[#121212] text-white rounded-2xl shadow-2xl p-4 border border-white/10 max-h-[520px] overflow-y-auto custom-scrollbar">
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      {(["add", "replace", "remove"] as BulkGenreMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setBulkGenreMode(mode)}
                          className={cn("rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-widest", bulkGenreMode === mode ? "bg-brand text-white" : "bg-white/5 text-zinc-400")}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <GenrePicker
                      genres={genreOptions}
                      selected={bulkGenres}
                      onChange={setBulkGenres}
                      compact
                      label="Bulk Genres"
                    />
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => applyBulkGenre(bulkGenreMode)} className="flex-1 rounded-full bg-brand px-4 py-3 text-xs font-black uppercase tracking-widest text-white">
                        Apply
                      </button>
                      <button onClick={clearBulkGenres} className="rounded-full border border-red-500/20 px-4 py-3 text-xs font-black uppercase tracking-widest text-red-400">
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'encode' ? null : 'encode')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-black/5 rounded-full transition-colors font-bold text-xs uppercase"><Terminal size={16} /> Encode</button>
                {bulkActionType === 'encode' && (
                  <div className="absolute bottom-full mb-4 left-0 w-72 bg-[#121212] text-white rounded-2xl shadow-2xl p-4 border border-white/10">
                    <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">Qualities</p>
                    <div className="mb-4 flex gap-2">
                      {AUDIO_QUALITIES.map((bitrate) => (
                        <button
                          key={bitrate}
                          onClick={() => toggleBulkEncodeQuality(bitrate)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-widest",
                            bulkEncodeQualities.includes(bitrate) ? "border-brand bg-brand text-white" : "border-white/10 bg-white/5 text-zinc-400"
                          )}
                        >
                          {bitrate}k
                        </button>
                      ))}
                    </div>
                    <button onClick={() => copyEncodeCommand(selectedIds)} className="w-full rounded-full bg-brand px-4 py-3 text-xs font-black uppercase tracking-widest text-white">
                      Copy batch command
                    </button>
                  </div>
                )}
              </div>
              <div className="h-6 w-[1px] bg-black/10 mx-2" />
              <div className="relative">
                <button onClick={() => setBulkActionType(bulkActionType === 'delete' ? null : 'delete')} className="flex items-center gap-2 px-4 py-2.5 hover:bg-red-50 text-red-600 rounded-full transition-colors font-bold text-xs uppercase"><Trash2 size={16} /> Delete</button>
                {bulkActionType === 'delete' && (
                  <div className="absolute bottom-full mb-4 right-0 w-72 bg-[#121212] text-white rounded-2xl shadow-2xl p-2 border border-white/10">
                    {([
                      ["track", "Whole track"],
                      ["audio", "Encoded audio only"],
                      ["qualities", `Selected qualities (${bulkEncodeQualities.join(", ")}k)`],
                      ["fallback", "Fallback only"],
                      ["original", "Original source only"],
                    ] as [AudioDeleteMode, string][]).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setAudioDeleteMode(mode);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full rounded-xl px-4 py-3 text-left text-xs font-bold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
        title={audioDeleteMode === "track" ? `Delete ${selectedIds.length} Tracks?` : `Delete ${audioDeleteMode} for ${selectedIds.length} Tracks?`}
        description={`${deleteDescription()} This action cannot be undone.`}
        confirmationText={`DELETE ${selectedIds.length} ITEMS`}
      />
    </div>
  );
}
