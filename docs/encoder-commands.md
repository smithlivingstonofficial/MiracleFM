# Miracle FM Encoder Commands

This is the day-to-day command reference for `scripts/encode-worker.mjs`.

Use this when you need to process new uploads, repair failed audio, add missing quality levels, regenerate fallback audio, or extract embedded cover artwork.

## Quick Mental Model

The encoder worker takes queued jobs from Supabase, downloads the original audio from R2, runs `ffmpeg`, uploads encoded files back to R2, then marks the track ready.

Normal encoded output:

```text
tracks/{trackId}/audio/v2/hls/master.m3u8
tracks/{trackId}/audio/v2/hls/64k/index.m3u8
tracks/{trackId}/audio/v2/hls/64k/init.mp4
tracks/{trackId}/audio/v2/hls/64k/seg_00000.m4s
tracks/{trackId}/audio/v2/hls/128k/...
tracks/{trackId}/audio/v2/hls/256k/...
tracks/{trackId}/audio/v2/fallback.m4a
```

Normal artwork output:

```text
tracks/{trackId}/cover/embedded.jpg
tracks/{trackId}/cover/embedded-square.jpg
tracks/{trackId}/cover/embedded-fit.jpg
tracks/{trackId}/cover/embedded-crop.jpg
```

Important: specific track re-encode commands overwrite existing encoded audio, so they require `--force`.

## Requirements

The worker reads `.env.local` or `.env` from the repo root.

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
NEXT_PUBLIC_MEDIA_BASE_URL
```

Optional:

```bash
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
ENCODER_POLL_INTERVAL_MS=15000
ENCODER_MAX_ATTEMPTS=3
ENCODER_HLS_TIME=6
ENCODER_UPLOAD_CONCURRENCY=8
ENCODER_STUCK_JOB_TIMEOUT_MS=1800000
```

What the optional values do:

- `FFMPEG_PATH`: path/name of the `ffmpeg` binary.
- `FFPROBE_PATH`: path/name of the `ffprobe` binary.
- `ENCODER_POLL_INTERVAL_MS`: wait time between queue checks in watch mode.
- `ENCODER_MAX_ATTEMPTS`: max retry attempts before a job is treated as failed.
- `ENCODER_HLS_TIME`: HLS segment length in seconds.
- `ENCODER_UPLOAD_CONCURRENCY`: number of encoded objects uploaded in parallel.
- `ENCODER_STUCK_JOB_TIMEOUT_MS`: old `encoding` jobs older than this are reset.

## Normal Queue Commands

### Run continuously

```bash
npm run worker:encode
```

What it does:

- Watches the queue forever.
- Picks the oldest queued encoding job.
- Encodes it.
- Uploads HLS/fallback/artwork when requested.
- Waits and checks again.

Use this on the machine that is acting as the encoder.

### Run continuously with readable alias

```bash
npm run worker:encode:watch
```

What it does:

- Same behavior as `npm run worker:encode`.
- Exists only as a clearer alias for long-running worker mode.

### Drain the queue and exit

```bash
npm run worker:encode:drain
```

What it does:

- Processes all queued jobs that are available now.
- Keeps working until the queue is empty.
- Exits when there is nothing left to encode.

Use this after a bulk upload when you want to finish everything and stop.

### Process one queued job and exit

```bash
npm run worker:encode -- --once
```

What it does:

- Processes at most one queued job.
- Exits after that one job finishes.

Use this for testing the encoder safely before leaving it running.

## Specific Track Commands

### Re-encode one track

```bash
npm run worker:encode -- --track "TRACK_ID" --force
```

What it does:

- Finds the encoding job/source for `TRACK_ID`.
- Downloads the original source file.
- Regenerates encoded HLS output.
- Uses the job's saved bitrate/fallback settings unless you override them.
- Overwrites the existing encoded audio for that track.

Example:

```bash
npm run worker:encode -- --track "0c4691f1-8499-4d19-80d5-985ba575076c" --force
```

Use this when one track has broken playback, missing HLS files, or bad metadata after encoding.

### Re-encode multiple tracks

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2,TRACK_ID_3" --force
```

What it does:

- Re-encodes each listed track one by one.
- Overwrites existing encoded audio for those tracks.

Example:

```bash
npm run worker:encode -- --tracks "id-one,id-two,id-three" --force
```

Use this when several selected tracks need the same repair.

### Named helper for one track

```bash
npm run worker:encode:track -- "TRACK_ID" --force
```

What it does:

- Same intent as `npm run worker:encode -- --track "TRACK_ID" --force`.
- The package script already includes `--track`, so you pass the id after `--`.

Example:

```bash
npm run worker:encode:track -- "0c4691f1-8499-4d19-80d5-985ba575076c" --force
```

## Quality Selection

Supported HLS qualities:

```text
64
128
256
```

If `--qualities` is omitted, the worker uses the job's saved target bitrates. Default uploads usually encode `64,128`.

### Generate 64k and 128k HLS

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "64,128"
```

What it does:

- Rebuilds the track with only 64k and 128k HLS variants.
- Keeps storage smaller than including 256k.

### Add or regenerate high quality 256k

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "64,128,256"
```

What it does:

- Rebuilds the track with all supported HLS qualities.
- Useful for important albums, featured songs, or premium-quality releases.

### Generate only 256k

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "256"
```

What it does:

- Generates only the 256k HLS variant.
- Use carefully: if the master playlist expects other qualities, prefer rebuilding all required qualities.

### Bulk add 256k without fallback

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --force --qualities "256" --no-fallback
```

What it does:

- Re-encodes only the 256k HLS variant for multiple tracks.
- Skips fallback M4A generation.

Use this when you only need to repair or add high-quality HLS objects and do not want extra fallback storage.

## Fallback Audio

Fallback audio is the progressive M4A file:

```text
tracks/{trackId}/audio/v2/fallback.m4a
```

It is important for mobile background playback because phones can handle a normal audio file more reliably than JavaScript-driven HLS while the screen is locked.

### Include fallback audio

```bash
npm run worker:encode -- --track "TRACK_ID" --force --fallback
```

What it does:

- Re-encodes HLS.
- Generates `fallback.m4a`.
- Updates `tracks.fallback_audio_url`.

Use this for tracks that need reliable mobile lock-screen playback.

### Skip fallback audio

```bash
npm run worker:encode -- --track "TRACK_ID" --force --no-fallback
```

What it does:

- Re-encodes HLS.
- Does not generate fallback M4A.

Use this when you want to save storage and do not need progressive fallback.

Do not pass `--fallback` and `--no-fallback` together.

## Embedded Cover Artwork

Artwork-only mode extracts covers from the original audio file without re-encoding audio.

### Extract artwork for one track

```bash
npm run worker:encode -- --track "TRACK_ID" --artwork-only
```

What it does:

- Downloads the original source audio.
- Extracts embedded cover art.
- Uploads raw, square, fit, and crop variants.
- Updates embedded cover fields on the track.
- Does not touch HLS or fallback audio.

### Extract artwork for multiple tracks

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2,TRACK_ID_3" --artwork-only
```

What it does:

- Runs artwork extraction for each listed track.
- Skips audio encoding.

### Force regenerate artwork

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --artwork-only --force-artwork
```

What it does:

- Regenerates embedded artwork even if artwork fields already exist.
- Useful after changing cover framing logic or fixing bad extracted covers.

Artwork-only mode requires `--track` or `--tracks`.

## Audio And Artwork Together

Queued uploads can request embedded cover extraction. When an encoding job has `extract_embedded_cover = true`, the worker extracts artwork during normal audio encoding.

### Re-encode audio and force artwork refresh

```bash
npm run worker:encode -- --track "TRACK_ID" --force --force-artwork
```

What it does:

- Re-encodes audio.
- Forces artwork regeneration only if the job is configured to extract embedded covers.

If you need artwork regeneration regardless of the job setting, use:

```bash
npm run worker:encode -- --track "TRACK_ID" --artwork-only --force-artwork
```

## Common Workflows

### After uploading many songs

```bash
npm run worker:encode:drain
```

What it does:

- Encodes all queued uploads.
- Stops when the queue is empty.

### Keep the encoder running all day

```bash
npm run worker:encode
```

What it does:

- Continuously watches for new uploads.
- Best for a dedicated encoder machine.

### Repair one broken song

```bash
npm run worker:encode -- --track "TRACK_ID" --force --qualities "64,128" --fallback
```

What it does:

- Rebuilds normal HLS qualities.
- Regenerates mobile-friendly fallback audio.
- Good first repair command for a track that fails on the user side.

### Repair several broken songs

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2,TRACK_ID_3" --force --qualities "64,128" --fallback
```

What it does:

- Applies the same repair to multiple tracks.

### Upgrade featured songs to all qualities

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --force --qualities "64,128,256" --fallback
```

What it does:

- Generates 64k, 128k, and 256k HLS.
- Generates fallback M4A.
- Best for albums/playlists that are promoted heavily.

### Regenerate only cover variants

```bash
npm run worker:encode -- --tracks "TRACK_ID_1,TRACK_ID_2" --artwork-only --force-artwork
```

What it does:

- Leaves audio alone.
- Rebuilds embedded cover variants.

## Troubleshooting

### The command says `--track requires a track id`

Use:

```bash
npm run worker:encode -- --track "TRACK_ID" --force
```

Do not leave the id blank.

### The command says `Use --force with --track/--tracks`

Specific track re-encoding overwrites existing output. Add `--force`:

```bash
npm run worker:encode -- --track "TRACK_ID" --force
```

Artwork-only commands do not require `--force`, unless you want to force existing artwork to regenerate with `--force-artwork`.

### The command says `--qualities requires a comma-separated list`

Use:

```bash
--qualities "64,128"
```

or:

```bash
--qualities "64,128,256"
```

Do not use unsupported values.

### Playback still fails after encoding

Check these first:

- The track row has `audio_status = ready`.
- `tracks.hls_url` points to `tracks/{trackId}/audio/v2/hls/master.m3u8`.
- If mobile lock-screen playback matters, `tracks.fallback_audio_url` is set.
- R2 public media domain and CORS are configured correctly.
- The original source still exists if you plan to re-encode.

## Notes For New Developers

- The worker is local. It is not automatically running unless someone starts it.
- The admin upload flow creates queued jobs; the worker processes those jobs.
- Running multiple workers at once is not recommended unless the job claim flow is upgraded.
- Re-encoding needs the original source file in R2.
- If the original source was deleted, the worker cannot regenerate HLS, fallback audio, or embedded covers.
- Encoded HLS files do not preserve embedded artwork; artwork extraction always reads the original master file.
- Use the admin track page to copy bulk commands for selected tracks when possible.
