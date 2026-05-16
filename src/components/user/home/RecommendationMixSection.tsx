"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ListMusic, Music4, Play, Sparkles } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import type { GeneratedPlaylist } from "@/types/music";

type RecommendationMixSectionProps = {
  playlists: GeneratedPlaylist[];
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

export default function RecommendationMixSection({ playlists }: RecommendationMixSectionProps) {
  const router = useRouter();
  useEffect(() => {
    playlists.slice(0, 10).forEach((playlist) => {
      recordImpression(playlist.section.slug, "card_view", playlist.tracks.length);
    });
  }, [playlists]);

  if (playlists.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-tighter text-white md:text-3xl">
            Made For You <Sparkles size={16} className="text-[#FF0055]" />
          </h2>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-500">
            Auto-updating worship mixes from your taste, trends, and listening history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-5">
        {playlists.slice(0, 10).map((playlist) => {
          const images = artworkFor(playlist);
          return (
            <article
              key={playlist.section.slug}
              onClick={() => {
                recordImpression(playlist.section.slug, "open", playlist.tracks.length);
                router.push(`/mix/${playlist.section.slug}`);
              }}
              className="group cursor-pointer transition-transform duration-300 active:scale-95 md:active:scale-100"
            >
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-lg transition-all duration-500 md:rounded-[2rem] md:group-hover:-translate-y-1.5 md:group-hover:border-[#FF0055]/30 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.15)]">
                {images.length > 0 ? (
                  <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
                    {(images.length === 1 ? [images[0], images[0], images[0], images[0]] : images).map((url, index) => (
                      <div key={`${url}-${index}`} className="relative h-full w-full">
                        <Image src={url} alt="" fill className="object-cover transition-transform duration-700 md:group-hover:scale-110" sizes="180px" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-700">
                    <ListMusic size={42} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Auto Mix</span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-3">
                  <div className="flex items-end justify-between gap-2">
                    <span className="rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                      {playlist.tracks.length} Songs
                    </span>
                    <div
                      onClick={(event) => {
                        event.stopPropagation();
                        recordImpression(playlist.section.slug, "play", playlist.tracks.length);
                      }}
                      className="rounded-full bg-[#FF0055] p-0.5 text-white shadow-xl shadow-black/40 transition-transform md:opacity-0 md:group-hover:scale-110 md:group-hover:opacity-100"
                      title={`Play ${playlist.section.title}`}
                    >
                      <CollectionPlayButton tracks={playlist.tracks} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/35 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 md:flex md:group-hover:opacity-100">
                  <div className="rounded-full bg-white p-4 text-black shadow-xl">
                    <Play fill="currentColor" className="ml-1 h-6 w-6" />
                  </div>
                </div>
              </div>

              <div className="px-1 pt-2 md:pt-3">
                <h3 className="truncate text-sm font-bold text-zinc-100 transition-colors md:text-base md:group-hover:text-[#FF0055]">
                  {playlist.section.title}
                </h3>
                <div className="mt-0.5 flex items-center gap-1.5 opacity-80">
                  <Music4 size={10} className="text-[#FF0055]" />
                  <p className="truncate text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    {playlist.section.description}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
