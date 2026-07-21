import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EVENTS = new Set(["card_view", "open", "play"]);

type ImpressionPayload = {
  section_slug?: string;
  event_type?: string;
  track_count?: number;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ImpressionPayload;
    const sectionSlug = String(body.section_slug || "");
    const eventType = String(body.event_type || "");

    if (!sectionSlug || !VALID_EVENTS.has(eventType)) {
      return NextResponse.json({ error: "Invalid recommendation impression" }, { status: 400 });
    }

    // Database writes are disabled to save storage and egress.
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record recommendation impression";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
