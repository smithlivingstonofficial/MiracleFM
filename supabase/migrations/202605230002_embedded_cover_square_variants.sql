alter table public.tracks
  add column if not exists embedded_cover_square_url text,
  add column if not exists embedded_cover_aspect_ratio numeric,
  add column if not exists embedded_cover_fit_url text,
  add column if not exists embedded_cover_crop_url text,
  add column if not exists embedded_cover_style text not null default 'auto';
