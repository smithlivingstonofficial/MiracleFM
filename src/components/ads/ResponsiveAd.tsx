"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADSENSE_CLIENT, HOME_FEED_AD_SLOT, RECTANGLE_AD_SLOT } from "@/lib/ads";

type ResponsiveAdProps = {
  variant?: "banner" | "feed" | "compact" | "grid";
  className?: string;
};

export default function ResponsiveAd({ variant = "feed", className }: ResponsiveAdProps) {
  const adRef = useRef(false);
  const isCompact = variant === "compact";
  const isBanner = variant === "banner";
  const isGrid = variant === "grid";
  const isRectangle = isCompact || isGrid;

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  if (isGrid) {
    return (
      <aside className={cn("group block min-w-0 animate-in fade-in zoom-in duration-700", className)} aria-label="Sponsored">
        <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/5 bg-zinc-900/40 shadow-xl md:rounded-[2rem]">
          <div className="pointer-events-none absolute inset-0 bg-[url('/noise.svg')] opacity-10" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#FF0055]/10 blur-[40px]" />
          <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit] p-2">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "100%" }}
              data-ad-client={ADSENSE_CLIENT}
              data-ad-slot={RECTANGLE_AD_SLOT}
              data-ad-format="rectangle, square"
              data-full-width-responsive="true"
              suppressHydrationWarning
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 px-2">
          <Sparkles size={12} className="text-[#FF0055]" />
          <h3 className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Sponsored</h3>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "mx-auto w-full",
        isCompact ? "my-5 max-w-[336px]" : "max-w-6xl px-4 md:px-8",
        isBanner && "my-6 md:my-8",
        variant === "feed" && "my-8 md:my-10",
        className
      )}
      aria-label="Sponsored"
    >
      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-white/[0.035] shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl",
          isCompact ? "rounded-[1.5rem] p-3" : "rounded-[1.75rem] p-3 md:p-4"
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#FF0055]/10 blur-3xl" />
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
            <Sparkles size={10} className="text-[#FF0055]" />
            Sponsored
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div
          className={cn(
            "relative z-10 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-black/25",
            isCompact
              ? "h-[250px]"
              : isBanner
                ? "h-[104px] sm:h-[112px] md:h-[132px]"
                : "h-[210px] sm:h-[220px] md:h-[240px]"
          )}
        >
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={isRectangle ? RECTANGLE_AD_SLOT : HOME_FEED_AD_SLOT}
            data-ad-format={isRectangle ? "rectangle, square" : "fluid"}
            data-ad-layout-key={isRectangle ? undefined : "+2a+rx+1+2-3"}
            data-full-width-responsive={isRectangle ? "false" : "true"}
            suppressHydrationWarning
          />
        </div>
      </div>
    </aside>
  );
}
