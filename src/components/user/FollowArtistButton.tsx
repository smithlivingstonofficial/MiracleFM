"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { deleteLocalCacheByPrefix } from "@/lib/local-cache";

type FollowArtistButtonProps = {
  artistId: string;
  className?: string;
};

export default function FollowArtistButton({ artistId, className }: FollowArtistButtonProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [following, setFollowing] = useState(false);
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
        .from("followed_artists")
        .select("id")
        .eq("user_id", user.id)
        .eq("artist_id", artistId)
        .maybeSingle();

      if (!cancelled) {
        setFollowing(Boolean(data));
        setLoading(false);
      }
    }

    loadState();
    return () => {
      cancelled = true;
    };
  }, [artistId, supabase]);

  const toggleFollow = async () => {
    if (busy) return;
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      toast.message("Sign in to follow your favorite artists.");
      router.push("/signin");
      return;
    }

    if (following) {
      const { error } = await supabase
        .from("followed_artists")
        .delete()
        .eq("user_id", user.id)
        .eq("artist_id", artistId);

      if (error) toast.error("Could not unfollow artist");
      else {
        deleteLocalCacheByPrefix(`followed-artists:${user.id}`);
        deleteLocalCacheByPrefix(`library:${user.id}`);
        setFollowing(false);
        toast.success("Artist removed from follows");
      }
    } else {
      const { error } = await supabase.from("followed_artists").insert({ user_id: user.id, artist_id: artistId });
      if (error?.code === "23505") setFollowing(true);
      else if (error) toast.error("Could not follow artist");
      else {
        deleteLocalCacheByPrefix(`followed-artists:${user.id}`);
        deleteLocalCacheByPrefix(`library:${user.id}`);
        setFollowing(true);
        toast.success("Artist followed");
      }
    }

    setBusy(false);
  };

  return (
    <button
      onClick={toggleFollow}
      disabled={loading || busy}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-widest text-zinc-200 transition-all hover:bg-white/10 active:scale-95 disabled:opacity-60",
        following && "border-[#FF0055]/40 bg-[#FF0055]/15 text-white",
        className
      )}
      aria-pressed={following}
    >
      {busy ? <Loader2 size={18} className="animate-spin" /> : following ? <UserCheck size={18} className="text-[#FF0055]" /> : <UserPlus size={18} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
