import { NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin } from "@/lib/admin-auth";
import { buildMediaUrl } from "@/lib/media";
import { r2 } from "@/lib/r2";

const ALLOWED_BITRATES = [64, 128, 256] as const;
const DEFAULT_TARGET_BITRATES = [64, 128];

type UploadCompleteError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

function serializeError(err: unknown): UploadCompleteError {
  if (err instanceof Error) return { message: err.message };

  if (err && typeof err === "object") {
    const value = err as Record<string, unknown>;
    return {
      code: typeof value.code === "string" ? value.code : undefined,
      details: typeof value.details === "string" ? value.details : undefined,
      hint: typeof value.hint === "string" ? value.hint : undefined,
      message: typeof value.message === "string" ? value.message : undefined,
    };
  }

  return { message: "Internal Server Error" };
}

function isMissingStreamingMigration(error: UploadCompleteError) {
  const text = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();

  return (
    text.includes("audio_status") ||
    text.includes("audio_version") ||
    text.includes("audio_error") ||
    text.includes("audio_validation") ||
    text.includes("fallback_audio_url") ||
    text.includes("encoding_jobs") ||
    (text.includes("relation") && text.includes("does not exist")) ||
    (text.includes("column") && text.includes("does not exist")) ||
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204"
  );
}

function dbErrorResponse(stage: string, err: unknown) {
  const error = serializeError(err);
  const migrationMissing = isMissingStreamingMigration(error);

  console.error(`[audio/uploads/complete] ${stage} failed`, error);

  return NextResponse.json(
    {
      error: migrationMissing
        ? "Streaming database migration is not applied yet."
        : "Upload completed, but the track could not be queued for encoding.",
      details: error.message || error.details || "Database operation failed.",
      code: error.code,
      hint: error.hint,
      stage,
      action: migrationMissing
        ? "Apply the latest Supabase audio streaming migrations, then retry this upload."
        : "Check the server console and Supabase logs for this failed upload.",
    },
    { status: migrationMissing ? 409 : 500 }
  );
}

function parseTargetBitrates(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_TARGET_BITRATES;

  const targetBitrates = Array.from(
    new Set(
      value
        .map((bitrate) => Number(bitrate))
        .filter((bitrate) => ALLOWED_BITRATES.includes(bitrate as (typeof ALLOWED_BITRATES)[number]))
    )
  ).sort((a, b) => a - b);

  return targetBitrates.length > 0 ? targetBitrates : DEFAULT_TARGET_BITRATES;
}

async function verifyOriginalInR2(sourceKey: string) {
  try {
    await r2.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: sourceKey,
      })
    );

    return null;
  } catch (err) {
    const error = serializeError(err);
    console.error("[audio/uploads/complete] r2.head-original failed", error);

    return NextResponse.json(
      {
        error: "Original audio was not found in Cloudflare R2.",
        details: error.message || error.details || `Missing object: ${sourceKey}`,
        code: error.code,
        hint: error.hint,
        stage: "r2.head-original",
        action:
          "Confirm the browser PUT to the signed upload URL succeeds and that the R2 bucket CORS allows PUT from this app origin.",
      },
      { status: 409 }
    );
  }
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const trackId = String(body.trackId || "");
    const sourceKey = String(body.sourceKey || "");
    const title = String(body.title || "Untitled Track").trim();
    const contentType = String(body.contentType || "");
    const sourceSize = Number(body.size || 0);
    const targetBitrates = parseTargetBitrates(body.targetBitrates);
    const includeFallback = body.includeFallback !== false;
    const extractEmbeddedCover = body.extractEmbeddedCover === true;

    if (!trackId || !sourceKey.startsWith(`originals/${trackId}/`)) {
      return NextResponse.json({ error: "Invalid upload session" }, { status: 400 });
    }

    const sourceMissingResponse = await verifyOriginalInR2(sourceKey);
    if (sourceMissingResponse) return sourceMissingResponse;

    const hlsUrl = buildMediaUrl(`tracks/${trackId}/audio/v2/hls/master.m3u8`);
    const fallbackAudioUrl = includeFallback ? buildMediaUrl(`tracks/${trackId}/audio/v2/fallback.m4a`) : null;

    const { data: track, error: trackError } = await supabase
      .from("tracks")
      .insert({
        id: trackId,
        title: title || "Untitled Track",
        hls_url: hlsUrl,
        fallback_audio_url: fallbackAudioUrl,
        audio_status: "queued",
        audio_version: "v2",
        audio_error: null,
        audio_validation: {},
      })
      .select("*")
      .single();

    if (trackError) {
      return dbErrorResponse("tracks.insert", trackError);
    }

    const { error: jobError } = await supabase.from("encoding_jobs").insert({
      track_id: trackId,
      source_key: sourceKey,
      source_content_type: contentType || null,
      source_size_bytes: Number.isFinite(sourceSize) ? sourceSize : null,
      target_bitrates: targetBitrates,
      include_fallback: includeFallback,
      extract_embedded_cover: extractEmbeddedCover,
      status: "queued",
    });

    if (jobError) {
      const { error: cleanupError } = await supabase.from("tracks").delete().eq("id", trackId);

      if (cleanupError) {
        console.error("[audio/uploads/complete] tracks.cleanup failed", serializeError(cleanupError));
      }

      return dbErrorResponse("encoding_jobs.insert", jobError);
    }

    return NextResponse.json({
      track,
      encodingJob: { trackId, status: "queued" },
    });
  } catch (err) {
    const error = serializeError(err);
    console.error("[audio/uploads/complete] unexpected failure", error);

    return NextResponse.json(
      {
        error: error.message || "Internal Server Error",
        details: error.details,
        code: error.code,
        hint: error.hint,
      },
      { status: 500 }
    );
  }
}
