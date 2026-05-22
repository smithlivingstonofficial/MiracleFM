import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const { data: ad } = await supabase
      .from("custom_ads")
      .select("image_url")
      .eq("id", id)
      .single();

    if (ad?.image_url) {
      await deleteR2File(ad.image_url);
    }

    const { error } = await supabase.from("custom_ads").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
