"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function PremiumAdCard() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double-injection in React Strict Mode
    if (adRef.current) return;
    adRef.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ||[]).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  },[]);

  return (
    <div className="w-full flex justify-center py-6 md:py-10 animate-in fade-in zoom-in-95 duration-700">
      
      {/* The Premium "Bento" Container */}
      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-zinc-900/30 border border-white/5 shadow-2xl p-4 md:p-6 backdrop-blur-md">
        
        {/* Subtle Background Glow */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[#FF0055]/10 rounded-full blur-[60px] pointer-events-none z-0" />

        {/* Sponsor Header */}
        <div className="relative z-10 flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#FF0055]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Sponsored Message
            </span>
          </div>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
            Ad
          </span>
        </div>

        {/* 
          The Exact-Size Ad Slot 
          Using inline-block and exact pixels prevents ANY layout shifting or stretching.
          300x250 is the industry standard "Medium Rectangle"
        */}
        <div className="relative z-10 w-[300px] h-[250px] bg-black/50 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center mx-auto border border-white/5">
          <ins
            className="adsbygoogle"
            style={{ display: "inline-block", width: "300px", height: "250px" }}
            data-ad-client="ca-pub-8115646001024972"
            // Replace with a standard Display Ad Slot ID
            data-ad-slot="6397247029" 
            suppressHydrationWarning
          />
        </div>
        
      </div>
    </div>
  );
}
