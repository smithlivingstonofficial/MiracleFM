alter table public.playlists
  add column if not exists description text,
  add column if not exists is_public boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.saved_albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, album_id)
);

create table if not exists public.followed_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, artist_id)
);

alter table public.saved_albums enable row level security;
alter table public.followed_artists enable row level security;

drop policy if exists "Users manage their saved albums" on public.saved_albums;
create policy "Users manage their saved albums"
  on public.saved_albums
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their followed artists" on public.followed_artists;
create policy "Users manage their followed artists"
  on public.followed_artists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public playlists are readable" on public.playlists;
create policy "Public playlists are readable"
  on public.playlists
  for select
  using (is_public = true or user_id is null);

drop policy if exists "Users manage their own playlists" on public.playlists;
create policy "Users manage their own playlists"
  on public.playlists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
