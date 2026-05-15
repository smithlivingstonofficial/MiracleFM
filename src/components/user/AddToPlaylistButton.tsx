"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ListMusic, Loader2, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Playlist } from "@/types/music";

type AddToPlaylistButtonProps = {
  trackId: string;
  className?: string;
};

export default function AddToPlaylistButton({ trackId, className }: AddToPlaylistButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Pick<Playlist, "id" | "title">[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadPlaylists = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      toast.message("Sign in to save this song to your worship collection.");
      router.push("/signin");
      return;
    }

    const { data, error } = await supabase
      .from("playlists")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      toast.error("Could not load playlists");
      return;
    }

    setPlaylists(data || []);
    setOpen((value) => !value);
  };

  const addToPlaylist = async (playlistId: string) => {
    const { error } = await supabase.from("playlist_tracks").insert({ playlist_id: playlistId, track_id: trackId });
    if (error?.code === "23505") toast.error("Already in this playlist");
    else if (error) toast.error("Could not add song");
    else toast.success("Added to playlist");
    setOpen(false);
  };

  const createPlaylistAndAdd = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Worship Playlist" }),
      });
      const result = await response.json();
      if (!response.ok || !result.playlist?.id) throw new Error(result.error || "Could not create playlist");

      await addToPlaylist(result.playlist.id);
      setPlaylists((current) => [result.playlist, ...current]);
      toast.success("Created playlist and added song");
    } catch {
      toast.error("Could not create playlist");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={loadPlaylists}
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/5 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white active:scale-95",
          className
        )}
        aria-label="Add to playlist"
        title="Add to playlist"
      >
        <PlusCircle size={21} className={loading ? "animate-pulse" : undefined} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-xl">
            <p className="border-b border-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Add to Playlist
            </p>
            <div className="max-h-56 overflow-y-auto py-1">
              <button
                onClick={createPlaylistAndAdd}
                disabled={creating}
                className="mb-1 flex w-full items-center gap-2 rounded-xl bg-[#FF0055]/15 px-3 py-3 text-left text-sm font-black text-white transition-colors hover:bg-[#FF0055]/25 disabled:opacity-60"
              >
                {creating ? <Loader2 size={15} className="animate-spin text-[#FF0055]" /> : <PlusCircle size={15} className="text-[#FF0055]" />}
                <span className="truncate">Create new playlist</span>
              </button>
              {playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => addToPlaylist(playlist.id)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <ListMusic size={15} className="text-[#FF0055]" />
                    <span className="truncate">{playlist.title}</span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-5 text-center text-xs text-zinc-500">Create a playlist from your library first.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
