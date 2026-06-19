create table if not exists public.home_layout_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  section_type text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_layout_sections enable row level security;

drop policy if exists "Home layout sections are publicly readable" on public.home_layout_sections;
create policy "Home layout sections are publicly readable"
  on public.home_layout_sections
  for select
  using (true);

drop policy if exists "Admins manage home layout sections" on public.home_layout_sections;
create policy "Admins manage home layout sections"
  on public.home_layout_sections
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

insert into public.home_layout_sections (slug, title, description, section_type, enabled, sort_order, settings)
values
  ('quick-access', 'Start Here', 'Fast access to worship mixes and collections.', 'quick_access', true, 10, '{"max_items":6}'::jsonb),
  ('recommendation-mixes', 'Made For You', 'Auto-updating worship mixes from taste, trends, and listening history.', 'recommendation_mixes', true, 20, '{"max_items":10}'::jsonb),
  ('admin-playlists', 'Miracle FM Playlists', 'Editorial and station playlists curated by Miracle FM.', 'admin_playlists', true, 30, '{"max_items":8}'::jsonb),
  ('user-playlists', 'Your Playlists', 'Personal playlists from your library.', 'user_playlists', true, 40, '{"max_items":8}'::jsonb),
  ('albums', 'Albums', 'Fresh and popular worship albums.', 'albums', true, 50, '{"max_items":12}'::jsonb),
  ('artists', 'Artists', 'Worship leaders listeners are returning to most.', 'artists', true, 60, '{"max_items":12}'::jsonb),
  ('trending-songs', 'Trending Songs', 'Songs with real qualified listens from Miracle FM playback.', 'song_list', false, 70, '{"source":"trending","max_items":8}'::jsonb),
  ('new-songs', 'New Tamil Christian Songs', 'Fresh playable songs added to Miracle FM.', 'song_list', false, 80, '{"source":"new","max_items":8}'::jsonb),
  ('related-songs', 'Related Songs', 'More songs connected to artists you recently listened to.', 'song_list', false, 90, '{"source":"related","max_items":8}'::jsonb),
  ('feed-ad', 'Feed Ad', 'Native feed ad placement.', 'ad', true, 100, '{"variant":"feed"}'::jsonb),
  ('banner-ad', 'Banner Ad', 'Banner ad placement.', 'ad', true, 110, '{"variant":"banner"}'::jsonb)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  section_type = excluded.section_type,
  settings = public.home_layout_sections.settings || excluded.settings,
  updated_at = now();

grant select on public.home_layout_sections to anon, authenticated;
