"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { GeneratedPlaylist } from "@/types/music";

type RecommendationMixSectionProps = {
  playlists: GeneratedPlaylist[];
  title?: string;
  description?: string;
  maxItems?: number;
};

const artworkFor = (playlist: GeneratedPlaylist) =>
  Array.from(
    new Set(
      playlist.tracks
        .map((track) => track.cover_url || track.albums?.cover_url || track.artists?.image_url)
        .filter((url): url is string => Boolean(url))
    )
  ).slice(0, 4);

function recordImpression(sectionSlug: string, eventType: "card_view" | "open" | "play", trackCount: number) {
  fetch("/api/recommendations/impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section_slug: sectionSlug, event_type: eventType, track_count: trackCount }),
    keepalive: true,
  }).catch(() => {});
}

function MixArtwork({ images }: { images: string[] }) {
  if (images.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a0a14] to-[#0f0f13] text-zinc-600">
        <Sparkles size={32} className="text-[#FF0055]/40" />
      </div>
    );
  }
  const display = images.length === 1 ? [images[0], images[0], images[0], images[0]] : images.slice(0, 4);
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-black/60">
      {display.map((url, i) => (
        <div key={`${url}-${i}`} className="relative h-full w-full overflow-hidden">
          <Image src={url} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="220px" />
        </div>
      ))}
    </div>
  );
}

export default function RecommendationMixSection({
  playlists,
  title = "Made For You",
  description,
  maxItems = 10,
}: RecommendationMixSectionProps) {
  const router = useRouter();

  useEffect(() => {
    playlists.slice(0, 10).forEach((playlist) => {
      recordImpression(playlist.section.slug, "card_view", playlist.tracks.length);
    });
  }, [playlists]);

  if (playlists.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      {/* Section header */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={14} className="flex-shrink-0 text-[#FF0055]" />
            <h2 className="truncate text-xl font-black tracking-tight text-white md:text-2xl">{title}</h2>
          </div>
          {description ? (
            <p className="line-clamp-1 pl-5 text-[12px] font-medium text-zinc-500">{description}</p>
          ) : (
            <p className="line-clamp-1 pl-5 text-[12px] font-medium text-zinc-500">Personalised picks just for you</p>
          )}
        </div>
        <button className="flex flex-shrink-0 items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-zinc-400 transition-colors hover:border-[#FF0055]/40 hover:text-[#FF4D89]">
          See all <ChevronRight size={12} />
        </button>
      </div>

      {/* Horizontal scroll shelf */}
      <div
        className="relative -mx-4 md:-mx-8"
        style={{ WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 16px, black calc(100% - 40px), transparent 100%)" }}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-0.5 scrollbar-hide md:gap-4 md:px-8">
          {playlists.slice(0, maxItems).map((playlist) => {
            const images = artworkFor(playlist);
            return (
              <article
                key={playlist.section.slug}
                onClick={() => {
                  recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                  router.push(`/mix/${playlist.section.slug}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                    router.push(`/mix/${playlist.section.slug}`);
                  }
                }}
                role="link"
                tabIndex={0}
                className="group relative w-[168px] min-w-[168px] snap-start cursor-pointer rounded-xl border border-white/[0.07] bg-[#0d0d0f] p-2 pb-3 shadow-lg outline-none transition-all duration-300 active:scale-[0.97] focus-visible:border-[#FF0055]/60 focus-visible:ring-1 focus-visible:ring-[#FF0055]/30 md:w-[192px] md:min-w-[192px] md:hover:-translate-y-0.5 md:hover:border-white/15 md:hover:bg-[#121215] md:hover:shadow-xl"
              >
                {/* Subtle glow on hover */}
                <div className="pointer-events-none absolute inset-x-4 top-4 h-20 rounded-lg bg-[#FF0055]/8 blur-2xl opacity-0 transition-opacity duration-500 md:group-hover:opacity-100" />

                {/* Artwork */}
                <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900 shadow-md">
                  <MixArtwork images={images} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* For You badge */}
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm">
                    <Sparkles size={8} className="text-[#FF0055]" />
                    For You
                  </div>

                  {/* Track count */}
                  <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-0.5 text-[9px] font-bold text-zinc-300 backdrop-blur-sm">
                    {playlist.tracks.length} songs
                  </div>

                  {/* Play button — slides up on hover */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      recordImpression(playlist.section.slug, "play", playlist.tracks.length);
                    }}
                    className="absolute bottom-2 right-2 rounded-full bg-[#050505]/90 p-0.5 shadow-xl transition-all duration-300 md:translate-y-1.5 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                    title={`Play ${playlist.section.title}`}
                  >
                    <CollectionPlayButton tracks={playlist.tracks} size="sm" />
                  </div>
                </div>

                {/* Text */}
                <div className="mt-2.5 px-1">
                  <h3 className="line-clamp-1 text-[13px] font-bold leading-[1.3] text-zinc-100 transition-colors group-hover:text-white">
                    {playlist.section.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-[1.4] text-zinc-500">
                    {playlist.section.description || "Personalised for your taste"}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
