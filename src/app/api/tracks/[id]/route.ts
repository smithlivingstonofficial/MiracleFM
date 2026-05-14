import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2File, deleteR2Folder } from "@/lib/r2-helpers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: track } = await supabase.from("tracks").select("cover_url").eq("id", id).single();

    // 1. Delete HLS and original folders (Always unique to track)
    await deleteR2Folder(`tracks/${id}/`);
    await deleteR2Folder(`originals/${id}/`);

    // 2. Smart Delete Cover: Only delete if no other track uses it
    if (track?.cover_url) {
      const { count } = await supabase
        .from("tracks")
        .select("*", { count: 'exact', head: true })
        .eq("cover_url", track.cover_url);
      
      // If count is 1, it means ONLY this track uses it. Safe to delete.
      if (count && count <= 1) {
        await deleteR2File(track.cover_url);
      }
    }

    // 3. Delete Record
    const { error } = await supabase.from("tracks").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
