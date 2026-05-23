# Miracle FM Encoder Commands

Command reference for `scripts/encode-worker.mjs`.

## Requirements

The worker reads `.env.local` or `.env` from the repo root.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
NEXT_PUBLIC_MEDIA_BASE_URL
```

Optional environment variables:

```bash
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
ENCODER_POLL_INTERVAL_MS=15000
ENCODER_MAX_ATTEMPTS=3
ENCODER_HLS_TIME=6
ENCODER_UPLOAD_CONCURRENCY=8
ENCODER_STUCK_JOB_TIMEOUT_MS=1800000
```

## Normal Queue Commands

Run continuously and process queued encoding jobs:

```bash
npm run worker:encode
```

Same as above, kept as a readable alias:

```bash
npm run worker:encode:watch
```

Process the queue until it is empty, then exit:

```bash
npm run worker:encode:drain
```

Process at most one queued job, then exit:

```bash
npm run worker:encode -- --once
```

## Encode Specific Tracks

Force re-encode one track from its preserved original source:

```bash
npm run worker:encode -- --track "TRACK_ID" --force
```

Force re-encode multiple tracks:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2,TRACK_ID_3" --force
```

Specific track commands require `--force` because they overwrite existing HLS output.

## Quality Selection

Supported qualities are `64`, `128`, and `256`.

Generate only 64k and 128k HLS:

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "64,128"
```

Generate 64k, 128k, and 256k HLS:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --force --qualities "64,128,256"
```

Generate only 256k HLS:

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "256"
```

If `--qualities` is omitted, the worker uses the job target bitrates. For default uploads, that is usually `64,128`.

## Fallback Audio

Include the 160k fallback M4A:

```bash
npm run worker:encode -- --track "TRACK_ID" --force --fallback
```

Skip fallback generation:

```bash
npm run worker:encode -- --track "TRACK_ID" --force --no-fallback
```

Do not pass `--fallback` and `--no-fallback` together.

## Embedded Cover Artwork

Extract embedded cover artwork only, without re-encoding audio:

```bash
npm run worker:encode -- --track "TRACK_ID" --artwork-only
```

Bulk extract embedded cover artwork:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2,TRACK_ID_3" --artwork-only
```

Force regenerate artwork variants even when candidates already exist:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --artwork-only --force-artwork
```

Artwork-only mode requires `--track` or `--tracks`.

The worker generates these cover files:

```text
tracks/{trackId}/cover/embedded.jpg
tracks/{trackId}/cover/embedded-square.jpg
tracks/{trackId}/cover/embedded-fit.jpg
tracks/{trackId}/cover/embedded-crop.jpg
```

Admin can then apply `Auto`, `Fit`, or `Crop` variants to `tracks.cover_url`.

## Audio And Artwork Together

Queued uploads can request embedded cover extraction. When `extract_embedded_cover` is true on the encoding job, the worker extracts cover variants during normal audio encoding.

Force re-encode audio and regenerate artwork:

```bash
npm run worker:encode -- --track "TRACK_ID" --force --force-artwork
```

This only regenerates artwork during audio encoding if the job has `extract_embedded_cover = true`. To regenerate artwork regardless of the job setting, use `--artwork-only --force-artwork`.

## Common Admin Workflows

Regenerate missing 256k quality without fallback:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --force --qualities "256" --no-fallback
```

Regenerate all HLS qualities and fallback:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --force --qualities "64,128,256" --fallback
```

Regenerate cover variants for selected tracks:

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --artwork-only --force-artwork
```

Drain all queued uploads:

```bash
npm run worker:encode:drain
```

## Notes

- The original source must still exist in R2 for specific re-encode or artwork-only commands.
- If the original source was deleted, the worker cannot regenerate HLS qualities or embedded covers.
- Encoded HLS output does not preserve cover art; artwork extraction uses the original master file.
- Use the admin track page to copy bulk commands for selected tracks.
