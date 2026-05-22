create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'listener',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists role text not null default 'listener',
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    'listener',
    now()
  )
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth_user();

insert into public.profiles (
  id,
  email,
  full_name,
  avatar_url,
  role,
  updated_at
)
select
  users.id,
  users.email,
  coalesce(
    nullif(users.raw_user_meta_data->>'full_name', ''),
    nullif(users.raw_user_meta_data->>'name', ''),
    split_part(coalesce(users.email, ''), '@', 1)
  ),
  nullif(users.raw_user_meta_data->>'avatar_url', ''),
  'listener',
  now()
from auth.users
on conflict (id) do update
set
  email = coalesce(excluded.email, public.profiles.email),
  full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
  avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
  updated_at = now();

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, update on public.profiles to authenticated;
