import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import {
  DEFAULT_HOME_LAYOUT_SECTIONS,
  HOME_LAYOUT_SECTION_TYPES,
  getHomeLayoutSections,
  type HomeLayoutSection,
  type HomeLayoutSettings,
} from "@/lib/home-layout";

type HomeLayoutUpdateBody = {
  sections?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeSettings = (value: unknown): HomeLayoutSettings => {
  if (!isRecord(value)) return {};
  const settings: HomeLayoutSettings = {};
  if (Number.isFinite(value.max_items)) settings.max_items = Math.min(Math.max(Number(value.max_items), 1), 24);
  if (value.source === "trending" || value.source === "new" || value.source === "related") settings.source = value.source;
  if (value.variant === "feed" || value.variant === "banner") settings.variant = value.variant;
  if (value.visibility === "all" || value.visibility === "mobile" || value.visibility === "desktop") settings.visibility = value.visibility;
  if (value.spacing === "compact" || value.spacing === "normal" || value.spacing === "relaxed") settings.spacing = value.spacing;
  if (typeof value.show_description === "boolean") settings.show_description = value.show_description;
  if (value.quick_access_mobile === "quick_grid" || value.quick_access_mobile === "feature_card") {
    settings.quick_access_mobile = value.quick_access_mobile;
  }
  if (typeof value.show_hero === "boolean") settings.show_hero = value.show_hero;
  return settings;
};

const normalizeIncomingSection = (value: unknown, index: number): HomeLayoutSection | null => {
  if (!isRecord(value)) return null;
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  const fallback = DEFAULT_HOME_LAYOUT_SECTIONS.find((section) => section.slug === slug);
  const sectionType = typeof value.section_type === "string" && HOME_LAYOUT_SECTION_TYPES.includes(value.section_type as HomeLayoutSection["section_type"])
    ? (value.section_type as HomeLayoutSection["section_type"])
    : fallback?.section_type;

  if (!slug || !sectionType) return null;

  return {
    slug,
    title: String(value.title || fallback?.title || "Home Section").trim().slice(0, 80),
    description: String(value.description || fallback?.description || "").trim().slice(0, 240),
    section_type: sectionType,
    enabled: Boolean(value.enabled),
    sort_order: Number.isFinite(value.sort_order) ? Number(value.sort_order) : (index + 1) * 10,
    settings: normalizeSettings(value.settings || fallback?.settings),
  };
};

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const sections = await getHomeLayoutSections(supabase, true);
    return NextResponse.json({
      sections,
      defaults: DEFAULT_HOME_LAYOUT_SECTIONS,
      sectionTypes: HOME_LAYOUT_SECTION_TYPES,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load home layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as HomeLayoutUpdateBody;
    const rawSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = rawSections
      .map(normalizeIncomingSection)
      .filter((section): section is HomeLayoutSection => Boolean(section))
      .slice(0, 24);

    if (sections.length === 0) {
      return NextResponse.json({ error: "No valid layout sections provided" }, { status: 400 });
    }

    const payload = sections.map((section, index) => ({
      slug: section.slug,
      title: section.title,
      description: section.description,
      section_type: section.section_type,
      enabled: section.enabled,
      sort_order: (index + 1) * 10,
      settings: section.settings,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("home_layout_sections")
      .upsert(payload, { onConflict: "slug" });

    if (upsertError) throw upsertError;

    revalidateTag("home-layout", "max");
    revalidateTag("home-data", "max");

    const nextSections = await getHomeLayoutSections(supabase, true);
    return NextResponse.json({ sections: nextSections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save home layout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
