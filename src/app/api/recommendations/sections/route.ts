import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecommendationSections } from "@/lib/recommendations";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sections = await getRecommendationSections(supabase, user);

    return NextResponse.json({ sections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recommendation sections";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
