import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(repoRoot, fileName);
    if (!existsSync(envPath)) continue;

    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.error(`[encode-worker] Missing required env: ${name}`);
    process.exit(1);
  }
}

const mediaBaseUrl = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  ""
).replace(/\/+$/, "");

if (!mediaBaseUrl) {
  console.error("[encode-worker] Set NEXT_PUBLIC_MEDIA_BASE_URL for encoded HLS URLs.");
  process.exit(1);
}

if (mediaBaseUrl.includes(".r2.dev")) {
  console.warn(
    "[encode-worker] NEXT_PUBLIC_MEDIA_BASE_URL points at r2.dev. Use a Cloudflare R2 custom domain for production."
  );
}

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobePath = process.env.FFPROBE_PATH || "ffprobe";
const audioVersion = "v2";
const fallbackFileName = "fallback.m4a";
const pollOnce = process.argv.includes("--once");
const drainQueue = process.argv.includes("--drain");
const forceReencode = process.argv.includes("--force");
const trackArgIndex = process.argv.indexOf("--track");
const forcedTrackId = trackArgIndex === -1 ? null : process.argv[trackArgIndex + 1];
const pollIntervalMs = Number(process.env.ENCODER_POLL_INTERVAL_MS || 15_000);
const maxAttempts = Number(process.env.ENCODER_MAX_ATTEMPTS || 3);
const hlsTimeSeconds = Number(process.env.ENCODER_HLS_TIME || 6);
const uploadConcurrency = Math.max(1, Number(process.env.ENCODER_UPLOAD_CONCURRENCY || 8));
const stuckJobTimeoutMs = Math.max(
  60_000,
  Number(process.env.ENCODER_STUCK_JOB_TIMEOUT_MS || 30 * 60_000)
);

if (trackArgIndex !== -1 && (!forcedTrackId || forcedTrackId.startsWith("--"))) {
  console.error("[encode-worker] --track requires a track id.");
  process.exit(1);
}

if (forcedTrackId && !forceReencode) {
  console.error("[encode-worker] Use --force with --track to intentionally overwrite existing HLS output.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const variants = [
  { name: "64k", bitrate: 64, bandwidth: 76000 },
  { name: "128k", bitrate: 128, bandwidth: 152000 },
  { name: "256k", bitrate: 256, bandwidth: 304000 },
];

const outputPrefixFor = (trackId) => `tracks/${trackId}/audio/${audioVersion}`;
const publicUrlFor = (key) => `${mediaBaseUrl}/${key}`;

function formatMs(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code}: ${stderr || stdout}`));
    });
  });
}

async function getNextJob() {
  const { data, error } = await supabase
    .from("encoding_jobs")
    .select("*")
    .eq("status", "queued")
    .lt("attempts", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function resetStuckEncodingJobs() {
  const staleBefore = new Date(Date.now() - stuckJobTimeoutMs).toISOString();

  const { data, error } = await supabase
    .from("encoding_jobs")
    .select("id, track_id, attempts, started_at, updated_at")
    .eq("status", "encoding")
    .lt("updated_at", staleBefore);

  if (error) throw error;
  if (!data?.length) return 0;

  const resetAt = new Date().toISOString();
  const retryableJobs = data.filter((job) => (job.attempts || 0) < maxAttempts);
  const terminalJobs = data.filter((job) => (job.attempts || 0) >= maxAttempts);

  if (retryableJobs.length > 0) {
    const retryMessage = `Encoder job timed out locally after ${Math.round(
      stuckJobTimeoutMs / 60_000
    )} minutes; queued for retry.`;

    const { error: jobError } = await supabase
      .from("encoding_jobs")
      .update({
        status: "queued",
        error: retryMessage,
        updated_at: resetAt,
      })
      .in(
        "id",
        retryableJobs.map((job) => job.id)
      );

    if (jobError) throw jobError;

    const { error: trackError } = await supabase
      .from("tracks")
      .update({
        audio_status: "queued",
        audio_error: retryMessage,
      })
      .in(
        "id",
        retryableJobs.map((job) => job.track_id)
      );

    if (trackError) throw trackError;
  }

  if (terminalJobs.length > 0) {
    const failedMessage = `Encoder job timed out locally after ${Math.round(
      stuckJobTimeoutMs / 60_000
    )} minutes and reached the maximum attempt count.`;

    const { error: jobError } = await supabase
      .from("encoding_jobs")
      .update({
        status: "failed",
        error: failedMessage,
        updated_at: resetAt,
      })
      .in(
        "id",
        terminalJobs.map((job) => job.id)
      );

    if (jobError) throw jobError;

    const { error: trackError } = await supabase
      .from("tracks")
      .update({
        audio_status: "failed",
        audio_error: failedMessage,
      })
      .in(
        "id",
        terminalJobs.map((job) => job.track_id)
      );

    if (trackError) throw trackError;
  }

  console.log(
    `[encode-worker] Recovered ${retryableJobs.length} stuck job${
      retryableJobs.length === 1 ? "" : "s"
    }; marked ${terminalJobs.length} stuck job${terminalJobs.length === 1 ? "" : "s"} failed`
  );
  return data.length;
}

async function getJobForTrack(trackId) {
  const { data, error } = await supabase
    .from("encoding_jobs")
    .select("*")
    .eq("track_id", trackId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`No encoding job with an original source was found for track ${trackId}.`);
  }
  return data;
}

async function downloadSource(sourceKey, outputPath) {
  const result = await r2.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: sourceKey,
    })
  );

  if (!result.Body) throw new Error(`R2 object has no body: ${sourceKey}`);

  const body =
    result.Body instanceof Readable
      ? result.Body
      : Readable.fromWeb(result.Body.transformToWebStream());

  await pipeline(body, createWriteStream(outputPath));
}

async function getDurationSeconds(inputPath) {
  try {
    const { stdout } = await run(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    const duration = Number(stdout.trim());
    return Number.isFinite(duration) ? duration : null;
  } catch {
    return null;
  }
}

async function encodeAudio(inputPath, outputRoot, hlsRoot) {
  await mkdir(outputRoot, { recursive: true });
  await Promise.all(variants.map((variant) => mkdir(path.join(hlsRoot, variant.name), { recursive: true })));

  const hlsMaps = variants.flatMap(() => ["-map", "0:a:0"]);
  const hlsCodecOptions = variants.flatMap((variant, index) => [
    `-c:a:${index}`,
    "aac",
    `-b:a:${index}`,
    `${variant.bitrate}k`,
    `-ar:a:${index}`,
    "44100",
    `-ac:a:${index}`,
    "2",
  ]);

  await run(ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-vn",
    ...hlsMaps,
    ...hlsCodecOptions,
    "-f",
    "hls",
    "-hls_time",
    String(hlsTimeSeconds),
    "-hls_playlist_type",
    "vod",
    "-hls_segment_type",
    "fmp4",
    "-hls_fmp4_init_filename",
    path.join(hlsRoot, "%v", "init.mp4"),
    "-hls_segment_filename",
    path.join(hlsRoot, "%v", "seg_%05d.m4s"),
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    variants.map((variant, index) => `a:${index},name:${variant.name}`).join(" "),
    path.join(hlsRoot, "%v", "index.m3u8"),
    "-map",
    "0:a:0",
    "-c:a",
    "aac",
    "-profile:a",
    "aac_low",
    "-b:a",
    "160k",
    "-ar",
    "44100",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    path.join(outputRoot, fallbackFileName),
  ]);

  await writeMasterPlaylist(hlsRoot);
}

async function writeMasterPlaylist(outputRoot) {
  const lines = [
    "#EXTM3U",
    "#EXT-X-VERSION:7",
    "#EXT-X-INDEPENDENT-SEGMENTS",
    ...variants.flatMap((variant) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},AVERAGE-BANDWIDTH=${
        variant.bitrate * 1000
      },CODECS="mp4a.40.2"`,
      `${variant.name}/index.m3u8`,
    ]),
    "",
  ];

  await writeFile(path.join(outputRoot, "master.m3u8"), lines.join("\n"), "utf8");
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkFiles(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (filePath.endsWith(".m4s")) return "video/iso.segment";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".m4a")) return "audio/mp4";
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

function sortUploadFiles(files) {
  return [...files].sort((a, b) => {
    const aPlaylist = a.endsWith(".m3u8");
    const bPlaylist = b.endsWith(".m3u8");
    if (aPlaylist !== bPlaylist) return aPlaylist ? 1 : -1;
    if (a.endsWith("master.m3u8")) return 1;
    if (b.endsWith("master.m3u8")) return -1;
    return a.localeCompare(b);
  });
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function uploadOutput(trackId, outputRoot) {
  const files = sortUploadFiles(await walkFiles(outputRoot));
  const uploaded = [];
  const mediaFiles = files.filter((filePath) => !filePath.endsWith(".m3u8"));
  const playlistFiles = files.filter((filePath) => filePath.endsWith(".m3u8"));

  const uploadFile = async (filePath) => {
    const relative = path.relative(outputRoot, filePath).replaceAll(path.sep, "/");
    const key = `${outputPrefixFor(trackId)}/${relative}`;
    const fileStats = await stat(filePath);

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: createReadStream(filePath),
        ContentType: contentTypeFor(filePath),
        ContentDisposition: "inline",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    uploaded.push({ key, size: fileStats.size });
  };

  await runPool(mediaFiles, uploadConcurrency, uploadFile);
  await runPool(playlistFiles, uploadConcurrency, uploadFile);

  return uploaded;
}

async function checkPublicObject(key, expectedTypes) {
  const url = publicUrlFor(key);
  const result = {
    key,
    url,
    ok: false,
    status: null,
    contentType: null,
    contentLength: null,
  };

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-1" },
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type");
    const normalizedType = contentType?.split(";")[0].trim().toLowerCase() || null;

    result.status = response.status;
    result.contentType = contentType;
    result.contentLength =
      response.headers.get("content-range") || response.headers.get("content-length");
    result.ok =
      (response.ok || response.status === 206) &&
      (!normalizedType || expectedTypes.includes(normalizedType));
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function validatePlaybackOutput(trackId) {
  const prefix = outputPrefixFor(trackId);
  const checks = [
    checkPublicObject(`${prefix}/hls/master.m3u8`, [
      "application/vnd.apple.mpegurl",
      "application/x-mpegurl",
      "audio/mpegurl",
      "audio/x-mpegurl",
    ]),
    checkPublicObject(`${prefix}/${fallbackFileName}`, ["audio/mp4", "application/octet-stream"]),
    ...variants.flatMap((variant) => [
      checkPublicObject(`${prefix}/hls/${variant.name}/index.m3u8`, [
        "application/vnd.apple.mpegurl",
        "application/x-mpegurl",
        "audio/mpegurl",
        "audio/x-mpegurl",
      ]),
      checkPublicObject(`${prefix}/hls/${variant.name}/init.mp4`, [
        "video/mp4",
        "audio/mp4",
        "application/octet-stream",
      ]),
      checkPublicObject(`${prefix}/hls/${variant.name}/seg_00000.m4s`, [
        "video/iso.segment",
        "application/octet-stream",
      ]),
    ]),
  ];
  let objects = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    objects = await Promise.all(checks);
    if (objects.every((object) => object.ok)) break;
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
  }

  const failed = objects.filter((object) => !object.ok);

  return {
    ok: failed.length === 0,
    checkedAt: new Date().toISOString(),
    version: audioVersion,
    objects,
  };
}

async function sizeOfDir(dir) {
  const files = await walkFiles(dir);
  let total = 0;
  for (const file of files) total += (await stat(file)).size;
  return total;
}

async function markJob(job, patch) {
  const { error } = await supabase
    .from("encoding_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", job.id);

  if (error) throw error;
}

async function processJob(job) {
  const workDir = path.join(os.tmpdir(), `miraclefm-${job.track_id}-${randomUUID()}`);
  const sourcePath = path.join(workDir, "source");
  const outputRoot = path.join(workDir, "audio-v2");
  const hlsRoot = path.join(outputRoot, "hls");
  const jobStartedAt = performance.now();

  await mkdir(hlsRoot, { recursive: true });
  const nextAttempts = (job.attempts || 0) + 1;

  try {
    await markJob(job, {
      status: "encoding",
      attempts: nextAttempts,
      started_at: new Date().toISOString(),
      error: null,
    });

    await supabase
      .from("tracks")
      .update({ audio_status: "encoding", audio_error: null, audio_version: audioVersion })
      .eq("id", job.track_id);

    console.log(`[encode-worker] Downloading ${job.source_key}`);
    const downloadStartedAt = performance.now();
    await downloadSource(job.source_key, sourcePath);
    console.log(`[encode-worker] Downloaded ${job.track_id} in ${formatMs(performance.now() - downloadStartedAt)}`);

    console.log(`[encode-worker] Encoding ${job.track_id} in one ffmpeg pass`);
    const encodeStartedAt = performance.now();
    await encodeAudio(sourcePath, outputRoot, hlsRoot);
    console.log(`[encode-worker] Encoded ${job.track_id} in ${formatMs(performance.now() - encodeStartedAt)}`);

    const durationSeconds = await getDurationSeconds(sourcePath);
    const uploadStartedAt = performance.now();
    const uploaded = await uploadOutput(job.track_id, outputRoot);
    console.log(
      `[encode-worker] Uploaded ${uploaded.length} files for ${job.track_id} in ${formatMs(
        performance.now() - uploadStartedAt
      )}`
    );

    const validationStartedAt = performance.now();
    const validation = await validatePlaybackOutput(job.track_id);
    console.log(
      `[encode-worker] Validated ${job.track_id} in ${formatMs(performance.now() - validationStartedAt)}`
    );
    if (!validation.ok) {
      const failed = validation.objects
        .filter((object) => !object.ok)
        .map((object) => `${object.key} (${object.status || object.error || "invalid content type"})`)
        .join(", ");
      throw new Error(`Encoded audio validation failed: ${failed}`);
    }

    const variantRows = await Promise.all(
      variants.map(async (variant) => ({
        track_id: job.track_id,
        bitrate_kbps: variant.bitrate,
        codec: "aac",
        playlist_url: publicUrlFor(`${outputPrefixFor(job.track_id)}/hls/${variant.name}/index.m3u8`),
        size_bytes: await sizeOfDir(path.join(hlsRoot, variant.name)),
        duration_seconds: durationSeconds,
      }))
    );

    await supabase
      .from("track_audio_variants")
      .upsert(variantRows, { onConflict: "track_id,bitrate_kbps" });

    await supabase
      .from("tracks")
      .update({
        hls_url: publicUrlFor(`${outputPrefixFor(job.track_id)}/hls/master.m3u8`),
        fallback_audio_url: publicUrlFor(`${outputPrefixFor(job.track_id)}/${fallbackFileName}`),
        audio_status: "ready",
        audio_version: audioVersion,
        audio_error: null,
        audio_validation: validation,
        duration_seconds: durationSeconds,
        encoded_at: new Date().toISOString(),
      })
      .eq("id", job.track_id);

    await markJob(job, {
      status: "ready",
      completed_at: new Date().toISOString(),
      error: null,
    });

    console.log(`[encode-worker] Ready ${job.track_id} in ${formatMs(performance.now() - jobStartedAt)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[encode-worker] Failed ${job.track_id}: ${message}`);
    const terminal = forceReencode || nextAttempts >= maxAttempts;

    await markJob(job, {
      status: terminal ? "failed" : "queued",
      error: message.slice(0, 4000),
    });

    if (terminal) {
      await supabase
        .from("tracks")
        .update({ audio_status: "failed", audio_error: message.slice(0, 4000) })
        .eq("id", job.track_id);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function forceProcessTrack(trackId) {
  const job = await getJobForTrack(trackId);
  console.log(`[encode-worker] Force re-encoding ${trackId} from ${job.source_key}`);
  await processJob({
    ...job,
    attempts: -1,
  });
}

async function tick() {
  const job = await getNextJob();
  if (!job) return false;
  await processJob(job);
  return true;
}

console.log("[encode-worker] Listening for queued Miracle FM encoding jobs");

if (forcedTrackId) {
  await forceProcessTrack(forcedTrackId);
  process.exit(0);
}

do {
  await resetStuckEncodingJobs();
  const processed = await tick();
  if (pollOnce) break;
  if (drainQueue && !processed) break;
  if (!processed) await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
} while (true);
