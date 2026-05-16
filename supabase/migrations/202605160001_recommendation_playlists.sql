create table if not exists public.user_interests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  genres text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, track_id)
);

create table if not exists public.recommendation_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  algorithm_type text not null
    check (algorithm_type in (
      'daily_mix',
      'because_liked',
      'genre_affinity',
      'trending',
      'top_listened',
      'on_repeat',
      'playlist_vibes',
      'new_for_you',
      'artist_discovery'
    )),
  fallback_genres text[] not null default '{}',
  track_limit integer not null default 20 check (track_limit between 4 and 80),
  freshness_days integer not null default 30 check (freshness_days between 1 and 365),
  min_signals integer not null default 1 check (min_signals between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  section_slug text not null references public.recommendation_sections(slug) on delete cascade,
  event_type text not null check (event_type in ('card_view', 'open', 'play')),
  track_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_likes_user_track
  on public.user_likes(user_id, track_id);

create index if not exists idx_recommendation_sections_enabled_order
  on public.recommendation_sections(enabled, sort_order);

create index if not exists idx_recommendation_impressions_slug_created
  on public.recommendation_impressions(section_slug, created_at desc);

alter table public.user_interests enable row level security;
alter table public.user_likes enable row level security;
alter table public.recommendation_sections enable row level security;
alter table public.recommendation_impressions enable row level security;

drop policy if exists "Users manage their own interests" on public.user_interests;
create policy "Users manage their own interests"
  on public.user_interests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own likes" on public.user_likes;
create policy "Users manage their own likes"
  on public.user_likes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Recommendation sections are readable" on public.recommendation_sections;
create policy "Recommendation sections are readable"
  on public.recommendation_sections
  for select
  using (true);

drop policy if exists "Admins manage recommendation sections" on public.recommendation_sections;
create policy "Admins manage recommendation sections"
  on public.recommendation_sections
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

drop policy if exists "Anyone can insert recommendation impressions" on public.recommendation_impressions;
create policy "Anyone can insert recommendation impressions"
  on public.recommendation_impressions
  for insert
  with check (true);

drop policy if exists "Admins read recommendation impressions" on public.recommendation_impressions;
create policy "Admins read recommendation impressions"
  on public.recommendation_impressions
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

insert into public.recommendation_sections
  (slug, title, description, sort_order, algorithm_type, fallback_genres, track_limit, freshness_days, min_signals)
values
  ('daily-mix', 'Daily Mix', 'Fresh worship shaped by your recent listening.', 10, 'daily_mix', array['Worship', 'Tamil Christian', 'Gospel'], 24, 30, 1),
  ('because-you-liked', 'Because You Liked', 'Songs connected to your saved favorites.', 20, 'because_liked', array['Worship', 'Gospel'], 20, 60, 1),
  ('your-genres', 'Your Genres', 'Built from the styles in your taste profile.', 30, 'genre_affinity', array['Tamil Christian', 'Devotional'], 20, 90, 1),
  ('trending-now', 'Trending Now', 'Songs Miracle FM listeners are playing right now.', 40, 'trending', array['Worship', 'Tamil Christian'], 20, 14, 0),
  ('top-listened', 'Top Listened', 'The most played worship songs on Miracle FM.', 50, 'top_listened', array['Worship'], 20, 365, 0),
  ('on-repeat', 'On Repeat', 'Songs you keep coming back to.', 60, 'on_repeat', array['Worship', 'Gospel'], 20, 45, 2),
  ('saved-playlist-vibes', 'Saved Playlist Vibes', 'Inspired by your playlists and saved albums.', 70, 'playlist_vibes', array['Tamil Christian', 'Acoustic'], 20, 120, 1),
  ('new-for-you', 'New For You', 'Newer songs that match your worship taste.', 80, 'new_for_you', array['Tamil Christian', 'Christian Pop'], 20, 45, 0),
  ('artist-discovery', 'Artist Discovery', 'More artists connected to your recent listening.', 90, 'artist_discovery', array['Worship', 'Devotional'], 20, 90, 1)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  algorithm_type = excluded.algorithm_type,
  fallback_genres = excluded.fallback_genres,
  track_limit = excluded.track_limit,
  freshness_days = excluded.freshness_days,
  min_signals = excluded.min_signals,
  updated_at = now();

create or replace function public.get_recommendation_sections(uid uuid default null)
returns table (
  id uuid,
  slug text,
  title text,
  description text,
  enabled boolean,
  sort_order integer,
  algorithm_type text,
  fallback_genres text[],
  track_limit integer,
  freshness_days integer,
  min_signals integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rs.id,
    rs.slug,
    rs.title,
    rs.description,
    rs.enabled,
    rs.sort_order,
    rs.algorithm_type,
    rs.fallback_genres,
    rs.track_limit,
    rs.freshness_days,
    rs.min_signals
  from public.recommendation_sections rs
  where rs.enabled = true
  order by rs.sort_order asc, rs.title asc;
$$;

create or replace function public.get_recommendation_tracks(
  uid uuid default null,
  section_slug text default 'daily-mix',
  limit_count integer default 20
)
returns table (
  track_id uuid,
  score numeric,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
  with section as (
    select *
    from public.recommendation_sections
    where slug = section_slug and enabled = true
    limit 1
  ),
  settings as (
    select
      coalesce((select algorithm_type from section), 'daily_mix') as algorithm_type,
      coalesce((select fallback_genres from section), array['Worship', 'Tamil Christian']) as fallback_genres,
      least(greatest(coalesce(limit_count, (select track_limit from section), 20), 4), 80) as desired_limit,
      coalesce((select freshness_days from section), 30) as freshness_days
  ),
  liked_tracks as (
    select ul.track_id
    from public.user_likes ul
    where uid is not null and ul.user_id = uid
  ),
  user_playlist_tracks as (
    select pt.track_id
    from public.playlists p
    join public.playlist_tracks pt on pt.playlist_id = p.id
    where uid is not null and p.user_id = uid
  ),
  saved_album_tracks as (
    select t.id as track_id
    from public.saved_albums sa
    join public.tracks t on t.album_id = sa.album_id
    where uid is not null and sa.user_id = uid
  ),
  recent_events as (
    select
      pe.track_id,
      count(*) filter (where pe.event_type in ('listen_qualified', 'complete')) as quality_count,
      count(*) as event_count,
      max(pe.created_at) as last_played_at
    from public.play_events pe
    cross join settings s
    where uid is not null
      and pe.user_id = uid
      and pe.track_id is not null
      and pe.created_at >= now() - make_interval(days => s.freshness_days)
    group by pe.track_id
  ),
  taste_genres as (
    select distinct unnest(ui.genres) as genre
    from public.user_interests ui
    where uid is not null and ui.user_id = uid

    union

    select distinct unnest(coalesce(t.genre, '{}')) as genre
    from public.tracks t
    where t.id in (
      select track_id from liked_tracks
      union select track_id from user_playlist_tracks
      union select track_id from saved_album_tracks
      union select track_id from recent_events
    )
  ),
  taste_artists as (
    select distinct t.artist_id
    from public.tracks t
    where t.artist_id is not null
      and t.id in (
        select track_id from liked_tracks
        union select track_id from user_playlist_tracks
        union select track_id from recent_events
      )

    union

    select fa.artist_id
    from public.followed_artists fa
    where uid is not null and fa.user_id = uid
  ),
  playable as (
    select
      t.id,
      t.genre,
      t.artist_id,
      t.album_id,
      t.created_at,
      coalesce(t.play_count, 0) as play_count,
      coalesce(tls.qualified_listens, 0) as qualified_listens
    from public.tracks t
    left join public.track_listen_stats tls on tls.track_id = t.id
    where t.audio_status = 'ready'
      and (t.hls_url is not null or t.fallback_audio_url is not null)
  ),
  scored as (
    select
      p.id as track_id,
      case (select algorithm_type from settings)
        when 'trending' then
          p.qualified_listens * 4 + p.play_count * 0.25
        when 'top_listened' then
          p.play_count * 2 + p.qualified_listens
        when 'new_for_you' then
          case when p.created_at >= now() - interval '45 days' then 60 else 0 end
          + case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 35 else 0 end
          + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 25 else 0 end
          + p.qualified_listens * 0.5
        when 'on_repeat' then
          coalesce((select re.quality_count * 35 + re.event_count * 8 from recent_events re where re.track_id = p.id), 0)
          + case when p.id in (select track_id from liked_tracks) then 25 else 0 end
        when 'because_liked' then
          case when p.id in (select track_id from liked_tracks) then 15 else 0 end
          + case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 45 else 0 end
          + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 35 else 0 end
          + p.qualified_listens * 0.4
        when 'genre_affinity' then
          case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 70 else 0 end
          + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 20 else 0 end
          + p.qualified_listens * 0.4
        when 'playlist_vibes' then
          case when p.album_id in (select t.album_id from public.tracks t where t.id in (select track_id from saved_album_tracks) and t.album_id is not null) then 45 else 0 end
          + case when p.id in (select track_id from user_playlist_tracks) then 20 else 0 end
          + case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 35 else 0 end
          + p.qualified_listens * 0.3
        when 'artist_discovery' then
          case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 65 else 0 end
          + case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 25 else 0 end
          + p.qualified_listens * 0.35
        else
          case when exists (select 1 from taste_genres tg where tg.genre = any(coalesce(p.genre, '{}'))) then 45 else 0 end
          + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 35 else 0 end
          + coalesce((select re.quality_count * 12 from recent_events re where re.track_id = p.id), 0)
          + p.qualified_listens * 0.4
      end
      + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 12 else 0 end
      + (abs(hashtext(p.id::text || section_slug)) % 100) / 100.0 as score
    from playable p
  )
  select
    scored.track_id,
    scored.score,
    case (select algorithm_type from settings)
      when 'trending' then 'Trending from qualified listens'
      when 'top_listened' then 'Top listened on Miracle FM'
      when 'new_for_you' then 'New songs matched to your taste'
      when 'on_repeat' then 'Repeated in your listening'
      when 'because_liked' then 'Based on songs you liked'
      when 'genre_affinity' then 'Matched to your genres'
      when 'playlist_vibes' then 'Inspired by your playlists'
      when 'artist_discovery' then 'Related artist discovery'
      else 'Personalized daily recommendation'
    end as reason
  from scored
  where scored.score > 0
  order by scored.score desc
  limit (select desired_limit from settings);
$$;

grant execute on function public.get_recommendation_sections(uuid) to anon, authenticated;
grant execute on function public.get_recommendation_tracks(uuid, text, integer) to anon, authenticated;
