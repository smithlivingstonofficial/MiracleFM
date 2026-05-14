alter table public.tracks
  add column if not exists fallback_audio_url text,
  add column if not exists audio_version text not null default 'v1',
  add column if not exists audio_error text,
  add column if not exists audio_validation jsonb not null default '{}'::jsonb;

create index if not exists idx_tracks_audio_status_version
  on public.tracks(audio_status, audio_version);
