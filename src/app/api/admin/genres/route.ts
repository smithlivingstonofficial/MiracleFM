import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeGenreName, normalizeGenreList, slugifyGenre, sortGenres } from "@/lib/genres";
import type { Genre } from "@/types/music";

type GenreBody = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  is_active?: unknown;
  sort_order?: unknown;
};

const parseBody = async (request: Request) => (await request.json().catch(() => ({}))) as GenreBody;

async function buildDiagnostics(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], genres: Genre[]) {
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, genre")
    .limit(5000);

  const activeNames = new Set(genres.filter((genre) => genre.is_active).map((genre) => genre.name));
  const allNames = new Set(genres.map((genre) => genre.name));
  const counts = new Map<string, number>();
  let missingGenreTracks = 0;
  let unknownGenreTracks = 0;
  const unknownGenres = new Set<string>();

  (tracks || []).forEach((track) => {
    const values = normalizeGenreList(Array.isArray(track.genre) ? track.genre : []);
    if (values.length === 0) missingGenreTracks += 1;

    values.forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
      if (!allNames.has(name) || !activeNames.has(name)) {
        unknownGenres.add(name);
      }
    });

    if (values.some((name) => !allNames.has(name) || !activeNames.has(name))) unknownGenreTracks += 1;
  });

  return {
    missingGenreTracks,
    unknownGenreTracks,
    unknownGenres: Array.from(unknownGenres).sort(),
    zeroTrackGenres: genres.filter((genre) => (counts.get(genre.name) || 0) === 0).map((genre) => genre.name),
    topGenres: Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([name, count]) => ({ name, count })),
  };
}

export async function GET() {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const { data, error: genresError } = await supabase.from("genres").select("*").order("sort_order").order("name");
    if (genresError) throw genresError;

    const genres = sortGenres((data || []) as Genre[]);
    const diagnostics = await buildDiagnostics(supabase, genres);

    return NextResponse.json({ genres, diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load genres";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await parseBody(request);
    const name = normalizeGenreName(String(body.name || ""));
    if (!name) return NextResponse.json({ error: "Genre name is required" }, { status: 400 });

    const { data, error: insertError } = await supabase
      .from("genres")
      .insert({
        name,
        slug: slugifyGenre(name),
        description: typeof body.description === "string" ? body.description.trim().slice(0, 240) : null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
        sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 999,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    revalidateTag("home-data", "max");
    return NextResponse.json({ genre: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create genre";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await parseBody(request);
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "Genre id is required" }, { status: 400 });

    const name = normalizeGenreName(String(body.name || ""));
    if (!name) return NextResponse.json({ error: "Genre name is required" }, { status: 400 });

    const { data, error: updateError } = await supabase
      .from("genres")
      .update({
        name,
        slug: slugifyGenre(name),
        description: typeof body.description === "string" ? body.description.trim().slice(0, 240) : null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
        sort_order: Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;
    revalidateTag("home-data", "max");
    return NextResponse.json({ genre: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update genre";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
