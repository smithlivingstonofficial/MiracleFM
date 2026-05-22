"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteLocalCacheByPrefix } from "@/lib/local-cache";
import { clearHomeSessionCache } from "@/lib/home-session-cache";
import type { User } from "@supabase/supabase-js";

export default function LikeButton({ trackId }: { trackId: string }) {
  const [isLiked, setIsLiked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkUserAndLikeStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(user);

      if (!user) {
        setIsLiked(false);
        return;
      }

      const { data } = await supabase
        .from("user_likes")
        .select("track_id")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .maybeSingle();
      
      if (!cancelled) setIsLiked(Boolean(data));
    }

    checkUserAndLikeStatus();

    return () => {
      cancelled = true;
    };
  }, [supabase, trackId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playing the song when clicking heart

    if (!user) {
      toast.message("Sign in to save this song to your worship collection.");
      router.push("/signin");
      return;
    }

    // Optimistic Update (UI updates immediately)
    const previousState = isLiked;
    setIsLiked(!isLiked);

    if (!previousState) {
      // Add Like
      const { error } = await supabase
        .from("user_likes")
        .insert({ user_id: user.id, track_id: trackId });
      
      if (error && error.code !== "23505") {
        setIsLiked(previousState); // Revert
        toast.error("Failed to like song");
      } else {
        deleteLocalCacheByPrefix(`library:${user.id}`);
        clearHomeSessionCache();
        toast.success("Added to Library");
      }
    } else {
      // Remove Like
      const { error } = await supabase
        .from("user_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("track_id", trackId);
        
      if (error) {
        setIsLiked(previousState); // Revert
        toast.error("Failed to remove like");
      } else {
        deleteLocalCacheByPrefix(`library:${user.id}`);
        clearHomeSessionCache();
        toast.success("Removed from Library");
      }
    }
  };

  return (
    <button 
      onClick={toggleLike}
      className={cn(
        "transition-all duration-200 hover:scale-110 active:scale-95",
        isLiked ? "text-[#FF0055]" : "text-zinc-500 hover:text-white"
      )}
      aria-label={isLiked ? "Remove from liked songs" : "Add to liked songs"}
    >
      <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
    </button>
  );
}
