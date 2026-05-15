create or replace view public.track_listen_stats
as
select
  tracks.id as track_id,
  coalesce(count(play_events.id) filter (where play_events.event_type = 'listen_qualified'), 0)::bigint as qualified_listens
from public.tracks
left join public.play_events
  on play_events.track_id = tracks.id
group by tracks.id;

grant select on public.track_listen_stats to anon, authenticated;

drop policy if exists "Users read their own playback events" on public.play_events;
create policy "Users read their own playback events"
  on public.play_events
  for select
  using (auth.uid() = user_id);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_anonymous boolean not null default true,
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prayer_requests enable row level security;

drop policy if exists "Users manage their own prayer requests" on public.prayer_requests;
create policy "Users manage their own prayer requests"
  on public.prayer_requests
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Approved public prayers are readable" on public.prayer_requests;
create policy "Approved public prayers are readable"
  on public.prayer_requests
  for select
  using (visibility = 'public' and status = 'approved');
