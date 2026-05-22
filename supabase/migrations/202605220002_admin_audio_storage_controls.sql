alter table public.encoding_jobs
  add column if not exists target_bitrates integer[] not null default array[64, 128],
  add column if not exists include_fallback boolean not null default true,
  add column if not exists source_deleted_at timestamptz;

update public.encoding_jobs
set target_bitrates = array[64, 128, 256]
where target_bitrates is null or cardinality(target_bitrates) = 0;
