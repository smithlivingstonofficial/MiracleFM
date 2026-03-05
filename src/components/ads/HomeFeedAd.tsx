"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function HomeFeedAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double-injection in React Strict Mode
    if (adRef.current) return;
    adRef.current = true;

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense Error:", err);
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900/40 border border-white/5 shadow-2xl p-6 md:p-8 animate-in fade-in duration-700">
      
      {/* 1. Header (To make it look like content) */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-zinc-500">
          Sponsored
        </span>
        <div className="h-[1px] flex-1 bg-white/5" />
      </div>

      {/* 2. The Google Ad Unit */}
      <div className="w-full min-h-[250px] md:min-h-[120px] flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%" }}
          data-ad-format="fluid"
          data-ad-layout-key="+2a+rx+1+2-3"
          data-ad-client="ca-pub-8115646001024972"
          data-ad-slot="6397247029"
        />
      </div>

      {/* 3. Footer Decor (To match your theme) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full pointer-events-none -mr-10 -mt-10" />
    </div>
  );
}