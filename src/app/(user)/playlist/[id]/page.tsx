"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Edit3, Clock, Share2, Check, X, Lock, Globe2, MinusCircle } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import PlaylistCover from "@/components/user/PlaylistCover";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import UserConfirmModal from "@/components/user/UserConfirmModal";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import { PageHeaderSkeleton, TrackListSkeleton } from "@/components/user/Skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import { deleteLocalCacheByPrefix, readLocalCache, writeLocalCache } from "@/lib/local-cache";
import type { Playlist, Track } from "@/types/music";

type PlaylistTrackRow = {
  tracks: Track | null;
};

type PlaylistPageCache = {
  playlist: Playlist;
  tracks: Track[];
  isOwner: boolean;
};

export default function PlaylistPage() {
  const { id } = useParams();
  const playlistId = (Array.isArray(id) ? id[0] : id) ?? "";
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  // Renaming State
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempIsPublic, setTempIsPublic] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchData();

    return () => {
      cancelled = true;
    };

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      const cacheKey = `playlist:${playlistId}:${user?.id || "guest"}`;
      const cached = readLocalCache<PlaylistPageCache>(cacheKey);
      if (cached) {
        setPlaylist(cached.playlist);
        setTempTitle(cached.playlist.title);
        setTempDescription(cached.playlist.description || "");
        setTempIsPublic(Boolean(cached.playlist.is_public));
        setTracks(cached.tracks);
        setIsOwner(cached.isOwner);
        setLoading(false);
        return;
      }
      
      const { data: pl } = await supabase.from("playlists").select("*").eq("id", playlistId).single();
      if (!pl) return router.push("/");

      const { data: items } = await supabase
        .from("playlist_tracks")
        .select(`
          track_id, 
          tracks (
            *, 
            artists (name, image_url), 
            albums (title, cover_url)
          )
        `)
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true });

      if (cancelled) return;

      const nextTracks =
        items
          ?.map((item: PlaylistTrackRow) => item.tracks)
          .filter((track: Track | null): track is Track => track !== null && track.audio_status === "ready") || [];
      const nextIsOwner = user?.id === pl.user_id;

      writeLocalCache(cacheKey, {
        playlist: pl,
        tracks: nextTracks,
        isOwner: nextIsOwner,
      });

      setPlaylist(pl);
      setTempTitle(pl.title);
      setTempDescription(pl.description || "");
      setTempIsPublic(Boolean(pl.is_public));
      setTracks(nextTracks);
      setIsOwner(nextIsOwner);
      setLoading(false);
    }
  }, [playlistId, router, supabase]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Playlist deleted");
        deleteLocalCacheByPrefix(`playlist:${playlistId}:`);
        if (playlist?.user_id) deleteLocalCacheByPrefix(`library:${playlist.user_id}`);
        router.push("/");
        router.refresh();
      } else {
        toast.error("Failed to delete playlist");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const savePlaylistDetails = async () => {
    if (!playlist) return;
    const nextTitle = tempTitle.trim();
    if (!nextTitle) {
      setIsEditing(false);
      setTempTitle(playlist.title);
      setTempDescription(playlist.description || "");
      setTempIsPublic(Boolean(playlist.is_public));
      return;
    }
    
    const response = await fetch(`/api/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle, description: tempDescription, is_public: tempIsPublic }),
    });
    const result = await response.json();

    if (response.ok && result.playlist) {
      setPlaylist(result.playlist);
      setTempTitle(result.playlist.title);
      setTempDescription(result.playlist.description || "");
      setTempIsPublic(Boolean(result.playlist.is_public));
      deleteLocalCacheByPrefix(`playlist:${playlistId}:`);
      deleteLocalCacheByPrefix(`library:${result.playlist.user_id}`);
      toast.success("Playlist updated");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to rename");
      setTempTitle(playlist.title);
    }
    setIsEditing(false);
  };

  const handleShare = async () => {
    if (!playlist || typeof window === "undefined") return;

    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: playlist.title, text: "Listen on Miracle FM", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Playlist link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share playlist");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") savePlaylistDetails();
    if (e.key === "Escape" && playlist) {
      setTempTitle(playlist.title);
      setTempDescription(playlist.description || "");
      setTempIsPublic(Boolean(playlist.is_public));
      setIsEditing(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    const response = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Could not remove song");
      return;
    }
    setTracks((current) => {
      const nextTracks = current.filter((track) => track.id !== trackId);
      deleteLocalCacheByPrefix(`playlist:${playlistId}:`);
      return nextTracks;
    });
    toast.success("Song removed");
    router.refresh();
  };

  if (loading || !playlist) return (
    <div className="min-h-screen bg-black px-4 py-10 pb-40 md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeaderSkeleton />
        <TrackListSkeleton rows={7} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 bg-black relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-indigo-900/20 via-black/50 to-black pointer-events-none" />

      <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
        
        {/* 1. Header Card */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-6 md:p-10 mt-16 md:mt-0 group/card transition-colors hover:bg-zinc-900/60">
          
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 brightness-100 contrast-150 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12">
            
            {/* Playlist Cover */}
            <div className="relative w-52 h-52 md:w-64 md:h-64 shrink-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] overflow-hidden border border-white/5 group-hover/card:scale-105 transition-transform duration-700">
              <PlaylistCover 
                playlistId={playlist.id} 
                explicitCover={playlist.cover_url} 
                className="w-full h-full"
              />
            </div>

            {/* Metadata Info */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full min-w-0">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-zinc-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                {isOwner ? "Personal Playlist" : "Editorial Pick"}
              </span>
              
              {/* Editable Title Section */}
              <div className="relative group/edit flex flex-col md:flex-row items-center md:items-end gap-3">
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full max-w-2xl">
                    <input
                      ref={titleInputRef}
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-black/50 text-4xl md:text-7xl font-black text-white outline-none border-b-2 border-[#FF0055] pb-2 placeholder:text-zinc-700"
                      placeholder="Playlist Name"
                    />
                    <div className="flex gap-2">
                      <button onClick={savePlaylistDetails} className="p-3 bg-[#FF0055] rounded-full text-white hover:scale-110 transition shadow-lg">
                        <Check size={20} strokeWidth={3} />
                      </button>
                      <button onClick={() => { setIsEditing(false); setTempTitle(playlist.title); setTempDescription(playlist.description || ""); setTempIsPublic(Boolean(playlist.is_public)); }} className="p-3 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => isOwner && setIsEditing(true)}
                    className={cn(
                      "flex items-center gap-4 group/text cursor-pointer",
                      !isOwner && "cursor-default"
                    )}
                  >
                    <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-none drop-shadow-xl truncate py-1 border-b-2 border-transparent group-hover/text:border-white/10 transition-all">
                      {playlist.title}
                    </h1>
                    {isOwner && (
                      <div className="p-3 rounded-full bg-white/5 text-zinc-400 opacity-100 md:opacity-0 group-hover/edit:opacity-100 transition-all hover:bg-white hover:text-black">
                        <Edit3 size={24} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="mt-4 max-w-2xl space-y-3">
                  <textarea
                    value={tempDescription}
                    onChange={(event) => setTempDescription(event.target.value)}
                    placeholder="Add a short playlist note"
                    className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-medium text-zinc-200 outline-none transition-colors focus:border-[#FF0055]/50"
                    maxLength={240}
                  />
                  <button
                    type="button"
                    onClick={() => setTempIsPublic((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-zinc-300"
                  >
                    {tempIsPublic ? <Globe2 size={15} className="text-[#FF0055]" /> : <Lock size={15} />}
                    {tempIsPublic ? "Public" : "Private"}
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-center gap-3 md:items-start">
                  {playlist.description && (
                    <p className="max-w-2xl text-sm font-medium leading-6 text-zinc-400 md:text-base">
                      {playlist.description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {playlist.is_public ? <Globe2 size={13} className="text-[#FF0055]" /> : <Lock size={13} />}
                    {playlist.is_public ? "Public playlist" : "Private playlist"}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 pt-2 justify-center md:justify-start">
                <div className="flex items-center gap-2 text-white/90">
                  <span className="text-[#FF0055] font-bold text-sm">Miracle FM</span>
                  <span className="w-1 h-1 bg-white/50 rounded-full" />
                  <span className="text-sm font-medium text-zinc-400">{tracks.length} songs</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row md:flex-col items-center gap-4 shrink-0">
              <CollectionPlayButton tracks={tracks} size="large" />
              
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5"
                  aria-label="Share playlist"
                  title="Share playlist"
                >
                  <Share2 size={18} />
                </button>
                {isOwner && (
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-500 transition-colors border border-white/5"
                    title="Delete Playlist"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 2. Track List */}
        <div className="space-y-4 px-2">
          {tracks.length > 0 && (
            <div className="hidden md:flex items-center gap-4 px-4 pb-2 border-b border-white/10 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
              <div className="w-8 text-center">#</div>
              <div className="flex-1">Title</div>
              <div className="hidden md:block w-1/3">Album</div>
              <div className="w-10 text-right"><Clock size={14} /></div>
            </div>
          )}

          <div className="space-y-1">
            {tracks.length > 0 ? (
              tracks.map((track, i) => (
                <div key={track.id}>
                  <div className="group/playlist-row flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <TrackRow 
                        track={track} 
                        index={i} 
                        context="Playlist" 
                        allTracks={tracks}
                      />
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => removeTrack(track.id)}
                        className="mr-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 group-hover/playlist-row:flex md:flex"
                        aria-label={`Remove ${track.title} from playlist`}
                        title="Remove from playlist"
                      >
                        <MinusCircle size={18} />
                      </button>
                    )}
                  </div>
                  {shouldRenderSongListAdAfter(i, tracks.length) && (
                    <SongListAdRow fallbackIndex={i} className={isOwner ? "mr-12" : undefined} />
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-[2rem] bg-zinc-900/20">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                  <Clock size={32} />
                </div>
                <div>
                  <p className="text-zinc-300 font-bold text-lg">Your playlist is empty</p>
                  <p className="text-zinc-500 text-sm">Find songs you love and add them here.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {tracks.length > 3 && tracks.length < 8 && <ResponsiveAd variant="banner" className="px-0" />}

      </div>

      {/* Custom Delete Modal */}
      <UserConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Playlist?"
        description={`Are you sure you want to delete "${playlist.title}"? This action cannot be undone.`}
        confirmText="Delete Playlist"
        loading={isDeleting}
      />
    </div>
  );
}
