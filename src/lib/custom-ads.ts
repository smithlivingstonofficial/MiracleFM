import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomAd, CustomAdPlacement } from "@/types/custom-ad";

export function isCustomAdLive(ad: CustomAd, now = new Date()) {
  if (ad.is_active === false || !ad.image_url) return false;
  const startsAt = ad.starts_at ? new Date(ad.starts_at) : null;
  const endsAt = ad.ends_at ? new Date(ad.ends_at) : null;
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

export function filterCustomAdsForPlacement(ads: CustomAd[], placement: CustomAdPlacement) {
  return ads.filter((ad) => isCustomAdLive(ad) && (ad.placement === placement || ad.placement === "all"));
}

export function pickWeightedCustomAd(ads: CustomAd[], seed = 0) {
  const liveAds = ads.filter((ad) => isCustomAdLive(ad));
  if (liveAds.length === 0) return null;

  const totalWeight = liveAds.reduce((sum, ad) => sum + Math.max(1, Number(ad.weight || 1)), 0);
  const target = Math.abs(seed) % totalWeight;
  let cursor = 0;

  for (const ad of liveAds) {
    cursor += Math.max(1, Number(ad.weight || 1));
    if (target < cursor) return ad;
  }

  return liveAds[0];
}

export async function fetchActiveCustomAds(supabase: SupabaseClient, placement: CustomAdPlacement) {
  const { data, error } = await supabase
    .from("custom_ads")
    .select("id, title, description, image_url, target_link, cta_label, placement, weight, is_active, starts_at, ends_at")
    .eq("is_active", true)
    .or(`placement.eq.${placement},placement.eq.all`)
    .order("weight", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[custom_ads] fetch failed", error);
    return [];
  }

  return ((data || []) as CustomAd[]).filter((ad) => isCustomAdLive(ad));
}
