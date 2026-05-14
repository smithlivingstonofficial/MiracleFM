import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    // 1. Get Banner Image URL
    const { data: banner } = await supabase
      .from("banners")
      .select("image_url")
      .eq("id", id)
      .single();

    // 2. Delete Image from R2
    if (banner?.image_url) {
      await deleteR2File(banner.image_url);
    }

    // 3. Delete Record
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
