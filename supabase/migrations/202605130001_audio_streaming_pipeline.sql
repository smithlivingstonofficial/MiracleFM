create table if not exists public.encoding_jobs (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  source_key text not null,
  source_content_type text,
  source_size_bytes bigint,
  status text not null default 'queued'
    check (status in ('queued', 'encoding', 'ready', 'failed')),
  attempts integer not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists encoding_jobs_status_created_at_idx
  on public.encoding_jobs(status, created_at);

create table if not exists public.track_audio_variants (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  bitrate_kbps integer not null,
  codec text not null default 'aac',
  playlist_url text not null,
  size_bytes bigint,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  unique(track_id, bitrate_kbps)
);

alter table public.tracks
  add column if not exists audio_status text not null default 'legacy'
    check (audio_status in ('legacy', 'queued', 'encoding', 'ready', 'failed')),
  add column if not exists duration_seconds numeric,
  add column if not exists loudness_lufs numeric,
  add column if not exists encoded_at timestamptz;

create table if not exists public.play_events (
  id uuid primary key default gen_random_uuid(),
  track_id uuid references public.tracks(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_type text not null
    check (event_type in (
      'play_start',
      'startup',
      'stall_start',
      'stall_recovered',
      'level_switch',
      'listen_qualified',
      'complete',
      'error'
    )),
  position_seconds numeric,
  duration_seconds numeric,
  startup_ms integer,
  stall_ms integer,
  hls_level integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists play_events_track_created_at_idx
  on public.play_events(track_id, created_at desc);

create index if not exists play_events_session_idx
  on public.play_events(session_id);

alter table public.encoding_jobs enable row level security;
alter table public.track_audio_variants enable row level security;
alter table public.play_events enable row level security;

drop policy if exists "Admins manage encoding jobs" on public.encoding_jobs;
create policy "Admins manage encoding jobs"
  on public.encoding_jobs
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Audio variants are public readable" on public.track_audio_variants;
create policy "Audio variants are public readable"
  on public.track_audio_variants
  for select
  using (true);

drop policy if exists "Admins manage audio variants" on public.track_audio_variants;
create policy "Admins manage audio variants"
  on public.track_audio_variants
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Anyone can insert playback events" on public.play_events;
create policy "Anyone can insert playback events"
  on public.play_events
  for insert
  with check (true);

drop policy if exists "Admins read playback events" on public.play_events;
create policy "Admins read playback events"
  on public.play_events
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
