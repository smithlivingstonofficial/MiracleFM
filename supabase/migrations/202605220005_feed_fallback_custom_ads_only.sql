update public.custom_ads
set placement = 'feed_fallback'
where placement in ('home_native', 'all');

alter table public.custom_ads
  drop constraint if exists custom_ads_placement_check;

alter table public.custom_ads
  add constraint custom_ads_placement_check
  check (placement = 'feed_fallback');
