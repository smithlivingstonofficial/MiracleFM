// src/components/user/PlaylistCover.tsx

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ListMusic } from "lucide-react";

interface Props {
  playlistId: string;
  explicitCover?: string | null;
  className?: string;
  size?: number; // For icons
}

type PlaylistCoverItem = {
  tracks?: {
    cover_url?: string | null;
    albums?: { cover_url?: string | null } | null;
    artists?: { image_url?: string | null } | null;
  } | null;
};

export default function PlaylistCover({ playlistId, explicitCover, className, size = 48 }: Props) {
  const [covers, setCovers] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (explicitCover) return;
    let cancelled = false;

    async function fetchTrackCovers() {
      const { data } = await supabase
        .from("playlist_tracks")
        .select("tracks(cover_url, albums(cover_url), artists(image_url))")
        .eq("playlist_id", playlistId)
        .order("added_at", { ascending: true })
        .limit(4);

      if (data) {
        const extracted = data
          .map((item: PlaylistCoverItem) => item.tracks?.cover_url || item.tracks?.albums?.cover_url || item.tracks?.artists?.image_url)
          .filter((url): url is string => Boolean(url));
        if (!cancelled) setCovers(extracted);
      }
    }
    fetchTrackCovers();

    return () => {
      cancelled = true;
    };
  }, [playlistId, explicitCover, supabase]);

  if (explicitCover) {
    return (
      <div className={className}>
        <Image src={explicitCover} alt="Playlist cover" fill className="object-cover" sizes="(max-width: 768px) 50vw, 280px" />
      </div>
    );
  }

  if (covers.length >= 4) {
    return (
      <div className={`${className} grid grid-cols-2 grid-rows-2`}>
        {covers.slice(0, 4).map((url, i) => (
          <div key={i} className="relative w-full h-full border-[0.5px] border-black/10">
            <Image src={url} alt="Playlist cover artwork" fill className="object-cover" sizes="140px" />
          </div>
        ))}
      </div>
    );
  }

  if (covers.length > 0) {
    return (
      <div className={className}>
        <Image src={covers[0]} alt="Playlist cover" fill className="object-cover" sizes="(max-width: 768px) 50vw, 280px" />
      </div>
    );
  }

  return (
    <div className={`${className} bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-700`}>
      <ListMusic size={size} strokeWidth={1.5} />
    </div>
  );
}
