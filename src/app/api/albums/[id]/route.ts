import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const { data: album } = await supabase.from("albums").select("cover_url").eq("id", id).single();

    if (album?.cover_url) await deleteR2File(album.cover_url);

    const { error } = await supabase.from("albums").delete().eq("id", id);
    if (error) throw error;

    revalidateTag("home-data", "max");
    revalidateTag(`album-${id}`, "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
