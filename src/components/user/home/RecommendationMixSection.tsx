"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ListMusic } from "lucide-react";
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

export default function RecommendationMixSection({
  playlists,
  title = "Made For You",
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
        </div>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar md:-mx-8 md:px-8">
        {playlists.slice(0, maxItems).map((playlist) => {
          const images = artworkFor(playlist);
          return (
            <article
              key={playlist.section.slug}
              onClick={() => {
                recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                router.push(`/mix/${playlist.section.slug}`);
              }}
              className="group w-[148px] min-w-[148px] cursor-pointer transition-transform duration-300 active:scale-95 md:w-[164px] md:min-w-[164px] md:active:scale-100"
            >
              <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition-all duration-300 md:group-hover:-translate-y-1 md:group-hover:border-[#FF0055]/25">
                {images.length > 0 ? (
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
                    {(images.length === 1 ? [images[0], images[0], images[0], images[0]] : images).map((url, index) => (
                      <div key={`${url}-${index}`} className="relative h-full w-full">
                        <Image src={url} alt="" fill className="object-cover transition-transform duration-700 md:group-hover:scale-105" sizes="164px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-700">
                    <ListMusic size={42} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Auto Mix</span>
                  </div>
                )}

                <div
                  onClick={(event) => {
                    event.stopPropagation();
                    recordImpression(playlist.section.slug, "play", playlist.tracks.length);
                  }}
                  className="absolute bottom-2 right-2 rounded-full bg-[#FF0055] p-0.5 text-white shadow-xl shadow-black/40 transition-transform md:opacity-0 md:group-hover:scale-105 md:group-hover:opacity-100"
                  title={`Play ${playlist.section.title}`}
                >
                  <CollectionPlayButton tracks={playlist.tracks} size="sm" />
                </div>
              </div>

              <div className="px-1 pt-2">
                <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-100 transition-colors md:group-hover:text-[#FF0055]">
                  {playlist.section.title}
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">{playlist.tracks.length} Songs</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
