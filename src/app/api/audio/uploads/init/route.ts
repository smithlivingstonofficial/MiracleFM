import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/lib/admin-auth";
import { r2 } from "@/lib/r2";

const MAX_AUDIO_UPLOAD_BYTES = 500 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
};

function extensionFrom(fileName: string, contentType: string) {
  const explicit = fileName.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return explicit || EXTENSION_BY_TYPE[contentType] || "audio";
}

function missingR2Env() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].filter(
    (key) => !process.env[key]
  );
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const missing = missingR2Env();
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Cloudflare R2 upload is not configured.",
          details: `Missing environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
          action: "Add the missing R2 variables to .env.local and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "");
    const size = Number(body.size || 0);

    if (!fileName || !contentType.startsWith("audio/")) {
      return NextResponse.json({ error: "Audio file required" }, { status: 400 });
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_AUDIO_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Audio file must be between 1 byte and 500 MB" },
        { status: 400 }
      );
    }

    const trackId = crypto.randomUUID();
    const extension = extensionFrom(fileName, contentType);
    const sourceKey = `originals/${trackId}/source.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: sourceKey,
      ContentType: contentType,
      CacheControl: "private, max-age=0, no-store",
      Metadata: {
        "original-name": encodeURIComponent(fileName),
        "miracle-track-id": trackId,
      },
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

    return NextResponse.json({
      trackId,
      sourceKey,
      uploadUrl,
      expiresIn: 3600,
    });
  } catch (err) {
    const details = err instanceof Error ? err.message : "Signed upload URL could not be created.";
    console.error("[audio/uploads/init] failed", err);

    return NextResponse.json(
      {
        error: "Could not create Cloudflare R2 upload URL.",
        details,
        action: "Check the R2 account id, bucket name, access key permissions, and bucket CORS.",
      },
      { status: 500 }
    );
  }
}
