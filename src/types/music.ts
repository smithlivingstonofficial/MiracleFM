export type Artist = {
  id?: string;
  name: string;
  image_url?: string | null;
  bio?: string | null;
};

export type Album = {
  id?: string;
  title: string;
  cover_url?: string | null;
  created_at?: string;
  artists?: Pick<Artist, "id" | "name" | "image_url"> | null;
};

export type Track = {
  id: string;
  title: string;
  lyrics?: string | null;
  hls_url?: string | null;
  fallback_audio_url?: string | null;
  audio_status?: "legacy" | "queued" | "encoding" | "ready" | "failed";
  audio_version?: string | null;
  cover_url?: string | null;
  duration?: number | null;
  duration_seconds?: number | null;
  genre?: string[] | null;
  play_count?: number | null;
  artists?: Pick<Artist, "id" | "name" | "image_url"> | null;
  albums?: Pick<Album, "id" | "title" | "cover_url"> | null;
};

export type PlayableTrack = Track & {
  audio_status: "ready";
};

export type Genre = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type Playlist = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_public?: boolean;
};

export type RecommendationAlgorithm =
  | "daily_mix"
  | "because_liked"
  | "genre_affinity"
  | "trending"
  | "top_listened"
  | "on_repeat"
  | "playlist_vibes"
  | "new_for_you"
  | "artist_discovery";

export type RecommendationSection = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  enabled: boolean;
  sort_order: number;
  algorithm_type: RecommendationAlgorithm;
  fallback_genres?: string[] | null;
  track_limit: number;
  freshness_days: number;
  min_signals: number;
};

export type RecommendedTrack = Track & {
  recommendation_score?: number;
  recommendation_reason?: string;
};

export type GeneratedPlaylist = {
  section: RecommendationSection;
  tracks: RecommendedTrack[];
};

export const isPlayableTrack = (track: Track | null | undefined): track is PlayableTrack =>
  Boolean(track && track.audio_status === "ready" && (track.hls_url || track.fallback_audio_url));
