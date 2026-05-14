# Miracle FM Streaming Pipeline

## Runtime Shape

New uploads follow this path:

1. Admin uploads the original file through `/upload`.
2. `POST /api/audio/uploads/init` creates a signed R2 PUT URL for `originals/{trackId}/source.ext`.
3. `POST /api/audio/uploads/complete` creates the `tracks` row and queues `encoding_jobs`.
4. `npm run worker:encode` pulls queued jobs, encodes AAC HLS variants plus a progressive AAC fallback, uploads `tracks/{trackId}/audio/v2/*`, validates the public objects, and marks the track ready.
5. The player reads `tracks.hls_url` first and immediately falls back to `tracks.fallback_audio_url` if HLS preparation or playback fails.

Tracks stay hidden from user-facing queues until `audio_status = 'ready'`. Browser autoplay policies still apply: playback starts from the user's play gesture, then the app preserves that intent across HLS preparation and fallback loading.

## Storage Shape

Each encoded track uses versioned audio output paths:

```text
tracks/{trackId}/audio/v2/hls/master.m3u8
tracks/{trackId}/audio/v2/hls/64k/index.m3u8
tracks/{trackId}/audio/v2/hls/64k/init.mp4
tracks/{trackId}/audio/v2/hls/64k/seg_00000.m4s
tracks/{trackId}/audio/v2/hls/128k/...
tracks/{trackId}/audio/v2/hls/256k/...
tracks/{trackId}/audio/v2/fallback.m4a
```

## Required Environment

Set these for the Next.js app:

```bash
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.example.com
NEXT_PUBLIC_R2_PUBLIC_URL=https://legacy-or-r2-public-url.example
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

Set these for the encoder worker:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.example.com
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
```

## Cloudflare Delivery Requirements

Use a public Cloudflare custom media domain in `NEXT_PUBLIC_MEDIA_BASE_URL`; avoid private bucket endpoints and avoid relying on `r2.dev` for production playback.

Configure the R2 bucket CORS policy for the app origin:

```json
[
  {
    "AllowedOrigins": ["https://your-app.example.com"],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "ExposeHeaders": [
      "Accept-Ranges",
      "Content-Length",
      "Content-Range",
      "ETag",
      "Cache-Control"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

The encoder uploads HLS objects with these playback-safe types:

- `master.m3u8` and variant playlists: `application/vnd.apple.mpegurl`
- `*.m4s`: `video/iso.segment`
- `init.mp4`: `video/mp4`
- `fallback.m4a`: `audio/mp4`

If playback fails immediately, check the browser network panel for blocked `master.m3u8`, `index.m3u8`, `init.mp4`, first `.m4s`, or `fallback.m4a` requests. CORS failures usually appear as generic fetch failures in JavaScript even when the object exists in R2.

## Database

Apply these migrations before using the new upload flow:

```text
supabase/migrations/202605130001_audio_streaming_pipeline.sql
supabase/migrations/202605140002_audio_v2_fallback_validation.sql
```

The v2 fields are `hls_url`, `fallback_audio_url`, `audio_status`, `audio_version`, `duration_seconds`, `audio_error`, `audio_validation`, and `encoded_at`. New uploaded tracks move through `queued`, `encoding`, `ready`, or `failed`.

## Worker

Run continuously in production:

```bash
npm run worker:encode
```

Run one job and exit:

```bash
npm run worker:encode -- --once
```

Force-repair a previously encoded track after fixing encoder output:

```bash
npm run worker:encode -- --track TRACK_ID --force
```

The worker produces `64k`, `128k`, and `256k` AAC fMP4 HLS variants, plus `fallback.m4a` AAC-LC at 160k. It sets immutable cache headers on versioned audio objects and only marks tracks ready after validation.
