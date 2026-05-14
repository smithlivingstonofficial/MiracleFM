import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "My Playlist";
    const safeTitle = title.slice(0, 80) || "My Playlist";

    const { data, error } = await supabase
      .from("playlists")
      .insert({ title: safeTitle, user_id: user.id })
      .select("id, title, cover_url, user_id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ playlist: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
