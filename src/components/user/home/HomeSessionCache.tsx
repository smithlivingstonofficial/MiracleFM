"use client";

import { useEffect } from "react";
import { homeSessionCacheKey } from "@/lib/home-session-cache";
import type { GeneratedPlaylist, RecommendationSection } from "@/types/music";

type HomeSessionCacheProps = {
  userId?: string | null;
  sections: RecommendationSection[];
  playlists: GeneratedPlaylist[];
};

export default function HomeSessionCache({ userId, sections, playlists }: HomeSessionCacheProps) {
  useEffect(() => {
    try {
      const payload = {
        cachedAt: Date.now(),
        sections,
        playlists,
      };
      window.sessionStorage.setItem(homeSessionCacheKey(userId, "recommendations"), JSON.stringify(payload));

      for (const playlist of playlists) {
        window.sessionStorage.setItem(
          homeSessionCacheKey(userId, `mix:${playlist.section.slug}`),
          JSON.stringify({ cachedAt: payload.cachedAt, playlist })
        );
      }
    } catch {}
  }, [playlists, sections, userId]);

  return null;
}
