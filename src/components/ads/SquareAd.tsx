"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function SquareAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ||[]).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  },[]);

  return (
    <div className="w-full max-w-[300px] mx-auto my-6 relative animate-in fade-in duration-1000">
      <div className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 shadow-2xl p-4 flex flex-col items-center justify-center min-h-[250px]">
        
        {/* Label */}
        <div className="absolute top-2 right-3 z-20 opacity-50 flex items-center gap-1">
          <Sparkles size={8} className="text-zinc-400" />
          <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Ad</span>
        </div>

        {/* The Ad Slot */}
        <div className="w-full h-full z-10 flex items-center justify-center">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "250px" }}
            data-ad-client="ca-pub-8115646001024972"
            data-ad-slot="7678897893" /* REPLACE THIS */
            data-ad-format="rectangle, square"
            data-full-width-responsive="false"
            suppressHydrationWarning
          />
        </div>
      </div>
    </div>
  );
}
