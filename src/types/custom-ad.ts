export type CustomAdPlacement = "feed_fallback";
export type CustomAdImageRatio = "16:9" | "1:1" | "3:4" | "4:3";

export type CustomAd = {
  id?: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_link?: string | null;
  cta_label?: string | null;
  placement?: CustomAdPlacement | null;
  image_ratio?: CustomAdImageRatio | null;
  weight?: number | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
};
