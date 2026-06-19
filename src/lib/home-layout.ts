import type { SupabaseClient } from "@supabase/supabase-js";

export type HomeLayoutSectionType =
  | "quick_access"
  | "recommendation_mixes"
  | "admin_playlists"
  | "user_playlists"
  | "albums"
  | "artists"
  | "song_list"
  | "ad";

export type HomeLayoutSettings = {
  max_items?: number;
  source?: "trending" | "new" | "related";
  variant?: "feed" | "banner";
  visibility?: "all" | "mobile" | "desktop";
  spacing?: "compact" | "normal" | "relaxed";
  show_description?: boolean;
  quick_access_mobile?: "quick_grid" | "feature_card";
  show_hero?: boolean;
};

export type HomeLayoutSection = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  section_type: HomeLayoutSectionType;
  enabled: boolean;
  sort_order: number;
  settings: HomeLayoutSettings;
};

export const HOME_LAYOUT_SECTION_TYPES: HomeLayoutSectionType[] = [
  "quick_access",
  "recommendation_mixes",
  "admin_playlists",
  "user_playlists",
  "albums",
  "artists",
  "song_list",
  "ad",
];

export const DEFAULT_HOME_LAYOUT_SECTIONS: HomeLayoutSection[] = [
  {
    slug: "quick-access",
    title: "Start Here",
    description: "Fast access to worship mixes and collections.",
    section_type: "quick_access",
    enabled: true,
    sort_order: 10,
    settings: { max_items: 8, quick_access_mobile: "quick_grid", show_hero: true },
  },
  {
    slug: "recommendation-mixes",
    title: "Made For You",
    description: "Auto-updating worship mixes from taste, trends, and listening history.",
    section_type: "recommendation_mixes",
    enabled: true,
    sort_order: 20,
    settings: { max_items: 10 },
  },
  {
    slug: "admin-playlists",
    title: "Miracle FM Playlists",
    description: "Editorial and station playlists curated by Miracle FM.",
    section_type: "admin_playlists",
    enabled: true,
    sort_order: 30,
    settings: { max_items: 8 },
  },
  {
    slug: "user-playlists",
    title: "Your Playlists",
    description: "Personal playlists from your library.",
    section_type: "user_playlists",
    enabled: true,
    sort_order: 40,
    settings: { max_items: 8 },
  },
  {
    slug: "albums",
    title: "Albums",
    description: "Fresh and popular worship albums.",
    section_type: "albums",
    enabled: true,
    sort_order: 50,
    settings: { max_items: 12 },
  },
  {
    slug: "artists",
    title: "Artists",
    description: "Worship leaders listeners are returning to most.",
    section_type: "artists",
    enabled: true,
    sort_order: 60,
    settings: { max_items: 12 },
  },
  {
    slug: "trending-songs",
    title: "Trending Songs",
    description: "Songs with real qualified listens from Miracle FM playback.",
    section_type: "song_list",
    enabled: false,
    sort_order: 70,
    settings: { source: "trending", max_items: 8 },
  },
  {
    slug: "new-songs",
    title: "New Tamil Christian Songs",
    description: "Fresh playable songs added to Miracle FM.",
    section_type: "song_list",
    enabled: false,
    sort_order: 80,
    settings: { source: "new", max_items: 8 },
  },
  {
    slug: "related-songs",
    title: "Related Songs",
    description: "More songs connected to artists you recently listened to.",
    section_type: "song_list",
    enabled: false,
    sort_order: 90,
    settings: { source: "related", max_items: 8 },
  },
  {
    slug: "feed-ad",
    title: "Feed Ad",
    description: "Native feed ad placement.",
    section_type: "ad",
    enabled: true,
    sort_order: 100,
    settings: { variant: "feed" },
  },
  {
    slug: "banner-ad",
    title: "Banner Ad",
    description: "Banner ad placement.",
    section_type: "ad",
    enabled: true,
    sort_order: 110,
    settings: { variant: "banner" },
  },
];

const normalizeSettings = (settings: unknown): HomeLayoutSettings => {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};
  const raw = settings as Record<string, unknown>;
  const normalized: HomeLayoutSettings = {};

  if (Number.isFinite(raw.max_items)) normalized.max_items = Number(raw.max_items);
  if (raw.source === "trending" || raw.source === "new" || raw.source === "related") normalized.source = raw.source;
  if (raw.variant === "feed" || raw.variant === "banner") normalized.variant = raw.variant;
  if (raw.visibility === "all" || raw.visibility === "mobile" || raw.visibility === "desktop") normalized.visibility = raw.visibility;
  if (raw.spacing === "compact" || raw.spacing === "normal" || raw.spacing === "relaxed") normalized.spacing = raw.spacing;
  if (typeof raw.show_description === "boolean") normalized.show_description = raw.show_description;
  if (raw.quick_access_mobile === "quick_grid" || raw.quick_access_mobile === "feature_card") normalized.quick_access_mobile = raw.quick_access_mobile;
  if (typeof raw.show_hero === "boolean") normalized.show_hero = raw.show_hero;

  return normalized;
};

export const normalizeHomeLayoutSection = (section: HomeLayoutSection): HomeLayoutSection => ({
  ...section,
  title: section.title.trim() || "Home Section",
  description: section.description.trim(),
  enabled: Boolean(section.enabled),
  sort_order: Number.isFinite(section.sort_order) ? Number(section.sort_order) : 0,
  section_type: HOME_LAYOUT_SECTION_TYPES.includes(section.section_type) ? section.section_type : "quick_access",
  settings: normalizeSettings(section.settings),
});

export async function getHomeLayoutSections(supabase: SupabaseClient): Promise<HomeLayoutSection[]> {
  const { data, error } = await supabase
    .from("home_layout_sections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error || !data?.length) return DEFAULT_HOME_LAYOUT_SECTIONS;

  return (data as HomeLayoutSection[])
    .map(normalizeHomeLayoutSection)
    .sort((a, b) => a.sort_order - b.sort_order);
}
