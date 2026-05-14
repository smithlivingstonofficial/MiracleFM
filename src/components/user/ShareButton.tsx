"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  title: string;
  text?: string;
  className?: string;
  iconSize?: number;
  label?: string;
};

export default function ShareButton({
  title,
  text = "Listen on Miracle FM",
  className,
  iconSize = 18,
  label = "Share",
}: ShareButtonProps) {
  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Unable to share");
    }
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/5 active:scale-95",
        className
      )}
      aria-label={label}
      title={label}
    >
      <Share2 size={iconSize} />
    </button>
  );
}
