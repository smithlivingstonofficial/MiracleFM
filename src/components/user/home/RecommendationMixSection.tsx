"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ListMusic, Sparkles } from "lucide-react";
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

const artworkCellClass = (imageCount: number, index: number) => {
  if (imageCount === 1) return "col-span-2 row-span-2";
  if (imageCount === 2) return "row-span-2";
  if (imageCount === 3 && index === 0) return "row-span-2";
  return "";
};

function recordImpression(sectionSlug: string, eventType: "card_view" | "open" | "play", trackCount: number) {
  fetch("/api/recommendations/impression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section_slug: sectionSlug, event_type: eventType, track_count: trackCount }),
    keepalive: true,
  }).catch(() => {});
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
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
          {description ? <p className="mt-1 line-clamp-1 text-sm font-medium text-zinc-500">{description}</p> : null}
        </div>
      </div>

      <div className="recommendation-shelf-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 pt-1 md:-mx-8 md:gap-5 md:px-8">
        {playlists.slice(0, maxItems).map((playlist) => {
          const images = artworkFor(playlist);
          return (
            <article
              key={playlist.section.slug}
              onClick={() => {
                recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                router.push(`/mix/${playlist.section.slug}`);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                  router.push(`/mix/${playlist.section.slug}`);
                }
              }}
              role="link"
              tabIndex={0}
              className="group relative w-[158px] min-w-[158px] snap-start cursor-pointer rounded-lg border border-white/10 bg-[#0A0A0A] p-2 shadow-[0_18px_38px_rgba(0,0,0,0.34)] transition-all duration-300 outline-none active:scale-[0.98] focus-visible:border-[#FF0055]/70 focus-visible:ring-2 focus-visible:ring-[#FF0055]/30 md:w-[180px] md:min-w-[180px] md:hover:-translate-y-1 md:hover:border-white/20 md:hover:bg-white/[0.035] md:active:scale-100"
            >
              <div className="pointer-events-none absolute inset-x-3 top-3 h-24 rounded-lg bg-[#FF0055]/10 blur-2xl opacity-0 transition-opacity duration-500 md:group-hover:opacity-100" />

              <div className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-zinc-900 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                {images.length > 0 ? (
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
                    {images.map((url, index) => (
                      <div key={`${url}-${index}`} className={`relative h-full w-full overflow-hidden ${artworkCellClass(images.length, index)}`}>
                        <Image src={url} alt="" fill className="object-cover transition-transform duration-700 md:group-hover:scale-110" sizes="180px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_top,#1f1f23,transparent_65%),#111113] text-zinc-600">
                    <ListMusic size={38} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Auto Mix</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 opacity-90" />
                <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/85 backdrop-blur-md">
                  <Sparkles size={10} className="text-[#FF0055]" />
                  For You
                </div>
                <div className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-md">
                  {playlist.tracks.length} Songs
                </div>

                <div
                  onClick={(event) => {
                    event.stopPropagation();
                    recordImpression(playlist.section.slug, "play", playlist.tracks.length);
                  }}
                  className="absolute bottom-2 right-2 rounded-full bg-[#050505] p-0.5 text-white shadow-xl shadow-black/50 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:scale-105 md:group-hover:opacity-100"
                  title={`Play ${playlist.section.title}`}
                >
                  <CollectionPlayButton tracks={playlist.tracks} size="sm" />
                </div>
              </div>

              <div className="relative px-1 pb-1 pt-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-zinc-100 transition-colors md:group-hover:text-white">
                  {playlist.section.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-[11px] font-semibold leading-4 text-zinc-500">
                  {playlist.section.description || "Fresh picks from your Miracle FM listening"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
