create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_genres_active_order
  on public.genres(is_active, sort_order, name);

alter table public.genres enable row level security;

drop policy if exists "Genres are public readable" on public.genres;
create policy "Genres are public readable"
  on public.genres
  for select
  using (true);

drop policy if exists "Admins manage genres" on public.genres;
create policy "Admins manage genres"
  on public.genres
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

insert into public.genres (name, slug, sort_order)
values
  ('Worship', 'worship', 10),
  ('Gospel', 'gospel', 20),
  ('Contemporary', 'contemporary', 30),
  ('Instrumental', 'instrumental', 40),
  ('Hymns', 'hymns', 50),
  ('Christian Pop', 'christian-pop', 60),
  ('Tamil Christian', 'tamil-christian', 70),
  ('Sermon', 'sermon', 80),
  ('Kids', 'kids', 90),
  ('Devotional', 'devotional', 100),
  ('Live', 'live', 110),
  ('Acoustic', 'acoustic', 120)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  updated_at = now();
