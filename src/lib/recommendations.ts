import { createClient as createAnonClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { GeneratedPlaylist, RecommendationSection, RecommendedTrack, Track } from "@/types/music";

const RECOMMENDATION_TRACK_SELECT = "id, title, artist_id, album_id, hls_url, fallback_audio_url, audio_status, audio_version, cover_url, duration, duration_seconds, genre, play_count, artists(id, name, image_url), albums(id, title, cover_url)";

type RecommendationTrackRow = {
  track_id: string;
  score: number;
  reason: string;
};

export const DEFAULT_RECOMMENDATION_SECTIONS: RecommendationSection[] = [
  {
    slug: "trending-now",
    title: "Trending Now",
    description: "Songs Miracle FM listeners are playing right now.",
    enabled: true,
    sort_order: 40,
    algorithm_type: "trending",
    fallback_genres: ["Worship", "Tamil Christian"],
    track_limit: 20,
    freshness_days: 14,
    min_signals: 0,
  },
  {
    slug: "top-listened",
    title: "Top Listened",
    description: "The most played worship songs on Miracle FM.",
    enabled: true,
    sort_order: 50,
    algorithm_type: "top_listened",
    fallback_genres: ["Worship"],
    track_limit: 20,
    freshness_days: 365,
    min_signals: 0,
  },
];

export function getFallbackSection(slug: string) {
  return DEFAULT_RECOMMENDATION_SECTIONS.find((section) => section.slug === slug) || null;
}

export const getCachedRecommendationSections = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabaseAnon.rpc("get_recommendation_sections", { uid: null });

    if (error || !data?.length) {
      return DEFAULT_RECOMMENDATION_SECTIONS;
    }

    return data as RecommendationSection[];
  },
  ["recommendation-sections"],
  { revalidate: 3600, tags: ["home-data"] }
);

export async function getRecommendationSections(
  supabase?: SupabaseClient,
  user?: Pick<User, "id"> | null,
  forceFresh = false
): Promise<RecommendationSection[]> {
  if (!forceFresh) {
    return getCachedRecommendationSections();
  }

  if (!supabase) {
    throw new Error("Supabase client is required for forceFresh database fetch");
  }

  const { data, error } = await supabase.rpc("get_recommendation_sections", { uid: user?.id ?? null });

  if (error || !data?.length) {
    return DEFAULT_RECOMMENDATION_SECTIONS;
  }

  return data as RecommendationSection[];
}

export function getCachedRecommendationPlaylists(_userId?: string | null, limitPerSection = 12) {
  return unstable_cache(
    async () => {
      const supabaseAnon = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const sections = await getCachedRecommendationSections();
      const playlists = await Promise.all(
        sections.map((section) =>
          getRecommendationPlaylist(
            supabaseAnon,
            section,
            null,
            Math.min(section.track_limit, limitPerSection)
          )
        )
      );
      return playlists.filter((playlist) => playlist.tracks.length > 0);
    },
    ["recommendation-playlists-public", String(limitPerSection)],
    {
      revalidate: 3600, // 1 hour shared cache
      tags: ["home-data", "public-rec"],
    }
  )();
}

export async function getRecommendationPlaylist(
  supabase: SupabaseClient,
  section: RecommendationSection,
  user: Pick<User, "id"> | null,
  limitOverride?: number
): Promise<GeneratedPlaylist> {
  const limit = limitOverride || section.track_limit || 20;
  const { data: recommendationRows } = await supabase.rpc("get_recommendation_tracks", {
    uid: user?.id ?? null,
    section_slug: section.slug,
    limit_count: limit,
  });
  const rows = ((recommendationRows || []) as RecommendationTrackRow[]).filter((row) => row.track_id);
  const trackIds = rows.map((row) => row.track_id);

  let tracks: RecommendedTrack[] = [];
  if (trackIds.length > 0) {
    const { data } = await supabase
      .from("tracks")
      .select(RECOMMENDATION_TRACK_SELECT)
      .eq("audio_status", "ready")
      .in("id", trackIds);

    const rowById = new Map(rows.map((row) => [row.track_id, row]));
    const trackById = new Map((data as unknown as Track[] || []).map((track) => [track.id, track]));
    const orderedTracks = trackIds
      .map<RecommendedTrack | null>((id) => {
        const track = trackById.get(id);
        const row = rowById.get(id);
        if (!track || (!track.hls_url && !track.fallback_audio_url)) return null;
        return {
          ...track,
          recommendation_score: row?.score,
          recommendation_reason: row?.reason,
        };
      })
      .filter((track): track is RecommendedTrack => Boolean(track));
    tracks = orderedTracks;
  }

  if (tracks.length === 0) {
    let fallbackIds: string[] = [];
    if (section.algorithm_type !== "new_for_you") {
      const { data: stats } = await supabase
        .from("track_engagement_stats")
        .select("track_id")
        .order("engagement_score", { ascending: false })
        .limit(limit);
      fallbackIds = (stats || []).map((row) => row.track_id).filter(Boolean);
    }

    const query = supabase
      .from("tracks")
      .select(RECOMMENDATION_TRACK_SELECT)
      .eq("audio_status", "ready");

    const { data } =
      fallbackIds.length > 0
        ? await query.in("id", fallbackIds)
        : await query.order("created_at", { ascending: false }).limit(limit);

    const byId = new Map((data as unknown as Track[] || []).map((track) => [track.id, track]));
    const ordered = fallbackIds.length > 0 ? fallbackIds.map((id) => byId.get(id)).filter(Boolean) : data || [];

    tracks = (ordered as unknown as Track[])
      .filter((track) => Boolean(track.hls_url || track.fallback_audio_url))
      .map((track) => ({
        ...track,
        recommendation_score: 0,
        recommendation_reason: "Fallback recommendation",
      }));
  }

  return { section, tracks };
}

export async function getRecommendationPlaylists(
  supabase: SupabaseClient,
  sections: RecommendationSection[],
  user: Pick<User, "id"> | null,
  limitPerSection = 12
) {
  const playlists = await Promise.all(
    sections.map((section) => getRecommendationPlaylist(supabase, section, user, Math.min(section.track_limit, limitPerSection)))
  );

  return playlists.filter((playlist) => playlist.tracks.length > 0);
}
