import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteTrackMedia } from "@/lib/track-media-cleanup";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    await deleteTrackMedia(supabase, id, { strict: true });

    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) throw error;

    revalidateTag("home-data", "max");
    revalidateTag(`song-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
