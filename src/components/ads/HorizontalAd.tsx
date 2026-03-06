"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function HorizontalAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double-injection in React Strict Mode during development
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
    <div className="relative w-full mx-auto max-w-[1200px] my-6 md:my-10">
      
      {/* 1. The Glass Container - Strict max-height to prevent layout breaking */}
      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900/40 border border-white/5 shadow-xl flex flex-col items-center justify-center p-4 md:p-8">
        
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 pointer-events-none z-0" />
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#FF0055]/10 rounded-full blur-[100px] pointer-events-none z-0" />

        {/* 2. "Sponsor" Label */}
        <div className="absolute top-4 left-6 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <Sparkles size={10} className="text-[#FF0055]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Sponsored</span>
          </div>
        </div>

        {/* 3. The Ad Slot 
            CRITICAL: The wrapper div must have a strict, controlled height and width 
            to prevent the AdSense iframe from stretching the layout.
        */}
        <div className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden mt-8 md:mt-6 z-10 min-h-[150px] md:min-h-[250px]">
          <ins
            className="adsbygoogle"
            // Display block and exactly 100% width forces it to respect the parent div
            style={{ display: "block", width: "100%" }}
            data-ad-client="ca-pub-8115646001024972"
            data-ad-slot="6397247029" // Your original In-Feed slot ID
            data-ad-layout-key="+2a+rx+1+2-3" // Specific to your In-Feed ad style
            data-ad-format="fluid" // Required for In-Feed
            suppressHydrationWarning
          />
        </div>
        
      </div>
    </div>
  );
}