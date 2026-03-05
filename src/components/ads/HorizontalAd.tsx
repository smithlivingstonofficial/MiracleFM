"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function HorizontalAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double-injection in React Strict Mode
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
    <div className="relative w-full mx-auto max-w-[1200px] my-4">
      
      {/* 1. The Glass Container */}
      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900/40 border border-white/5 shadow-xl flex flex-col items-center justify-center p-4 md:p-6 gap-4 min-h-[140px] md:min-h-[200px]">
        
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 pointer-events-none z-0" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#FF0055]/5 rounded-full blur-[80px] pointer-events-none z-0" />

        {/* 2. "Sponsor" Label */}
        <div className="absolute top-4 left-6 z-20">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
            <Sparkles size={10} className="text-[#FF0055]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Sponsored</span>
          </div>
        </div>

        {/* 3. The Ad Slot */}
        <div className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden mt-8 z-10">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client="ca-pub-8115646001024972"
            data-ad-slot="7678897893" 
            data-ad-format="horizontal" /* Changed from auto to horizontal to force banner shape */
            data-full-width-responsive="true"
            suppressHydrationWarning /* Prevents Next.js hydration mismatch errors */
          />
        </div>
        
      </div>
    </div>
  );
}