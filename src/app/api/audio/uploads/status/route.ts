import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getMediaKeyFromUrl } from "@/lib/media";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";

type ObjectCheck = {
  key: string | null;
  exists: boolean;
  error?: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

async function headR2Object(key: string | null): Promise<ObjectCheck> {
  if (!key) return { key, exists: false, error: "Missing object key" };

  try {
    await r2.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );

    return { key, exists: true };
  } catch (error) {
    return { key, exists: false, error: serializeError(error) };
  }
}

export async function GET(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const trackId = url.searchParams.get("trackId");

  if (!trackId) {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select(
      "id, title, hls_url, fallback_audio_url, audio_status, audio_version, audio_error, audio_validation, duration_seconds, encoded_at"
    )
    .eq("id", trackId)
    .single();

  if (trackError) {
    return NextResponse.json(
      {
        error: "Track status could not be loaded.",
        details: serializeError(trackError),
      },
      { status: 404 }
    );
  }

  const { data: job, error: jobError } = await supabase
    .from("encoding_jobs")
    .select("id, source_key, status, attempts, error, started_at, completed_at, updated_at")
    .eq("track_id", trackId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      {
        error: "Encoding job status could not be loaded.",
        details: serializeError(jobError),
      },
      { status: 500 }
    );
  }

  const masterKey = getMediaKeyFromUrl(track.hls_url) || `tracks/${trackId}/audio/v2/hls/master.m3u8`;
  const fallbackKey =
    getMediaKeyFromUrl(track.fallback_audio_url) || `tracks/${trackId}/audio/v2/fallback.m4a`;
  const variantChecks = ["64k", "128k", "256k"].flatMap((variant) => [
    [`${variant}Playlist`, `tracks/${trackId}/audio/v2/hls/${variant}/index.m3u8`] as const,
    [`${variant}Init`, `tracks/${trackId}/audio/v2/hls/${variant}/init.mp4`] as const,
    [`${variant}FirstSegment`, `tracks/${trackId}/audio/v2/hls/${variant}/seg_00000.m4s`] as const,
  ]);

  const [original, masterPlaylist, fallbackAudio, ...variantObjects] = await Promise.all([
    headR2Object(job?.source_key || null),
    headR2Object(masterKey),
    headR2Object(fallbackKey),
    ...variantChecks.map(([, key]) => headR2Object(key)),
  ]);

  const variants = Object.fromEntries(
    variantChecks.map(([name], index) => [name, variantObjects[index]])
  );
  const allValidatedObjects = [masterPlaylist, fallbackAudio, ...variantObjects];
  const ready = track.audio_status === "ready" && allValidatedObjects.every((object) => object.exists);
  const failed = track.audio_status === "failed" || job?.status === "failed";

  return NextResponse.json({
    ready,
    failed,
    track,
    encodingJob: job,
    objects: {
      original,
      masterPlaylist,
      fallbackAudio,
      variants,
    },
    nextAction: ready
      ? "Audio is ready to stream."
      : failed
      ? track.audio_error || "Review the encoding error, fix the source or worker, then retry the upload."
      : "Original is stored; keep the encoder worker running until validated HLS and fallback audio are published.",
  });
}
