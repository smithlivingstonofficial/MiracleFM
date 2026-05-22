alter table public.custom_ads
  add column if not exists image_ratio text not null default '16:9';

update public.custom_ads
set image_ratio = '16:9'
where image_ratio is null
   or image_ratio not in ('16:9', '1:1', '3:4', '4:3');

alter table public.custom_ads
  drop constraint if exists custom_ads_image_ratio_check;

alter table public.custom_ads
  add constraint custom_ads_image_ratio_check
  check (image_ratio in ('16:9', '1:1', '3:4', '4:3'));
