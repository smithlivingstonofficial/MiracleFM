"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Play, Trash2, Edit3, Loader2, Clock, Share2, MoreHorizontal, Check, X } from "lucide-react";
import TrackRow from "@/components/user/TrackRow";
import PlaylistCover from "@/components/user/PlaylistCover";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import UserConfirmModal from "@/components/user/UserConfirmModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PlaylistPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  
  // Renaming State
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: pl } = await supabase.from("playlists").select("*").eq("id", id).single();
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
      .eq("playlist_id", id)
      .order("added_at", { ascending: true });

    setPlaylist(pl);
    setTempTitle(pl.title);
    setTracks(items?.map((i: any) => i.tracks).filter((t: any) => t !== null) || []);
    setIsOwner(user?.id === pl.user_id);
    setLoading(false);
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Playlist deleted");
        router.push("/");
        router.refresh();
      } else {
        toast.error("Failed to delete playlist");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const saveTitle = async () => {
    if (!tempTitle.trim() || tempTitle === playlist.title) {
      setIsEditing(false);
      setTempTitle(playlist.title);
      return;
    }
    
    const { error } = await supabase.from("playlists").update({ title: tempTitle }).eq("id", id);
    if (!error) {
      setPlaylist({ ...playlist, title: tempTitle });
      toast.success("Playlist renamed");
      router.refresh();
    } else {
      toast.error("Failed to rename");
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveTitle();
    if (e.key === "Escape") {
      setTempTitle(playlist.title);
      setIsEditing(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="animate-spin text-[#FF0055] w-10 h-10" />
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
                      <button onClick={saveTitle} className="p-3 bg-[#FF0055] rounded-full text-black hover:scale-110 transition shadow-lg">
                        <Check size={20} strokeWidth={3} />
                      </button>
                      <button onClick={() => { setIsEditing(false); setTempTitle(playlist.title); }} className="p-3 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition">
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
                <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5">
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
                <TrackRow 
                  key={track.id} 
                  track={track} 
                  index={i} 
                  context="Playlist" 
                  allTracks={tracks}
                />
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