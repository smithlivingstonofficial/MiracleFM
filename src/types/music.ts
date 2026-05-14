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

export type Playlist = {
  id: string;
  title: string;
  cover_url?: string | null;
  user_id?: string | null;
  created_at?: string;
};

export const isPlayableTrack = (track: Track | null | undefined): track is PlayableTrack =>
  Boolean(track && track.audio_status === "ready" && (track.hls_url || track.fallback_audio_url));
