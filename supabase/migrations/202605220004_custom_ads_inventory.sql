create table if not exists public.custom_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  target_link text,
  cta_label text not null default 'Learn More',
  placement text not null default 'all'
    check (placement in ('home_native', 'feed_fallback', 'all')),
  weight integer not null default 1 check (weight between 1 and 100),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_ads enable row level security;

create index if not exists custom_ads_active_placement_idx
  on public.custom_ads(is_active, placement, starts_at, ends_at, weight);

create or replace function public.set_custom_ads_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_custom_ads_updated_at on public.custom_ads;
create trigger set_custom_ads_updated_at
  before update on public.custom_ads
  for each row execute function public.set_custom_ads_updated_at();

drop policy if exists "Public can read active custom ads" on public.custom_ads;
create policy "Public can read active custom ads"
  on public.custom_ads
  for select
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "Admins can manage custom ads" on public.custom_ads;
create policy "Admins can manage custom ads"
  on public.custom_ads
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

grant select on public.custom_ads to anon, authenticated;
grant insert, update, delete on public.custom_ads to authenticated;
