// this ad is used in all album pages

"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function SquareGridAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    if (adRef.current) return;
    adRef.current = true;

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle ||[]).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  },[]);

  return (
    <div className="group block animate-in fade-in zoom-in duration-700">
      
      {/* 1. Square Container matching the Album Cards */}
      <div className="aspect-square relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden bg-zinc-900/40 shadow-xl border border-white/5 flex items-center justify-center">
        
        {/* Decorative Background to blend with theme */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 pointer-events-none z-0" />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#FF0055]/10 rounded-full blur-[40px] pointer-events-none z-0" />

        {/* 2. The Ad Slot */}
        <div className="w-full h-full flex items-center justify-center z-10 p-2">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client="ca-pub-8115646001024972"
            data-ad-slot="7678897893" /* Create a new Display Ad in AdSense and paste ID here */
            data-ad-format="rectangle, square" /* Forces AdSense to pick a square-ish shape */
            data-full-width-responsive="true"
            suppressHydrationWarning
          />
        </div>
      </div>
      
      {/* 3. Metadata matching the Album Text */}
      <div className="mt-4 px-2 flex items-center gap-1.5">
         <Sparkles size={12} className="text-[#FF0055]" />
         <h3 className="font-black text-zinc-500 uppercase tracking-[0.2em] text-[10px]">
           Sponsored
         </h3>
      </div>
    </div>
  );
}