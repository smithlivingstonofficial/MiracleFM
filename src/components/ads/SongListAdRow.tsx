"use client";

import { useEffect, useRef } from "react";
import { BadgeDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADSENSE_CLIENT, SONG_LIST_FEED_AD_SLOT } from "@/lib/ads";

type SongListAdRowProps = {
  className?: string;
};

export default function SongListAdRow({ className }: SongListAdRowProps) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (pushedRef.current) return;
    pushedRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  return (
    <aside
      className={cn(
        "relative my-1 flex min-h-[72px] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.035] p-2 text-white md:min-h-[76px] md:gap-4 md:p-3",
        className
      )}
      aria-label="Advertisement"
    >
      <div className="hidden w-8 shrink-0 justify-center md:flex">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/35 text-zinc-500">
          <BadgeDollarSign size={14} />
        </span>
      </div>

      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 md:h-11 md:w-11">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,0,85,0.28),transparent_38%),linear-gradient(135deg,#18181b,#050505)]" />
        <span className="absolute inset-x-0 bottom-1 text-center text-[8px] font-black uppercase tracking-widest text-zinc-500">
          Ad
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">Advertisement</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="relative min-h-[42px] w-full overflow-hidden rounded-lg bg-black/20">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: 42 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={SONG_LIST_FEED_AD_SLOT}
            data-ad-format="fluid"
            data-ad-layout-key="+2a+rx+1+2-3"
            data-full-width-responsive="true"
            suppressHydrationWarning
          />
        </div>
      </div>
    </aside>
  );
}
