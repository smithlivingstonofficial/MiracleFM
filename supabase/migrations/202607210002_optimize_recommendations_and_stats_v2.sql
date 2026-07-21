-- 1. Create missing query optimization indexes for user-related fields
create index if not exists idx_play_events_user_id
  on public.play_events(user_id);

create index if not exists idx_play_events_user_created
  on public.play_events(user_id, created_at desc);

create index if not exists idx_playlists_user_id
  on public.playlists(user_id);

create index if not exists idx_playlist_tracks_playlist_id
  on public.playlist_tracks(playlist_id);

create index if not exists idx_followed_artists_user_id
  on public.followed_artists(user_id);

create index if not exists idx_saved_albums_user_id
  on public.saved_albums(user_id);

create index if not exists idx_user_interests_user_id
  on public.user_interests(user_id);


-- 2. Convert track_engagement_stats view to a Materialized View for instant queries
drop view if exists public.track_listen_stats cascade;
drop materialized view if exists public.track_engagement_stats cascade;
drop view if exists public.track_engagement_stats cascade;

-- Create materialized view
create materialized view public.track_engagement_stats as
with playback as (
  select
    pe.track_id,
    count(*) filter (where pe.event_type = 'listen_qualified')::bigint as qualified_listens,
    count(*) filter (where pe.event_type = 'complete')::bigint as complete_count,
    count(distinct pe.user_id) filter (where pe.user_id is not null and pe.event_type = 'listen_qualified')::bigint as unique_listeners,
    count(*) filter (
      where pe.event_type = 'listen_qualified'
        and pe.created_at >= now() - interval '7 days'
    )::bigint as recent_7d_listens,
    count(*) filter (
      where pe.event_type = 'listen_qualified'
        and pe.created_at >= now() - interval '30 days'
    )::bigint as recent_30d_listens
  from public.play_events pe
  where pe.track_id is not null
  group by pe.track_id
),
likes as (
  select
    ul.track_id,
    count(distinct ul.user_id)::bigint as like_users
  from public.user_likes ul
  group by ul.track_id
),
playlist_saves as (
  select
    pt.track_id,
    count(*)::bigint as playlist_adds,
    count(distinct p.user_id) filter (where p.user_id is not null)::bigint as playlist_save_users
  from public.playlist_tracks pt
  join public.playlists p on p.id = pt.playlist_id
  group by pt.track_id
)
select
  t.id as track_id,
  coalesce(playback.qualified_listens, 0)::bigint as qualified_listens,
  coalesce(playback.complete_count, 0)::bigint as complete_count,
  coalesce(playback.unique_listeners, 0)::bigint as unique_listeners,
  coalesce(likes.like_users, 0)::bigint as like_users,
  coalesce(playlist_saves.playlist_save_users, 0)::bigint as playlist_save_users,
  coalesce(playlist_saves.playlist_adds, 0)::bigint as playlist_adds,
  coalesce(playback.recent_7d_listens, 0)::bigint as recent_7d_listens,
  coalesce(playback.recent_30d_listens, 0)::bigint as recent_30d_listens,
  (
    ln(1 + coalesce(playback.qualified_listens, 0)) * 10
    + ln(1 + coalesce(playback.recent_7d_listens, 0)) * 18
    + ln(1 + coalesce(playback.recent_30d_listens, 0)) * 8
    + ln(1 + coalesce(playback.complete_count, 0)) * 14
    + ln(1 + coalesce(playback.unique_listeners, 0)) * 12
    + ln(1 + coalesce(likes.like_users, 0)) * 22
    + ln(1 + coalesce(playlist_saves.playlist_save_users, 0)) * 28
    + ln(1 + coalesce(playlist_saves.playlist_adds, 0)) * 12
    + case when t.created_at >= now() - interval '30 days' then 16 else 0 end
  )::numeric as engagement_score
from public.tracks t
left join playback on playback.track_id = t.id
left join likes on likes.track_id = t.id
left join playlist_saves on playlist_saves.track_id = t.id;

-- Create unique index to allow CONCURRENT refreshes
create unique index track_engagement_stats_track_id_idx
  on public.track_engagement_stats(track_id);

-- Recreate dependent track_listen_stats view
create or replace view public.track_listen_stats as
select
  track_id,
  qualified_listens
from public.track_engagement_stats;

-- Grant permissions back
grant select on public.track_engagement_stats to anon, authenticated;
grant select on public.track_listen_stats to anon, authenticated;


-- 3. Setup materialized view refresh strategy (pg_cron + probabilistic fallback trigger)
create or replace function public.refresh_track_engagement_stats()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.track_engagement_stats;
exception when others then
  -- Fallback if concurrent fails (e.g. if the materialized view was never populated)
  refresh materialized view public.track_engagement_stats;
end;
$$;

-- Schedule via pg_cron if active
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'refresh-engagement-stats-task',
      '*/15 * * * *',
      'select public.refresh_track_engagement_stats()'
    );
  end if;
exception when others then
  -- Fail silently if pg_cron scheduling isn't allowed/permitted
  null;
end;
$$;

-- Probabilistic trigger refresh (1% chance on new play events)
create or replace function public.trigger_refresh_track_engagement_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  if random() < 0.01 then
    perform public.refresh_track_engagement_stats();
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_refresh_stats on public.play_events;
create trigger trigger_refresh_stats
  after insert on public.play_events
  for each row
  execute function public.trigger_refresh_track_engagement_stats();


-- 4. Rewrite get_recommendation_tracks function in PL/pgSQL for high performance
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  algorithm_type_val text;
  fallback_genres_val text[];
  desired_limit_val integer;
  freshness_days_val integer;
  
  -- Pre-fetched taste variables for authenticated user
  liked_tracks_val uuid[] := '{}'::uuid[];
  taste_playlists_val uuid[] := '{}'::uuid[];
  taste_albums_val uuid[] := '{}'::uuid[];
  taste_genres_val text[] := '{}'::text[];
  taste_artists_val uuid[] := '{}'::uuid[];
begin
  -- Fetch configuration settings once
  select 
    coalesce(rs.algorithm_type, 'daily_mix'),
    coalesce(rs.fallback_genres, array['Worship', 'Tamil Christian']),
    least(greatest(coalesce(limit_count, rs.track_limit, 20), 4), 80),
    coalesce(rs.freshness_days, 30)
  into 
    algorithm_type_val,
    fallback_genres_val,
    desired_limit_val,
    freshness_days_val
  from public.recommendation_sections rs
  where rs.slug = section_slug and rs.enabled = true
  limit 1;

  if algorithm_type_val is null then
    algorithm_type_val := 'daily_mix';
    fallback_genres_val := array['Worship', 'Tamil Christian'];
    desired_limit_val := least(greatest(coalesce(limit_count, 20), 4), 80);
    freshness_days_val := 30;
  end if;

  -- Bypassing user lookup code entirely for guest request path to minimize database execution load
  if uid is null then
    return query
    with playable as (
      select
        t.id,
        t.genre,
        t.artist_id,
        t.album_id,
        t.created_at,
        coalesce(tes.qualified_listens, 0) as qualified_listens,
        coalesce(tes.complete_count, 0) as complete_count,
        coalesce(tes.unique_listeners, 0) as unique_listeners,
        coalesce(tes.like_users, 0) as like_users,
        coalesce(tes.playlist_save_users, 0) as playlist_save_users,
        coalesce(tes.playlist_adds, 0) as playlist_adds,
        coalesce(tes.recent_7d_listens, 0) as recent_7d_listens,
        coalesce(tes.recent_30d_listens, 0) as recent_30d_listens,
        coalesce(tes.engagement_score, 0) as engagement_score
      from public.tracks t
      left join public.track_engagement_stats tes on tes.track_id = t.id
      where t.audio_status = 'ready'
        and (t.hls_url is not null or t.fallback_audio_url is not null)
    ),
    scored as (
      select
        p.id as track_id,
        (
          case algorithm_type_val
            when 'trending' then
              p.recent_7d_listens * 18 + p.recent_30d_listens * 4 + p.unique_listeners * 8 + p.engagement_score * 0.65
            when 'top_listened' then
              p.qualified_listens * 8 + p.complete_count * 10 + p.like_users * 18 + p.playlist_save_users * 24 + p.engagement_score
            when 'new_for_you' then
              case when p.created_at >= now() - interval '45 days' then 70 else 0 end
              + p.engagement_score * 0.35
            when 'on_repeat' then
              p.engagement_score * 0.2
            when 'because_liked' then
              p.like_users * 3 + p.playlist_save_users * 4 + p.engagement_score * 0.35
            when 'genre_affinity' then
              case when p.genre && fallback_genres_val then 20 else 0 end
              + p.engagement_score * 0.3
            when 'playlist_vibes' then
              p.playlist_save_users * 7 + p.playlist_adds * 2 + p.engagement_score * 0.25
            when 'artist_discovery' then
              p.engagement_score * 0.35
            else
              p.engagement_score * 0.45
          end
          + case when p.genre && fallback_genres_val then 10 else 0 end
          + case when p.created_at >= now() - interval '14 days' then 10 else 0 end
          + (abs(hashtext(p.id::text || section_slug || current_date::text)) % 100) / 100.0
        )::numeric as score
      from playable p
    )
    select
      s.track_id,
      s.score,
      case algorithm_type_val
        when 'trending' then 'Trending from real listener engagement'
        when 'top_listened' then 'Top saved and listened on Miracle FM'
        when 'new_for_you' then 'Fresh song matched to your taste'
        when 'on_repeat' then 'Repeated in your listening'
        when 'because_liked' then 'Based on songs and artists you liked'
        when 'genre_affinity' then 'Matched to your genres'
        when 'playlist_vibes' then 'Inspired by songs saved to playlists'
        when 'artist_discovery' then 'Artist discovery from your listening'
        else 'Hybrid personalized recommendation'
      end as reason
    from scored s
    where s.score > 0
    order by s.score desc
    limit desired_limit_val;
  else
    -- Personalization pre-fetch (Authenticated users only)
    -- Pre-fetch liked tracks
    select coalesce(array_agg(ul.track_id), '{}'::uuid[]) into liked_tracks_val
    from public.user_likes ul
    where ul.user_id = uid;

    -- Pre-fetch playlist tracks
    select coalesce(array_agg(pt.track_id), '{}'::uuid[]) into taste_playlists_val
    from public.playlists p
    join public.playlist_tracks pt on pt.playlist_id = p.id
    where p.user_id = uid;

    -- Pre-fetch saved albums
    select coalesce(array_agg(sa.album_id), '{}'::uuid[]) into taste_albums_val
    from public.saved_albums sa
    where sa.user_id = uid;

    -- Pre-fetch taste genres using optimized array and index references
    select coalesce(array_agg(genre), '{}'::text[]) into taste_genres_val from (
      select distinct lower(genre_name) as genre
      from public.user_interests ui
      cross join unnest(ui.genres) as genres(genre_name)
      where ui.user_id = uid and ui.genres is not null

      union

      select distinct lower(genre_name) as genre
      from public.tracks t
      cross join unnest(coalesce(t.genre, '{}')) as genres(genre_name)
      where t.id = any(liked_tracks_val)
         or t.id = any(taste_playlists_val)
         or (t.album_id = any(taste_albums_val) and t.album_id is not null)
         or t.id in (
           select pe.track_id from public.play_events pe
           where pe.user_id = uid
             and pe.track_id is not null
             and pe.created_at >= now() - make_interval(days => freshness_days_val)
         )
    ) as g;

    -- Pre-fetch taste artists using optimized array and index references
    select coalesce(array_agg(artist_id), '{}'::uuid[]) into taste_artists_val from (
      select distinct t.artist_id
      from public.tracks t
      where t.artist_id is not null
        and (
          t.id = any(liked_tracks_val)
          or t.id = any(taste_playlists_val)
          or (t.album_id = any(taste_albums_val) and t.album_id is not null)
          or t.id in (
            select pe.track_id from public.play_events pe
            where pe.user_id = uid
              and pe.track_id is not null
              and pe.created_at >= now() - make_interval(days => freshness_days_val)
          )
        )

      union

      select fa.artist_id
      from public.followed_artists fa
      where fa.user_id = uid
    ) as a;

    return query
    with user_recent_events as (
      select
        pe.track_id,
        count(*) filter (where pe.event_type = 'listen_qualified') as quality_count,
        count(*) filter (where pe.event_type = 'complete') as complete_count,
        count(*) as event_count,
        max(pe.created_at) as last_played_at
      from public.play_events pe
      where pe.user_id = uid
        and pe.track_id is not null
        and pe.created_at >= now() - make_interval(days => freshness_days_val)
      group by pe.track_id
    ),
    playable as (
      select
        t.id,
        t.genre,
        t.artist_id,
        t.album_id,
        t.created_at,
        coalesce(tes.qualified_listens, 0) as qualified_listens,
        coalesce(tes.complete_count, 0) as complete_count,
        coalesce(tes.unique_listeners, 0) as unique_listeners,
        coalesce(tes.like_users, 0) as like_users,
        coalesce(tes.playlist_save_users, 0) as playlist_save_users,
        coalesce(tes.playlist_adds, 0) as playlist_adds,
        coalesce(tes.recent_7d_listens, 0) as recent_7d_listens,
        coalesce(tes.recent_30d_listens, 0) as recent_30d_listens,
        coalesce(tes.engagement_score, 0) as engagement_score,
        re.quality_count as recent_quality_count,
        re.complete_count as recent_complete_count,
        re.event_count as recent_event_count,
        re.last_played_at as recent_last_played_at
      from public.tracks t
      left join public.track_engagement_stats tes on tes.track_id = t.id
      left join user_recent_events re on re.track_id = t.id
      where t.audio_status = 'ready'
        and (t.hls_url is not null or t.fallback_audio_url is not null)
    ),
    scored as (
      select
        p.id as track_id,
        (
          case algorithm_type_val
            when 'trending' then
              p.recent_7d_listens * 18 + p.recent_30d_listens * 4 + p.unique_listeners * 8 + p.engagement_score * 0.65
            when 'top_listened' then
              p.qualified_listens * 8 + p.complete_count * 10 + p.like_users * 18 + p.playlist_save_users * 24 + p.engagement_score
            when 'new_for_you' then
              case when p.created_at >= now() - interval '45 days' then 70 else 0 end
              + case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 38 else 0 end
              + case when p.artist_id = any(taste_artists_val) then 32 else 0 end
              + p.engagement_score * 0.35
            when 'on_repeat' then
              coalesce(p.recent_quality_count * 34 + p.recent_complete_count * 28 + p.recent_event_count * 5, 0)
              + case when p.id = any(liked_tracks_val) then 30 else 0 end
            when 'because_liked' then
              case when p.id = any(liked_tracks_val) then 12 else 0 end
              + case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 48 else 0 end
              + case when p.artist_id = any(taste_artists_val) then 40 else 0 end
              + p.like_users * 3 + p.playlist_save_users * 4 + p.engagement_score * 0.35
            when 'genre_affinity' then
              case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 76 else 0 end
              + case when p.genre && fallback_genres_val then 20 else 0 end
              + p.engagement_score * 0.3
            when 'playlist_vibes' then
              case when p.id = any(taste_playlists_val) then 18 else 0 end
              + case when p.album_id = any(taste_albums_val) then 45 else 0 end
              + case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 34 else 0 end
              + p.playlist_save_users * 7 + p.playlist_adds * 2 + p.engagement_score * 0.25
            when 'artist_discovery' then
              case when p.artist_id = any(taste_artists_val) then 72 else 0 end
              + case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 26 else 0 end
              + p.engagement_score * 0.35
            else
              case when coalesce(string_to_array(lower(array_to_string(p.genre, '|')), '|'), '{}'::text[]) && taste_genres_val then 45 else 0 end
              + case when p.artist_id = any(taste_artists_val) then 38 else 0 end
              + coalesce(p.recent_quality_count * 16 + p.recent_complete_count * 22, 0)
              + p.engagement_score * 0.45
        end
        + case when p.genre && fallback_genres_val then 10 else 0 end
        + case when p.created_at >= now() - interval '14 days' then 10 else 0 end
        - case when p.recent_last_played_at >= now() - interval '18 hours' then 18 else 0 end
        + (abs(hashtext(p.id::text || section_slug || current_date::text)) % 100) / 100.0
      )::numeric as score
    from playable p
  )
  select
    s.track_id,
    s.score,
    case algorithm_type_val
      when 'trending' then 'Trending from real listener engagement'
      when 'top_listened' then 'Top saved and listened on Miracle FM'
      when 'new_for_you' then 'Fresh song matched to your taste'
      when 'on_repeat' then 'Repeated in your listening'
      when 'because_liked' then 'Based on songs and artists you liked'
      when 'genre_affinity' then 'Matched to your genres'
      when 'playlist_vibes' then 'Inspired by songs saved to playlists'
      when 'artist_discovery' then 'Artist discovery from your listening'
      else 'Hybrid personalized recommendation'
    end as reason
  from scored s
  where s.score > 0
  order by s.score desc
  limit desired_limit_val;
  end if;
end;
$$;


-- 5. Create general query plan explainer function for performance analysis
create or replace function public.explain_query(sql_query text)
returns table (explain_line text)
language plpgsql
security definer
as $$
begin
  return query execute 'explain (analyze, buffers, costs, verbose) ' || sql_query;
end;
$$;

grant execute on function public.explain_query(text) to authenticated, service_role;
