import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFallbackSection,
  getRecommendationPlaylist,
  getRecommendationSections,
} from "@/lib/recommendations";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  void _request;
  const { slug } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sections = await getRecommendationSections(supabase, user);
    const section = sections.find((item) => item.slug === slug) || getFallbackSection(slug);

    if (!section) {
      return NextResponse.json({ error: "Recommendation playlist not found" }, { status: 404 });
    }

    const playlist = await getRecommendationPlaylist(supabase, section, user);
    return NextResponse.json({ playlist });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recommendation playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
