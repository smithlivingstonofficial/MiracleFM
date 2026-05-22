import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildMediaUrl } from "@/lib/media";
import { r2 } from "@/lib/r2";
import { deleteR2File, deleteR2Folder } from "@/lib/r2-helpers";
import { deleteTrackMedia } from "@/lib/track-media-cleanup";

export const runtime = "nodejs";

const AUDIO_VERSION = "v2";
const ALL_VARIANTS = [
  { name: "64k", bitrate: 64, bandwidth: 76000 },
  { name: "128k", bitrate: 128, bandwidth: 152000 },
  { name: "256k", bitrate: 256, bandwidth: 304000 },
];

type DeleteMode = "track" | "audio" | "qualities" | "fallback" | "original";

function parseTrackIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function parseBitrates(value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(ALL_VARIANTS.map((variant) => variant.bitrate));
  return Array.from(new Set(value.map(Number).filter((bitrate) => allowed.has(bitrate)))).sort((a, b) => a - b);
}

function masterPlaylistFor(bitrates: number[]) {
  const variants = ALL_VARIANTS.filter((variant) => bitrates.includes(variant.bitrate));
  return [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    "#EXT-X-INDEPENDENT-SEGMENTS",
    ...variants.flatMap((variant) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},AVERAGE-BANDWIDTH=${variant.bitrate * 1000},CODECS="mp4a.40.2"`,
      `${variant.name}/index.m3u8`,
    ]),
    "",
  ].join("\n");
}

async function uploadMasterPlaylist(trackId: string, bitrates: number[]) {
  const key = `tracks/${trackId}/audio/${AUDIO_VERSION}/hls/master.m3u8`;
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: masterPlaylistFor(bitrates),
      ContentType: "application/vnd.apple.mpegurl",
      ContentDisposition: "inline",
      CacheControl: "public, max-age=60, must-revalidate",
    })
  );
}

async function refreshTrackAudioState(supabase: SupabaseClient, trackId: string) {
  const { data: variants, error: variantsError } = await supabase
    .from("track_audio_variants")
    .select("bitrate_kbps")
    .eq("track_id", trackId);

  if (variantsError) throw variantsError;

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("fallback_audio_url")
    .eq("id", trackId)
    .single();

  if (trackError) throw trackError;

  const remainingBitrates = (variants || []).map((variant) => Number(variant.bitrate_kbps)).sort((a, b) => a - b);
  const hasFallback = Boolean(track?.fallback_audio_url);

  if (remainingBitrates.length > 0) {
    await uploadMasterPlaylist(trackId, remainingBitrates);
    const { error } = await supabase
      .from("tracks")
      .update({
        hls_url: buildMediaUrl(`tracks/${trackId}/audio/${AUDIO_VERSION}/hls/master.m3u8`),
        audio_status: "ready",
        audio_error: null,
      })
      .eq("id", trackId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("tracks")
    .update({
      hls_url: null,
      audio_status: hasFallback ? "ready" : "legacy",
      audio_error: hasFallback ? null : "All playable encoded audio has been deleted.",
    })
    .eq("id", trackId);
  if (error) throw error;
}

async function deleteAudioOnly(supabase: SupabaseClient, trackId: string) {
  await deleteR2Folder(`tracks/${trackId}/audio/${AUDIO_VERSION}/`, { throwOnError: true });

  const { error: variantsError } = await supabase.from("track_audio_variants").delete().eq("track_id", trackId);
  if (variantsError) throw variantsError;

  const { error: trackError } = await supabase
    .from("tracks")
    .update({
      hls_url: null,
      fallback_audio_url: null,
      audio_status: "legacy",
      audio_error: "Encoded audio has been deleted.",
      audio_validation: {},
      encoded_at: null,
    })
    .eq("id", trackId);
  if (trackError) throw trackError;
}

async function deleteQualities(
  supabase: SupabaseClient,
  trackId: string,
  bitrates: number[]
) {
  if (bitrates.length === 0) throw new Error("Select at least one quality to delete.");

  for (const bitrate of bitrates) {
    await deleteR2Folder(`tracks/${trackId}/audio/${AUDIO_VERSION}/hls/${bitrate}k/`, { throwOnError: true });
  }

  const { error } = await supabase
    .from("track_audio_variants")
    .delete()
    .eq("track_id", trackId)
    .in("bitrate_kbps", bitrates);

  if (error) throw error;
  await refreshTrackAudioState(supabase, trackId);
}

async function deleteFallback(supabase: SupabaseClient, trackId: string) {
  await deleteR2File(`tracks/${trackId}/audio/${AUDIO_VERSION}/fallback.m4a`, { throwOnError: true });

  const { error } = await supabase
    .from("tracks")
    .update({ fallback_audio_url: null })
    .eq("id", trackId);

  if (error) throw error;
  await refreshTrackAudioState(supabase, trackId);
}

async function deleteOriginals(supabase: SupabaseClient, trackId: string) {
  const { data: jobs, error: jobsError } = await supabase
    .from("encoding_jobs")
    .select("id, source_key")
    .eq("track_id", trackId)
    .is("source_deleted_at", null);

  if (jobsError) throw jobsError;

  const sourceKeys = Array.from(new Set((jobs || []).map((job) => job.source_key).filter(Boolean)));
  for (const sourceKey of sourceKeys) {
    await deleteR2File(sourceKey, { throwOnError: true });
  }

  if (jobs?.length) {
    const { error } = await supabase
      .from("encoding_jobs")
      .update({ source_deleted_at: new Date().toISOString() })
      .in(
        "id",
        jobs.map((job) => job.id)
      );

    if (error) throw error;
  }
}

export async function POST(request: Request) {
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const mode = String(body.mode || "") as DeleteMode;
    const trackIds = parseTrackIds(body.trackIds);
    const bitrates = parseBitrates(body.bitrates);

    if (!["track", "audio", "qualities", "fallback", "original"].includes(mode)) {
      return NextResponse.json({ error: "Invalid delete mode." }, { status: 400 });
    }

    if (trackIds.length === 0) {
      return NextResponse.json({ error: "Select at least one track." }, { status: 400 });
    }

    for (const trackId of trackIds) {
      if (mode === "track") {
        await deleteTrackMedia(supabase, trackId, { strict: true });
        const { error } = await supabase.from("tracks").delete().eq("id", trackId);
        if (error) throw error;
      } else if (mode === "audio") {
        await deleteAudioOnly(supabase, trackId);
      } else if (mode === "qualities") {
        await deleteQualities(supabase, trackId, bitrates);
      } else if (mode === "fallback") {
        await deleteFallback(supabase, trackId);
      } else if (mode === "original") {
        await deleteOriginals(supabase, trackId);
      }
    }

    return NextResponse.json({ success: true, deleted: { mode, trackIds, bitrates } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
