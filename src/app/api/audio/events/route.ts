import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_EVENTS = new Set([
  "play_start",
  "startup",
  "stall_start",
  "stall_recovered",
  "level_switch",
  "listen_qualified",
  "complete",
  "error",
]);

type AudioEventPayload = {
  event_type?: string;
  track_id?: string;
  session_id?: string;
  position_seconds?: number;
  duration_seconds?: number;
  startup_ms?: number;
  stall_ms?: number;
  hls_level?: number;
  error_code?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await request.json()) as AudioEventPayload;
    const eventType = String(body.event_type || "");
    const trackId = String(body.track_id || "");
    const sessionId = String(body.session_id || "");

    if (!VALID_EVENTS.has(eventType) || !trackId || !sessionId) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const { error } = await supabase.from("play_events").insert({
      event_type: eventType,
      track_id: trackId,
      user_id: user?.id ?? null,
      session_id: sessionId,
      position_seconds: body.position_seconds ?? null,
      duration_seconds: body.duration_seconds ?? null,
      startup_ms: body.startup_ms ?? null,
      stall_ms: body.stall_ms ?? null,
      hls_level: body.hls_level ?? null,
      error_code: body.error_code ?? null,
      metadata: body.metadata ?? {},
    });

    if (error) {
      const code = typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code === "23505" && eventType === "listen_qualified") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
