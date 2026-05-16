"use client";

import { useEffect } from "react";

type RecommendationImpressionProps = {
  sectionSlug: string;
  eventType: "card_view" | "open" | "play";
  trackCount: number;
};

export default function RecommendationImpression({
  sectionSlug,
  eventType,
  trackCount,
}: RecommendationImpressionProps) {
  useEffect(() => {
    fetch("/api/recommendations/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section_slug: sectionSlug, event_type: eventType, track_count: trackCount }),
      keepalive: true,
    }).catch(() => {});
  }, [eventType, sectionSlug, trackCount]);

  return null;
}
