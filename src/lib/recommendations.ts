import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { GeneratedPlaylist, RecommendationSection, RecommendedTrack, Track } from "@/types/music";

type RecommendationTrackRow = {
  track_id: string;
  score: number;
  reason: string;
};

export const DEFAULT_RECOMMENDATION_SECTIONS: RecommendationSection[] = [
  {
    slug: "daily-mix",
    title: "Daily Mix",
    description: "Fresh worship shaped by your recent listening.",
    enabled: true,
    sort_order: 10,
    algorithm_type: "daily_mix",
    fallback_genres: ["Worship", "Tamil Christian", "Gospel"],
    track_limit: 24,
    freshness_days: 30,
    min_signals: 1,
  },
  {
    slug: "because-you-liked",
    title: "Because You Liked",
    description: "Songs connected to your saved favorites.",
    enabled: true,
    sort_order: 20,
    algorithm_type: "because_liked",
    fallback_genres: ["Worship", "Gospel"],
    track_limit: 20,
    freshness_days: 60,
    min_signals: 1,
  },
  {
    slug: "your-genres",
    title: "Your Genres",
    description: "Built from the styles in your taste profile.",
    enabled: true,
    sort_order: 30,
    algorithm_type: "genre_affinity",
    fallback_genres: ["Tamil Christian", "Devotional"],
    track_limit: 20,
    freshness_days: 90,
    min_signals: 1,
  },
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
  {
    slug: "on-repeat",
    title: "On Repeat",
    description: "Songs you keep coming back to.",
    enabled: true,
    sort_order: 60,
    algorithm_type: "on_repeat",
    fallback_genres: ["Worship", "Gospel"],
    track_limit: 20,
    freshness_days: 45,
    min_signals: 2,
  },
  {
    slug: "saved-playlist-vibes",
    title: "Saved Playlist Vibes",
    description: "Inspired by your playlists and saved albums.",
    enabled: true,
    sort_order: 70,
    algorithm_type: "playlist_vibes",
    fallback_genres: ["Tamil Christian", "Acoustic"],
    track_limit: 20,
    freshness_days: 120,
    min_signals: 1,
  },
  {
    slug: "new-for-you",
    title: "New For You",
    description: "Newer songs that match your worship taste.",
    enabled: true,
    sort_order: 80,
    algorithm_type: "new_for_you",
    fallback_genres: ["Tamil Christian", "Christian Pop"],
    track_limit: 20,
    freshness_days: 45,
    min_signals: 0,
  },
  {
    slug: "artist-discovery",
    title: "Artist Discovery",
    description: "More artists connected to your recent listening.",
    enabled: true,
    sort_order: 90,
    algorithm_type: "artist_discovery",
    fallback_genres: ["Worship", "Devotional"],
    track_limit: 20,
    freshness_days: 90,
    min_signals: 1,
  },
];

export function getFallbackSection(slug: string) {
  return DEFAULT_RECOMMENDATION_SECTIONS.find((section) => section.slug === slug) || null;
}

export async function getRecommendationSections(
  supabase: SupabaseClient,
  user: Pick<User, "id"> | null
): Promise<RecommendationSection[]> {
  const { data, error } = await supabase.rpc("get_recommendation_sections", { uid: user?.id ?? null });

  if (error || !data?.length) {
    return DEFAULT_RECOMMENDATION_SECTIONS;
  }

  return data as RecommendationSection[];
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
      .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
      .eq("audio_status", "ready")
      .in("id", trackIds);

    const rowById = new Map(rows.map((row) => [row.track_id, row]));
    const trackById = new Map((data || []).map((track) => [track.id, track as Track]));
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
      .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
      .eq("audio_status", "ready");

    const { data } =
      fallbackIds.length > 0
        ? await query.in("id", fallbackIds)
        : await query.order("created_at", { ascending: false }).limit(limit);

    const byId = new Map((data || []).map((track) => [track.id, track as Track]));
    const ordered = fallbackIds.length > 0 ? fallbackIds.map((id) => byId.get(id)).filter(Boolean) : data || [];

    tracks = (ordered as Track[])
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
