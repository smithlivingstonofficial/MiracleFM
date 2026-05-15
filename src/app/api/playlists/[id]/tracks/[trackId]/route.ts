import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  void _request;
  const { id, trackId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (playlistError || !playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  if (playlist.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("playlist_tracks")
    .delete()
    .eq("playlist_id", id)
    .eq("track_id", trackId);

  if (error) return NextResponse.json({ error: "Could not remove song" }, { status: 500 });

  return NextResponse.json({ success: true });
}
