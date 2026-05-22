import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";

type BannerPatchBody = {
  title?: unknown;
  description?: unknown;
  target_link?: unknown;
  image_url?: unknown;
  is_active?: unknown;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = (await req.json()) as BannerPatchBody;
    const updates: Record<string, string | boolean | null> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
      updates.title = title;
    }
    if (typeof body.description === "string") updates.description = body.description.trim() || null;
    if (typeof body.target_link === "string") updates.target_link = body.target_link.trim() || null;
    if (typeof body.image_url === "string" && body.image_url.trim()) updates.image_url = body.image_url.trim();
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: current, error: currentError } = await supabase
      .from("banners")
      .select("image_url")
      .eq("id", id)
      .single();
    if (currentError) throw currentError;

    const { error } = await supabase.from("banners").update(updates).eq("id", id);
    if (error) throw error;

    if (updates.image_url && current?.image_url && current.image_url !== updates.image_url) {
      await deleteR2File(current.image_url);
    }

    revalidateTag("home-data", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    revalidateTag("home-data", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
