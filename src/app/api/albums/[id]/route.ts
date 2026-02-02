import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteR2File } from "@/lib/r2-helpers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: album } = await supabase.from("albums").select("cover_url").eq("id", id).single();

    if (album?.cover_url) await deleteR2File(album.cover_url);

    const { error } = await supabase.from("albums").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}