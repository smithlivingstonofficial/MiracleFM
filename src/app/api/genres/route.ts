import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fallbackGenreRows, sortGenres } from "@/lib/genres";
import type { Genre } from "@/types/music";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") !== "false";

  try {
    const supabase = await createClient();
    let query = supabase.from("genres").select("*").order("sort_order").order("name");
    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;

    const genres = data?.length ? sortGenres(data as Genre[]) : fallbackGenreRows();
    return NextResponse.json({ genres });
  } catch {
    return NextResponse.json({ genres: fallbackGenreRows() });
  }
}
