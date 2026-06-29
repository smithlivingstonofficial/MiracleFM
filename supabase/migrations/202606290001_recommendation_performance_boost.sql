-- Immediately purge recommendation impressions older than 30 days
delete from public.recommendation_impressions
where created_at < now() - interval '30 days';

-- Add index to event_type to speed up analytics aggregation/counting queries
create index if not exists idx_recommendation_impressions_event_type
  on public.recommendation_impressions(event_type);

-- Create cleanup function
create or replace function public.cleanup_old_recommendation_impressions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Probabilistically run cleanup to minimize write overhead (e.g. 5% chance on insert)
  if random() < 0.05 then
    delete from public.recommendation_impressions
    where created_at < now() - interval '30 days';
  end if;
  return new;
end;
$$;

-- Create trigger for cleanup on insert
drop trigger if exists trigger_cleanup_old_recommendation_impressions on public.recommendation_impressions;
create trigger trigger_cleanup_old_recommendation_impressions
  after insert on public.recommendation_impressions
  for each row
  execute function public.cleanup_old_recommendation_impressions();

-- Create optimized recommendation function
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
  liked_tracks_arr as (
    select coalesce(array_agg(track_id), '{}'::uuid[]) as tracks
    from liked_tracks
  ),
  user_playlist_tracks as (
    select pt.track_id
    from public.playlists p
    join public.playlist_tracks pt on pt.playlist_id = p.id
    where uid is not null and p.user_id = uid
  ),
  taste_playlists as (
    select coalesce(array_agg(track_id), '{}'::uuid[]) as tracks
    from user_playlist_tracks
  ),
  saved_album_tracks as (
    select t.id as track_id
    from public.saved_albums sa
    join public.tracks t on t.album_id = sa.album_id
    where uid is not null and sa.user_id = uid
  ),
  taste_albums as (
    select coalesce(array_agg(album_id), '{}'::uuid[]) as albums
    from public.saved_albums
    where uid is not null and user_id = uid
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
    select coalesce(array_agg(genre), '{}'::text[]) as genres from (
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
    ) as g
  ),
  taste_artists as (
    select coalesce(array_agg(artist_id), '{}'::uuid[]) as artists from (
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
    ) as a
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
    left join recent_events re on re.track_id = t.id
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
            + case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 38 else 0 end
            + case when p.artist_id = any(array(select unnest(artists) from taste_artists)) then 32 else 0 end
            + p.engagement_score * 0.35
          when 'on_repeat' then
            coalesce(p.recent_quality_count * 34 + p.recent_complete_count * 28 + p.recent_event_count * 5, 0)
            + case when p.id = any(array(select unnest(tracks) from liked_tracks_arr)) then 30 else 0 end
          when 'because_liked' then
            case when p.id = any(array(select unnest(tracks) from liked_tracks_arr)) then 12 else 0 end
            + case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 48 else 0 end
            + case when p.artist_id = any(array(select unnest(artists) from taste_artists)) then 40 else 0 end
            + p.like_users * 3 + p.playlist_save_users * 4 + p.engagement_score * 0.35
          when 'genre_affinity' then
            case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 76 else 0 end
            + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 20 else 0 end
            + p.engagement_score * 0.3
          when 'playlist_vibes' then
            case when p.id = any(array(select unnest(tracks) from taste_playlists)) then 18 else 0 end
            + case when p.album_id = any(array(select unnest(albums) from taste_albums)) then 45 else 0 end
            + case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 34 else 0 end
            + p.playlist_save_users * 7 + p.playlist_adds * 2 + p.engagement_score * 0.25
          when 'artist_discovery' then
            case when p.artist_id = any(array(select unnest(artists) from taste_artists)) then 72 else 0 end
            + case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 26 else 0 end
            + p.engagement_score * 0.35
          else
            case when string_to_array(lower(array_to_string(coalesce(p.genre, '{}'), '|')), '|') && array(select unnest(genres) from taste_genres) then 45 else 0 end
            + case when p.artist_id = any(array(select unnest(artists) from taste_artists)) then 38 else 0 end
            + coalesce(p.recent_quality_count * 16 + p.recent_complete_count * 22, 0)
            + p.engagement_score * 0.45
        end
        + case when coalesce(p.genre, '{}') && (select fallback_genres from settings) then 10 else 0 end
        + case when p.created_at >= now() - interval '14 days' then 10 else 0 end
        - case when p.recent_last_played_at >= now() - interval '18 hours' then 18 else 0 end
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
