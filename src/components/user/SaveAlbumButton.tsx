"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SaveAlbumButtonProps = {
  albumId: string;
  className?: string;
};

export default function SaveAlbumButton({ albumId, className }: SaveAlbumButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("saved_albums")
        .select("id")
        .eq("user_id", user.id)
        .eq("album_id", albumId)
        .maybeSingle();

      if (!cancelled) {
        setSaved(Boolean(data));
        setLoading(false);
      }
    }

    loadState();
    return () => {
      cancelled = true;
    };
  }, [albumId, supabase]);

  const toggleSaved = async () => {
    if (busy) return;
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      toast.message("Sign in to save albums to your library.");
      router.push("/signin");
      return;
    }

    if (saved) {
      const { error } = await supabase
        .from("saved_albums")
        .delete()
        .eq("user_id", user.id)
        .eq("album_id", albumId);

      if (error) toast.error("Could not remove album");
      else {
        setSaved(false);
        toast.success("Removed from saved albums");
      }
    } else {
      const { error } = await supabase.from("saved_albums").insert({ user_id: user.id, album_id: albumId });
      if (error?.code === "23505") setSaved(true);
      else if (error) toast.error("Could not save album");
      else {
        setSaved(true);
        toast.success("Album saved");
      }
    }

    setBusy(false);
  };

  return (
    <button
      onClick={toggleSaved}
      disabled={loading || busy}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-widest text-zinc-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-60",
        saved && "border-[#FF0055]/40 bg-[#FF0055]/15 text-white",
        className
      )}
      aria-pressed={saved}
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Bookmark size={18} className={saved ? "fill-current text-[#FF0055]" : undefined} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
