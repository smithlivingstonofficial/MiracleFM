delete from public.play_events a
using public.play_events b
where a.ctid > b.ctid
  and a.event_type = 'listen_qualified'
  and b.event_type = 'listen_qualified'
  and a.track_id = b.track_id
  and a.session_id = b.session_id;

create unique index if not exists play_events_unique_qualified_session_idx
  on public.play_events(track_id, session_id, event_type)
  where event_type = 'listen_qualified'
    and track_id is not null
    and session_id is not null;

create index if not exists play_events_track_event_created_idx
  on public.play_events(track_id, event_type, created_at desc);

create index if not exists user_likes_track_idx
  on public.user_likes(track_id);

create index if not exists playlist_tracks_track_idx
  on public.playlist_tracks(track_id);

create or replace view public.track_engagement_stats
as
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

create or replace view public.track_listen_stats
as
select
  track_id,
  qualified_listens
from public.track_engagement_stats;

grant select on public.track_engagement_stats to anon, authenticated;
grant select on public.track_listen_stats to anon, authenticated;

update public.tracks t
set play_count = stats.qualified_listens::integer
from public.track_engagement_stats stats
where stats.track_id = t.id;

create or replace function public.increment_track_play_count_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'listen_qualified' and new.track_id is not null then
    update public.tracks
    set play_count = coalesce(play_count, 0) + 1
    where id = new.track_id;
  end if;

  return new;
end;
$$;

drop trigger if exists increment_track_play_count_on_qualified_listen on public.play_events;
create trigger increment_track_play_count_on_qualified_listen
  after insert on public.play_events
  for each row
  when (new.event_type = 'listen_qualified')
  execute function public.increment_track_play_count_from_event();

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
      count(*) filter (where pe.event_type = 'listen_qualified') as quality_count,
      count(*) filter (where pe.event_type = 'complete') as complete_count,
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
    select distinct lower(genre_name) as genre
    from public.user_interests ui
    cross join unnest(ui.genres) as genres(genre_name)
    where uid is not null and ui.user_id = uid

    union

    select distinct lower(genre_name) as genre
    from public.tracks t
    cross join unnest(coalesce(t.genre, '{}')) as genres(genre_name)
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
        union select track_id from saved_album_tracks
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
        case (select algorithm_type from settings)
          when 'trending' then
            p.recent_7d_listens * 18 + p.recent_30d_listens * 4 + p.unique_listeners * 8 + p.engagement_score * 0.65
          when 'top_listened' then
            p.qualified_listens * 8 + p.complete_count * 10 + p.like_users * 18 + p.playlist_save_users * 24 + p.engagement_score
          when 'new_for_you' then
            case when p.created_at >= now() - interval '45 days' then 70 else 0 end
            + case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 38 else 0 end
            + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 32 else 0 end
            + p.engagement_score * 0.35
          when 'on_repeat' then
            coalesce((select re.quality_count * 34 + re.complete_count * 28 + re.event_count * 5 from recent_events re where re.track_id = p.id), 0)
            + case when p.id in (select track_id from liked_tracks) then 30 else 0 end
          when 'because_liked' then
            case when p.id in (select track_id from liked_tracks) then 12 else 0 end
            + case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 48 else 0 end
            + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 40 else 0 end
            + p.like_users * 3 + p.playlist_save_users * 4 + p.engagement_score * 0.35
          when 'genre_affinity' then
            case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 76 else 0 end
            + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 20 else 0 end
            + p.engagement_score * 0.3
          when 'playlist_vibes' then
            case when p.id in (select track_id from user_playlist_tracks) then 18 else 0 end
            + case when p.album_id in (select t.album_id from public.tracks t where t.id in (select track_id from saved_album_tracks) and t.album_id is not null) then 45 else 0 end
            + case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 34 else 0 end
            + p.playlist_save_users * 7 + p.playlist_adds * 2 + p.engagement_score * 0.25
          when 'artist_discovery' then
            case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 72 else 0 end
            + case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 26 else 0 end
            + p.engagement_score * 0.35
          else
            case when exists (select 1 from taste_genres tg where exists (select 1 from unnest(coalesce(p.genre, '{}')) as g(name) where lower(g.name) = tg.genre)) then 45 else 0 end
            + case when exists (select 1 from taste_artists ta where ta.artist_id = p.artist_id) then 38 else 0 end
            + coalesce((select re.quality_count * 16 + re.complete_count * 22 from recent_events re where re.track_id = p.id), 0)
            + p.engagement_score * 0.45
        end
        + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 10 else 0 end
        + case when p.created_at >= now() - interval '14 days' then 10 else 0 end
        - case when exists (
            select 1 from recent_events re
            where re.track_id = p.id
              and re.last_played_at >= now() - interval '18 hours'
          ) then 18 else 0 end
        + (abs(hashtext(p.id::text || section_slug || current_date::text)) % 100) / 100.0
      )::numeric as score
    from playable p
  )
  select
    scored.track_id,
    scored.score,
    case (select algorithm_type from settings)
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
  from scored
  where scored.score > 0
  order by scored.score desc
  limit (select desired_limit from settings);
$$;

grant execute on function public.get_recommendation_tracks(uuid, text, integer) to anon, authenticated;

drop function if exists public.get_personalized_mix(uuid, integer);

create or replace function public.get_personalized_mix(uid uuid, limit_count integer default 20)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select track_id as id
  from public.get_recommendation_tracks(uid, 'daily-mix', limit_count);
$$;

grant execute on function public.get_personalized_mix(uuid, integer) to authenticated;
