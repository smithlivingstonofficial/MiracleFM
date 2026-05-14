import { NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  type GetObjectCommandOutput,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { requireAdmin } from "@/lib/admin-auth";
import { buildMediaUrl, getMediaBaseUrl, getMediaKeyFromUrl } from "@/lib/media";
import { r2 } from "@/lib/r2";

export const runtime = "nodejs";

type StepStatus = "pass" | "warn" | "fail";

type HealthStep = {
  name: string;
  status: StepStatus;
  message: string;
  details?: Record<string, unknown>;
};

type PipelineIssue = {
  kind: "missing-original" | "missing-hls" | "missing-fallback";
  trackId: string;
  title?: string;
  key: string;
  status: string;
  message: string;
};

type SerializedError = {
  name?: string;
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const record = error as Error & { code?: string; details?: string; hint?: string };
    return {
      name: record.name,
      code: record.code,
      message: record.message,
      details: record.details,
      hint: record.hint,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === "string" ? record.name : undefined,
      code: typeof record.code === "string" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      details: typeof record.details === "string" ? record.details : undefined,
      hint: typeof record.hint === "string" ? record.hint : undefined,
    };
  }

  return { message: String(error) };
}

function isNotFound(error: unknown) {
  const serialized = serializeError(error);
  const text = [serialized.name, serialized.code, serialized.message].filter(Boolean).join(" ").toLowerCase();
  return text.includes("notfound") || text.includes("not found") || text.includes("404");
}

function migrationHint(error: SerializedError) {
  const text = [error.code, error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  if (
    text.includes("integration_health_checks") ||
    text.includes("encoding_jobs") ||
    text.includes("audio_status") ||
    text.includes("relation") ||
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204"
  ) {
    return "Apply the latest Supabase migrations, then run the health check again.";
  }

  return undefined;
}

async function bodyToText(body: GetObjectCommandOutput["Body"]) {
  if (!body) return "";

  if (
    typeof body === "object" &&
    "transformToString" in body &&
    typeof body.transformToString === "function"
  ) {
    return body.transformToString();
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function checkR2Object(key: string) {
  await r2.send(
    new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

async function runSupabaseCrud(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]) {
  const id = crypto.randomUUID();

  try {
    const { data: inserted, error: insertError } = await supabase
      .from("integration_health_checks")
      .insert({
        id,
        check_name: "storage-health",
        metadata: { source: "admin-storage-health" },
      })
      .select("id, status, check_name")
      .single();

    if (insertError) throw insertError;

    const { data: selected, error: selectError } = await supabase
      .from("integration_health_checks")
      .select("id, status, check_name")
      .eq("id", id)
      .single();

    if (selectError) throw selectError;

    const { data: updated, error: updateError } = await supabase
      .from("integration_health_checks")
      .update({
        status: "updated",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id, status")
      .single();

    if (updateError) throw updateError;

    const { error: deleteError } = await supabase.from("integration_health_checks").delete().eq("id", id);
    if (deleteError) throw deleteError;

    return {
      ok: true,
      details: {
        inserted: inserted?.id,
        selected: selected?.id,
        updatedStatus: updated?.status,
        deleted: id,
      },
    };
  } catch (error) {
    await supabase.from("integration_health_checks").delete().eq("id", id);
    throw error;
  }
}

async function runR2Crud() {
  const key = `diagnostics/${crypto.randomUUID()}.txt`;
  const body = `miracle-fm storage health ${new Date().toISOString()}`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: "text/plain; charset=utf-8",
        CacheControl: "no-store",
      })
    );

    await checkR2Object(key);

    const object = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    const downloaded = await bodyToText(object.Body);

    if (downloaded !== body) {
      throw new Error("R2 GET returned different content than the uploaded diagnostic object.");
    }

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );

    try {
      await checkR2Object(key);
      throw new Error("R2 diagnostic object still exists after delete.");
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    return { key };
  } catch (error) {
    await r2
      .send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        })
      )
      .catch(() => undefined);
    throw error;
  }
}

async function countRows(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: string,
  column: string,
  value: string
) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw error;
  return count || 0;
}

async function runPipelineChecks(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"]) {
  const counts = {
    jobs: {
      queued: await countRows(supabase, "encoding_jobs", "status", "queued"),
      encoding: await countRows(supabase, "encoding_jobs", "status", "encoding"),
      ready: await countRows(supabase, "encoding_jobs", "status", "ready"),
      failed: await countRows(supabase, "encoding_jobs", "status", "failed"),
    },
    tracks: {
      queued: await countRows(supabase, "tracks", "audio_status", "queued"),
      encoding: await countRows(supabase, "tracks", "audio_status", "encoding"),
      ready: await countRows(supabase, "tracks", "audio_status", "ready"),
      failed: await countRows(supabase, "tracks", "audio_status", "failed"),
      legacy: await countRows(supabase, "tracks", "audio_status", "legacy"),
    },
  };

  const issues: PipelineIssue[] = [];

  const { data: queuedJobs, error: queuedError } = await supabase
    .from("encoding_jobs")
    .select("id, track_id, source_key, status, attempts, error, created_at")
    .in("status", ["queued", "encoding", "failed"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (queuedError) throw queuedError;

  for (const job of queuedJobs || []) {
    try {
      await checkR2Object(job.source_key);
    } catch {
      issues.push({
        kind: "missing-original",
        trackId: job.track_id,
        key: job.source_key,
        status: job.status,
        message: "The encoding job points to an original audio object that was not found in R2.",
      });
    }
  }

  const { data: readyTracks, error: readyError } = await supabase
    .from("tracks")
    .select("id, title, hls_url, fallback_audio_url, audio_status, audio_version, created_at")
    .eq("audio_status", "ready")
    .order("created_at", { ascending: false })
    .limit(10);

  if (readyError) throw readyError;

  for (const track of readyTracks || []) {
    const version = track.audio_version || "v2";
    const key =
      getMediaKeyFromUrl(track.hls_url) || `tracks/${track.id}/audio/${version}/hls/master.m3u8`;
    try {
      await checkR2Object(key);
    } catch {
      issues.push({
        kind: "missing-hls",
        trackId: track.id,
        title: track.title,
        key,
        status: track.audio_status,
        message: "The track is marked ready, but its master HLS playlist was not found in R2.",
      });
    }

    const fallbackKey =
      getMediaKeyFromUrl(track.fallback_audio_url) || `tracks/${track.id}/audio/${version}/fallback.m4a`;
    try {
      await checkR2Object(fallbackKey);
    } catch {
      issues.push({
        kind: "missing-fallback",
        trackId: track.id,
        title: track.title,
        key: fallbackKey,
        status: track.audio_status,
        message: "The track is marked ready, but its progressive fallback audio was not found in R2.",
      });
    }
  }

  return { counts, issues };
}

export async function POST() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  const startedAt = new Date().toISOString();
  const steps: HealthStep[] = [
    {
      name: "Admin auth",
      status: "pass",
      message: "Current session is authenticated as an admin.",
    },
  ];

  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  steps.push({
    name: "Required environment",
    status: missing.length ? "fail" : "pass",
    message: missing.length
      ? `Missing required variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`
      : "All required Supabase and R2 variables are present.",
    details: {
      checked: REQUIRED_ENV,
      missing,
    },
  });

  const mediaBaseUrl = getMediaBaseUrl();
  const mediaDetails = {
    mediaBaseUrl: mediaBaseUrl || null,
    sampleHlsUrl: buildMediaUrl("tracks/example-track-id/audio/v2/hls/master.m3u8"),
    sampleFallbackUrl: buildMediaUrl("tracks/example-track-id/audio/v2/fallback.m4a"),
    usingFallbackR2PublicUrl:
      !process.env.NEXT_PUBLIC_MEDIA_BASE_URL && Boolean(process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
  };
  steps.push({
    name: "Media URL",
    status: !mediaBaseUrl ? "fail" : mediaDetails.usingFallbackR2PublicUrl ? "warn" : "pass",
    message: !mediaBaseUrl
      ? "No public media base URL is configured, so generated HLS links will be relative paths."
      : mediaDetails.usingFallbackR2PublicUrl
      ? "NEXT_PUBLIC_MEDIA_BASE_URL is missing; the app is falling back to NEXT_PUBLIC_R2_PUBLIC_URL."
      : "Public media base URL is configured.",
    details: mediaDetails,
  });

  try {
    const result = await runSupabaseCrud(supabase);
    steps.push({
      name: "Supabase CRUD",
      status: "pass",
      message: "Inserted, read, updated, and deleted a disposable diagnostic row.",
      details: result.details,
    });
  } catch (err) {
    const serialized = serializeError(err);
    steps.push({
      name: "Supabase CRUD",
      status: "fail",
      message: serialized.message || "Supabase diagnostic CRUD failed.",
      details: {
        ...serialized,
        action: migrationHint(serialized) || "Check Supabase logs, RLS policies, and admin profile permissions.",
      },
    });
  }

  if (missing.some((name) => name.startsWith("R2_"))) {
    steps.push({
      name: "Cloudflare R2 CRUD",
      status: "fail",
      message: "R2 CRUD was skipped because one or more required R2 variables are missing.",
    });
  } else {
    try {
      const result = await runR2Crud();
      steps.push({
        name: "Cloudflare R2 CRUD",
        status: "pass",
        message: "Uploaded, read, deleted, and confirmed removal of a disposable R2 object.",
        details: result,
      });
    } catch (err) {
      steps.push({
        name: "Cloudflare R2 CRUD",
        status: "fail",
        message: serializeError(err).message || "Cloudflare R2 diagnostic CRUD failed.",
        details: {
          ...serializeError(err),
          action: "Check R2 bucket name, account id, token permissions, and whether the bucket allows object writes.",
        },
      });
    }
  }

  try {
    const result = await runPipelineChecks(supabase);
    const hasIssues = result.issues.length > 0;
    const hasWaitingWork =
      result.counts.jobs.queued > 0 ||
      result.counts.jobs.encoding > 0 ||
      result.counts.tracks.queued > 0 ||
      result.counts.tracks.encoding > 0;

    steps.push({
      name: "Upload pipeline consistency",
      status: hasIssues ? "fail" : hasWaitingWork ? "warn" : "pass",
      message: hasIssues
        ? "Some queued or ready tracks point to R2 objects that were not found."
        : hasWaitingWork
        ? "No missing R2 objects were found, but there is queued or encoding work waiting for the encoder."
        : "No missing originals or ready HLS playlists were found in the sampled pipeline records.",
      details: result,
    });
  } catch (err) {
    const serialized = serializeError(err);
    steps.push({
      name: "Upload pipeline consistency",
      status: "fail",
      message: serialized.message || "Could not inspect upload pipeline state.",
      details: {
        ...serialized,
        action: migrationHint(serialized) || "Check that the streaming migration has been applied.",
      },
    });
  }

  const failed = steps.filter((step) => step.status === "fail").length;
  const warnings = steps.filter((step) => step.status === "warn").length;

  return NextResponse.json({
    ok: failed === 0,
    summary: {
      failed,
      warnings,
      passed: steps.filter((step) => step.status === "pass").length,
      startedAt,
      finishedAt: new Date().toISOString(),
    },
    steps,
  });
}
