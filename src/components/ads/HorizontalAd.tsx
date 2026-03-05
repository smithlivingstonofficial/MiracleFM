"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";

export default function HorizontalAd() {
  const adRef = useRef<boolean>(false);

  useEffect(() => {
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
    <div className="relative w-full mx-auto max-w-[1200px]">
      
      {/* 1. The Glass Container */}
      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900/40 border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-center p-6 md:p-8 gap-6">
        
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#FF0055]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* 2. "Sponsor" Label (Makes it look intentional) */}
        <div className="flex items-center gap-2 absolute top-4 left-6 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
            <Sparkles size={10} className="text-[#FF0055]" />
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Sponsored</span>
          </div>
        </div>

        {/* 3. The Ad Slot (Strictly Contained) */}
        <div className="w-full h-full min-h-[120px] md:min-h-[250px] flex items-center justify-center rounded-xl overflow-hidden mt-6 md:mt-0">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", height: "100%" }}
            data-ad-client="ca-pub-8115646001024972"
            data-ad-slot="7678897893" 
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
        
      </div>
    </div>
  );
}