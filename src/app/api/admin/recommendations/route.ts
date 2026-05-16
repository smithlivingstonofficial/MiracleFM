import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getFallbackSection,
  getRecommendationPlaylist,
  getRecommendationSections,
} from "@/lib/recommendations";
import { normalizeGenreList } from "@/lib/genres";
import type { RecommendationAlgorithm } from "@/types/music";

const ALGORITHMS: RecommendationAlgorithm[] = [
  "daily_mix",
  "because_liked",
  "genre_affinity",
  "trending",
  "top_listened",
  "on_repeat",
  "playlist_vibes",
  "new_for_you",
  "artist_discovery",
];

type RecommendationUpdateBody = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  enabled?: unknown;
  sort_order?: unknown;
  algorithm_type?: unknown;
  fallback_genres?: unknown;
  track_limit?: unknown;
  freshness_days?: unknown;
  min_signals?: unknown;
};

async function countRows(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: string,
  column: string,
  value: string
) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  return count || 0;
}

export async function GET(request: Request) {
  const { supabase, user, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const previewSlug = url.searchParams.get("preview");
  const previewMode = url.searchParams.get("mode") === "guest" ? "guest" : "admin";

  try {
    const sections = await getRecommendationSections(supabase, user);

    if (previewSlug) {
      const section = sections.find((item) => item.slug === previewSlug) || getFallbackSection(previewSlug);
      if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

      const playlist = await getRecommendationPlaylist(
        supabase,
        section,
        previewMode === "guest" ? null : user,
        section.track_limit
      );
      return NextResponse.json({ playlist, mode: previewMode });
    }

    const [
      readyTracks,
      readyGenreSample,
      genreRows,
      impressions,
      plays,
      opens,
      cardViews,
    ] = await Promise.all([
      countRows(supabase, "tracks", "audio_status", "ready"),
      supabase.from("tracks").select("id, genre").eq("audio_status", "ready").limit(1000),
      supabase.from("genres").select("name, is_active"),
      supabase.from("recommendation_impressions").select("section_slug, event_type, track_count, created_at").limit(500),
      countRows(supabase, "recommendation_impressions", "event_type", "play"),
      countRows(supabase, "recommendation_impressions", "event_type", "open"),
      countRows(supabase, "recommendation_impressions", "event_type", "card_view"),
    ]);

    const bySection = new Map<string, { views: number; opens: number; plays: number }>();
    for (const impression of impressions.data || []) {
      const current = bySection.get(impression.section_slug) || { views: 0, opens: 0, plays: 0 };
      if (impression.event_type === "card_view") current.views += 1;
      if (impression.event_type === "open") current.opens += 1;
      if (impression.event_type === "play") current.plays += 1;
      bySection.set(impression.section_slug, current);
    }

    const activeGenres = new Set((genreRows.data || []).filter((genre) => genre.is_active).map((genre) => genre.name));
    const readyGenreValues = readyGenreSample.data || [];
    const missingGenreTracks =
      readyGenreValues.filter((track) => !Array.isArray(track.genre) || track.genre.length === 0).length || 0;
    const unknownGenreTracks =
      readyGenreValues.filter((track) =>
        normalizeGenreList(Array.isArray(track.genre) ? track.genre : []).some((genre) => !activeGenres.has(genre))
      ).length || 0;

    return NextResponse.json({
      sections,
      diagnostics: {
        readyTracks,
        missingGenreTracks,
        unknownGenreTracks,
        genreCoveragePercent: readyGenreValues.length
          ? Math.round(((readyGenreValues.length - missingGenreTracks) / readyGenreValues.length) * 100)
          : 0,
        impressions: { cardViews, opens, plays },
        bySection: Object.fromEntries(bySection),
      },
      algorithms: ALGORITHMS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recommendation admin data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = (await request.json().catch(() => ({}))) as RecommendationUpdateBody;
    const slug = typeof body.slug === "string" ? body.slug : "";
    if (!slug) return NextResponse.json({ error: "Missing section slug" }, { status: 400 });

    const algorithmType =
      typeof body.algorithm_type === "string" && ALGORITHMS.includes(body.algorithm_type as RecommendationAlgorithm)
        ? (body.algorithm_type as RecommendationAlgorithm)
        : "daily_mix";
    const fallbackGenres = Array.isArray(body.fallback_genres)
      ? body.fallback_genres
          .map((item: unknown) => String(item))
          .map((value: string) => value.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const updates = {
      title: String(body.title || "Recommendation").trim().slice(0, 80),
      description: String(body.description || "").trim().slice(0, 240),
      enabled: Boolean(body.enabled),
      sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
      algorithm_type: algorithmType,
      fallback_genres: fallbackGenres,
      track_limit: Math.min(Math.max(Number(body.track_limit) || 20, 4), 80),
      freshness_days: Math.min(Math.max(Number(body.freshness_days) || 30, 1), 365),
      min_signals: Math.min(Math.max(Number(body.min_signals) || 0, 0), 100),
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from("recommendation_sections")
      .update(updates)
      .eq("slug", slug)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ section: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update recommendation section";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
