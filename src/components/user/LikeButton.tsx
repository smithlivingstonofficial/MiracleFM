"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LikeButton({ trackId }: { trackId: string }) {
  const [isLiked, setIsLiked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    checkUserAndLikeStatus();
  }, [trackId]);

  async function checkUserAndLikeStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data } = await supabase
        .from("user_likes")
        .select("*")
        .eq("user_id", user.id)
        .eq("track_id", trackId)
        .single();
      
      if (data) setIsLiked(true);
    }
  }

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playing the song when clicking heart

    if (!user) {
      toast.error("Please login to save songs");
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
      
      if (error) {
        setIsLiked(previousState); // Revert
        toast.error("Failed to like song");
      } else {
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
    >
      <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
    </button>
  );
}