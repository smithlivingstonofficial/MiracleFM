"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserAuth } from "@/components/providers/UserAuthProvider";

export default function LikeButton({ trackId }: { trackId: string }) {
  const { user, isLiked, toggleLike } = useUserAuth();
  const router = useRouter();
  const liked = isLiked(trackId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playing the song when clicking heart

    if (!user) {
      toast.message("Sign in to save this song to your worship collection.");
      router.push("/signin");
      return;
    }

    const wasLiked = liked;
    const success = await toggleLike(trackId);
    if (success) {
      toast.success(wasLiked ? "Removed from Library" : "Added to Library");
    } else {
      toast.error("Failed to update liked songs");
    }
  };

  return (
    <button 
      onClick={handleClick}
      className={cn(
        "transition-all duration-200 hover:scale-110 active:scale-95",
        liked ? "text-[#FF0055]" : "text-zinc-500 hover:text-white"
      )}
      aria-label={liked ? "Remove from liked songs" : "Add to liked songs"}
    >
      <Heart size={20} fill={liked ? "currentColor" : "none"} />
    </button>
  );
}
