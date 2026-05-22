import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteR2File } from "@/lib/r2-helpers";

type CustomAdPatchBody = {
  title?: unknown;
  description?: unknown;
  image_url?: unknown;
  target_link?: unknown;
  cta_label?: unknown;
  placement?: unknown;
  image_ratio?: unknown;
  weight?: unknown;
  is_active?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = (await req.json()) as CustomAdPatchBody;
    const updates: Record<string, string | number | boolean | null> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: "Ad title is required" }, { status: 400 });
      updates.title = title;
    }
    if (typeof body.description === "string") updates.description = body.description.trim() || null;
    if (typeof body.target_link === "string") updates.target_link = body.target_link.trim() || null;
    if (typeof body.cta_label === "string") updates.cta_label = body.cta_label.trim() || "Learn More";
    if (typeof body.image_url === "string" && body.image_url.trim()) updates.image_url = body.image_url.trim();
    if (typeof body.image_ratio === "string") {
      if (!["16:9", "1:1", "3:4", "4:3"].includes(body.image_ratio)) {
        return NextResponse.json({ error: "Invalid image ratio" }, { status: 400 });
      }
      updates.image_ratio = body.image_ratio;
    }
    if (typeof body.weight === "number") updates.weight = Math.min(100, Math.max(1, body.weight));
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.starts_at === "string" || body.starts_at === null) updates.starts_at = body.starts_at;
    if (typeof body.ends_at === "string" || body.ends_at === null) updates.ends_at = body.ends_at;
    updates.placement = "feed_fallback";

    const { data: current, error: currentError } = await supabase
      .from("custom_ads")
      .select("image_url")
      .eq("id", id)
      .single();
    if (currentError) throw currentError;

    const { error } = await supabase.from("custom_ads").update(updates).eq("id", id);
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

    revalidateTag("home-data", "max");
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
