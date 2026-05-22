"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";
import GenrePicker from "@/components/admin/GenrePicker";
import { fallbackGenreRows } from "@/lib/genres";
import { clearHomeSessionCache } from "@/lib/home-session-cache";
import type { Genre } from "@/types/music";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialGenres?: string[];
}

export default function TasteProfileModal({ isOpen, onClose, initialGenres = [] }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>(fallbackGenreRows());
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Load existing genres when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(initialGenres);
    }
  }, [isOpen, initialGenres]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch("/api/genres")
      .then((response) => response.json())
      .then((result: { genres?: Genre[] }) => {
        if (!cancelled && result.genres?.length) setGenres(result.genres);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const savePreferences = async () => {
    if (selected.length < 1) return toast.error("Please select at least one style");
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("user_interests")
        .upsert({ user_id: user.id, genres: selected });
      
      if (!error) {
        clearHomeSessionCache();
        toast.success("Profile updated! Curating your feed...");
      } else {
        toast.error("Failed to save profile.");
      }
    }
    setLoading(false);
    onClose(); 
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        
        {/* Background Blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF0055]/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-2 text-[#FF0055] mb-2">
                <Sparkles size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Personalize</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">What moves you?</h2>
              <p className="text-zinc-500 font-medium mt-2">Select styles to build your daily mix.</p>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition text-zinc-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="mb-10 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">
            <GenrePicker
              genres={genres}
              selected={selected}
              onChange={setSelected}
              label="Styles"
            />
          </div>

          <button 
            onClick={savePreferences}
            disabled={loading}
            className="w-full bg-white text-black h-16 rounded-[1.5rem] font-black text-lg tracking-tight hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-2xl"
          >
            {loading ? "Curating..." : `Save Preferences (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
