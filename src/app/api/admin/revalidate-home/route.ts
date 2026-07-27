import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";

export async function POST() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  revalidateTag("home-data", "max");
  revalidateTag("banners-list", "max");
  revalidateTag("public-right-rail", "max");
  revalidateTag("faith-tracks", "max");

  return NextResponse.json({ success: true });
}
