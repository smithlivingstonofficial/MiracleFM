-- 1. Remove personalized recommendation sections to prevent their fetch/rendering
delete from public.recommendation_sections
where slug in (
  'daily-mix',
  'because-you-liked',
  'your-genres',
  'on-repeat',
  'saved-playlist-vibes',
  'new-for-you',
  'artist-discovery'
);

-- 2. Update get_personalized_mix RPC to query trending-now instead of daily-mix
-- This ensures backward compatibility for any layouts calling it
create or replace function public.get_personalized_mix(uid uuid, limit_count integer default 20)
returns table (id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select track_id as id
  from public.get_recommendation_tracks(uid, 'trending-now', limit_count);
$$;

-- 3. Instantly purge all historical recommendation impressions to recover database storage
truncate table public.recommendation_impressions;
