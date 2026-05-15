"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ResponsiveAdProps = {
  variant?: "banner" | "feed" | "compact";
  className?: string;
};

const AD_CLIENT = "ca-pub-8115646001024972";
const FEED_SLOT = "6397247029";
const RECTANGLE_SLOT = "7678897893";

export default function ResponsiveAd({ variant = "feed", className }: ResponsiveAdProps) {
  const adRef = useRef(false);
  const isCompact = variant === "compact";
  const isBanner = variant === "banner";

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  return (
    <aside
      className={cn(
        "mx-auto w-full max-w-6xl px-4 md:px-8",
        isCompact ? "my-5 md:my-6" : "my-8 md:my-12",
        className
      )}
      aria-label="Sponsored"
    >
      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          isCompact ? "rounded-[1.5rem] p-3" : "rounded-[2rem] p-4 md:p-5"
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
              ? "min-h-[120px] md:min-h-[180px]"
              : isBanner
                ? "min-h-[120px] md:min-h-[160px]"
                : "min-h-[220px] md:min-h-[250px]"
          )}
        >
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%" }}
            data-ad-client={AD_CLIENT}
            data-ad-slot={isCompact ? RECTANGLE_SLOT : FEED_SLOT}
            data-ad-format={isCompact ? "rectangle, square" : "fluid"}
            data-ad-layout-key={isCompact ? undefined : "+2a+rx+1+2-3"}
            data-full-width-responsive={isCompact ? "false" : "true"}
            suppressHydrationWarning
          />
        </div>
      </div>
    </aside>
  );
}
