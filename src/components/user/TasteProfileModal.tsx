"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const GENRES = [
  "Worship", "Gospel", "Contemporary", "Instrumental", 
  "Hymns", "Christian Pop", "Tamil Christian", "Sermon", 
  "Kids", "Devotional"
];

export default function TasteProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggle = (g: string) => {
    if (selected.includes(g)) setSelected(selected.filter(i => i !== g));
    else setSelected([...selected, g]);
  };

  const savePreferences = async () => {
    if (selected.length < 3) return toast.error("Select at least 3 styles");
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("user_interests")
        .upsert({ user_id: user.id, genres: selected });
      
      if (!error) {
        toast.success("Profile updated! Curating your feed...");
        window.location.reload(); // Refresh to load new mix
      }
    }
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* Background Blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 text-brand mb-2">
                <Sparkles size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Personalize</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">What moves you?</h2>
              <p className="text-zinc-500 font-medium mt-2">Select 3 or more styles to build your daily mix.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition"><X size={20} /></button>
          </div>

          <div className="flex flex-wrap gap-3 mb-10">
            {GENRES.map(g => {
              const active = selected.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggle(g)}
                  className={cn(
                    "px-6 py-3 rounded-full text-sm font-bold border-2 transition-all duration-300",
                    active 
                      ? "bg-brand border-brand text-white shadow-[0_0_20px_rgba(255,0,85,0.3)] scale-105" 
                      : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                  )}
                >
                  {g}
                </button>
              )
            })}
          </div>

          <button 
            onClick={savePreferences}
            disabled={loading}
            className="w-full bg-white text-black h-16 rounded-[1.5rem] font-black text-lg tracking-tight hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            {loading ? "Curating..." : `Create My Mix (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}