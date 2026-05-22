export type CustomAdPlacement = "home_native" | "feed_fallback" | "all";

export type CustomAd = {
  id?: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_link?: string | null;
  cta_label?: string | null;
  placement?: CustomAdPlacement | null;
  weight?: number | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
};
