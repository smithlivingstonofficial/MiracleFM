"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import TrackRow from "@/components/user/TrackRow";
import { TrackListSkeleton } from "@/components/user/Skeletons";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import { readLocalCache, writeLocalCache } from "@/lib/local-cache";
import type { Track } from "@/types/music";

type HistoryRow = {
  track_id: string | null;
  created_at: string;
  tracks: Track | Track[] | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const cacheKey = `history:${user.id}`;
      const cached = readLocalCache<Track[]>(cacheKey);
      if (cached) {
        setTracks(cached);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("play_events")
        .select("track_id, created_at, tracks(*, artists(name, image_url), albums(title, cover_url))")
        .eq("user_id", user.id)
        .eq("event_type", "listen_qualified")
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled) return;

      const seen = new Set<string>();
      const uniqueTracks =
        ((data || []) as HistoryRow[])
          .map((row) => (Array.isArray(row.tracks) ? row.tracks[0] : row.tracks))
          .filter((track): track is Track => {
            if (!track || track.audio_status !== "ready" || seen.has(track.id)) return false;
            seen.add(track.id);
            return true;
          }) || [];

      setTracks(uniqueTracks);
      writeLocalCache(cacheKey, uniqueTracks);
      setLoading(false);
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 pb-40 text-white md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <History size={12} /> Listening History
          </div>
          <h1 className="text-4xl font-black tracking-tighter md:text-6xl">Recently Played</h1>
          <p className="max-w-2xl text-sm font-medium leading-6 text-zinc-500">
            Songs appear here after a valid listen, so quick skips do not fill your history.
          </p>
        </div>

        {loading ? (
          <TrackListSkeleton rows={8} />
        ) : tracks.length > 0 ? (
          <>
            <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-2">
              {tracks.map((track, index) => (
                <div key={track.id}>
                  <TrackRow track={track} index={index} context="History" allTracks={tracks} />
                  {shouldRenderSongListAdAfter(index, tracks.length) && <SongListAdRow />}
                </div>
              ))}
            </div>
            {tracks.length > 3 && tracks.length < 8 && <ResponsiveAd variant="banner" className="px-0" />}
          </>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Clock3 size={40} className="mx-auto mb-4 text-zinc-700" />
            <h2 className="text-xl font-black text-white">No history yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Listen for at least 30 seconds and your worship history will begin here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
