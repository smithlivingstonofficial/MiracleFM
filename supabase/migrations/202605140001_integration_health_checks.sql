create table if not exists public.integration_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_name text not null,
  status text not null default 'created'
    check (status in ('created', 'updated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_health_checks enable row level security;

drop policy if exists "Admins manage integration health checks" on public.integration_health_checks;
create policy "Admins manage integration health checks"
  on public.integration_health_checks
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
