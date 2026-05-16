import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteR2File, deleteR2Folder } from "@/lib/r2-helpers";

type TrackMediaCleanupOptions = {
  strict?: boolean;
};

type TrackMediaRow = {
  id: string;
  cover_url?: string | null;
  hls_url?: string | null;
  fallback_audio_url?: string | null;
};

type EncodingJobRow = {
  source_key?: string | null;
};

async function countByUrl(supabase: SupabaseClient, table: string, column: string, url: string) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, url);
  if (error) throw error;
  return count || 0;
}

async function isTrackCoverExclusive(supabase: SupabaseClient, coverUrl: string) {
  const [trackCount, albumCount, artistCount, playlistCount, bannerCount] = await Promise.all([
    countByUrl(supabase, "tracks", "cover_url", coverUrl),
    countByUrl(supabase, "albums", "cover_url", coverUrl),
    countByUrl(supabase, "artists", "image_url", coverUrl),
    countByUrl(supabase, "playlists", "cover_url", coverUrl),
    countByUrl(supabase, "banners", "image_url", coverUrl),
  ]);

  return trackCount <= 1 && albumCount === 0 && artistCount === 0 && playlistCount === 0 && bannerCount === 0;
}

export async function deleteTrackMedia(
  supabase: SupabaseClient,
  trackId: string,
  options: TrackMediaCleanupOptions = {}
) {
  const deleteOptions = { throwOnError: Boolean(options.strict) };
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("id, cover_url, hls_url, fallback_audio_url")
    .eq("id", trackId)
    .single<TrackMediaRow>();

  if (trackError) throw trackError;
  if (!track) return;

  const { data: jobs, error: jobsError } = await supabase
    .from("encoding_jobs")
    .select("source_key")
    .eq("track_id", trackId)
    .returns<EncodingJobRow[]>();

  if (jobsError) throw jobsError;

  await deleteR2Folder(`tracks/${trackId}/`, deleteOptions);
  await deleteR2Folder(`originals/${trackId}/`, deleteOptions);

  if (track.hls_url) await deleteR2File(track.hls_url, deleteOptions);
  if (track.fallback_audio_url) await deleteR2File(track.fallback_audio_url, deleteOptions);

  const extraSourceKeys = Array.from(
    new Set(
      (jobs || [])
        .map((job) => job.source_key)
        .filter((key): key is string => Boolean(key && !key.startsWith(`originals/${trackId}/`)))
    )
  );

  for (const sourceKey of extraSourceKeys) {
    await deleteR2File(sourceKey, deleteOptions);
  }

  if (track.cover_url && (await isTrackCoverExclusive(supabase, track.cover_url))) {
    await deleteR2File(track.cover_url, deleteOptions);
  }
}
