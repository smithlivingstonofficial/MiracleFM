"use client";

import { useState } from "react";
import { Radio, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

interface Props {
  genres?: string[]; // Upgraded to array to match v2.5 DB schema
  artistId?: string; // Fallback: play this artist's tracks if no genres found
  label?: boolean;
}

export default function StartRadio({ genres, artistId, label = true }: Props) {
  const [loading, setLoading] = useState(false);
  const { setQueue } = usePlayerStore();
  const supabase = createClient();

  const handleStartRadio = async () => {
    // 1. Validation
    if ((!genres || genres.length === 0) && !artistId) {
      return toast.error("Not enough data to start a radio station.");
    }

    setLoading(true);
    let tracks: Track[] = [];

    try {
      // 2. Step 1: Try Genre-Based Radio (The Algorithmic Way)
      if (genres && genres.length > 0) {
        // Calling the RPC function we created in Phase 1
        const { data, error } = await supabase.rpc('get_radio_mix', { 
          target_genres: genres 
        });
        
        if (!error && data && data.length > 0) {
          tracks = data;
        }
      } 
      
      // 3. Step 2: Fallback to Artist-Based Radio if Genre fails/is empty
      if (tracks.length === 0 && artistId) {
        const { data } = await supabase
          .from("tracks")
          .select("*")
          .eq("artist_id", artistId)
          .eq("audio_status", "ready");
        
        if (data) {
          // Shuffle them manually for variety
          tracks = data.sort(() => Math.random() - 0.5);
        }
      }

      // 4. Step 3: Metadata Enrichment
      // RPC results often lack joined tables (artists/albums). 
      // We must fetch these so the player doesn't show "Unknown Artist".
      if (tracks.length > 0) {
        const trackIds = tracks.map((track) => track.id);
        
        const { data: enrichedTracks, error: fetchError } = await supabase
          .from("tracks")
          .select("*, artists(name, image_url), albums(title, cover_url)")
          .eq("audio_status", "ready")
          .in("id", trackIds);

        if (fetchError) throw fetchError;

        // Final Shuffle and Set Queue
        const finalQueue = (enrichedTracks || []).sort(() => Math.random() - 0.5);
        
        setQueue(finalQueue, 0);
        toast.success(`Radio started: ${genres?.[0] || "Artist"} Mix`, {
          icon: <Radio className="text-[#FF0055]" size={16} />
        });
      } else {
        toast.error("The radio is currently unavailable for this selection.");
      }

    } catch {
      toast.error("Signal lost. Failed to start radio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        handleStartRadio();
      }}
      disabled={loading}
      className="group flex items-center gap-3 text-zinc-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
    >
      <div className={cn(
        "p-2.5 rounded-full border border-white/10 transition-all duration-300",
        "group-hover:border-[#FF0055] group-hover:bg-[#FF0055]/10 group-hover:shadow-[0_0_15px_rgba(255,0,85,0.2)]",
        loading && "animate-pulse border-[#FF0055]"
      )}>
        {loading ? (
          <Loader2 size={20} className="animate-spin text-[#FF0055]" />
        ) : (
          <Radio size={20} className="group-hover:text-[#FF0055] transition-colors" />
        )}
      </div>
      
      {label && (
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#FF0055]">
            Launch
          </span>
          <span className="text-sm font-bold text-white group-hover:text-white">
            Station
          </span>
        </div>
      )}
    </button>
  );
}
