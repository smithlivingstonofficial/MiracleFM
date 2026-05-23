alter table public.tracks
  add column if not exists embedded_cover_url text,
  add column if not exists embedded_cover_square_url text,
  add column if not exists embedded_cover_fit_url text,
  add column if not exists embedded_cover_crop_url text,
  add column if not exists embedded_cover_aspect_ratio numeric,
  add column if not exists embedded_cover_style text not null default 'auto',
  add column if not exists embedded_cover_extracted_at timestamptz,
  add column if not exists embedded_cover_error text;

alter table public.encoding_jobs
  add column if not exists extract_embedded_cover boolean not null default false;
