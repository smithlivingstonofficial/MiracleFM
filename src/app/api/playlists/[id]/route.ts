import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2File } from "@/lib/r2-helpers";

async function getOwnedPlaylist(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data: playlist, error } = await supabase
    .from("playlists")
    .select("id, title, cover_url, user_id")
    .eq("id", id)
    .single();

  if (error || !playlist) {
    return { error: NextResponse.json({ error: "Playlist not found" }, { status: 404 }) };
  }

  if (playlist.user_id !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { playlist };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const owned = await getOwnedPlaylist(supabase, id, user.id);
    if (owned.error) return owned.error;

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
    if (!title) return NextResponse.json({ error: "Playlist title is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("playlists")
      .update({ title })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, title, cover_url, user_id, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ playlist: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  void _request;
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const owned = await getOwnedPlaylist(supabase, id, user.id);
    if (owned.error) return owned.error;

    const { playlist } = owned;

    if (playlist?.cover_url) {
      await deleteR2File(playlist.cover_url);
    }

    const { error } = await supabase.from("playlists").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
