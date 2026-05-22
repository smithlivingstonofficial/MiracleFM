import Image from "next/image";
import { notFound } from "next/navigation";
import { Clock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import RecommendationImpression from "@/components/user/RecommendationImpression";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import TrackRow from "@/components/user/TrackRow";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import {
  getFallbackSection,
  getRecommendationPlaylist,
  getRecommendationSections,
} from "@/lib/recommendations";

type MixPageProps = {
  params: Promise<{ slug: string }>;
};

const coverImagesFor = (tracks: Awaited<ReturnType<typeof getRecommendationPlaylist>>["tracks"]) =>
  Array.from(
    new Set(
      tracks
        .map((track) => track.cover_url || track.albums?.cover_url || track.artists?.image_url)
        .filter((url): url is string => Boolean(url))
    )
  ).slice(0, 4);

export default async function GeneratedMixPage({ params }: MixPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sections = await getRecommendationSections(supabase, user);
  const section = sections.find((item) => item.slug === slug) || getFallbackSection(slug);

  if (!section) notFound();

  const playlist = await getRecommendationPlaylist(supabase, section, user, section.track_limit);
  if (playlist.tracks.length === 0) notFound();

  const images = coverImagesFor(playlist.tracks);
  const durationMinutes = Math.max(
    1,
    Math.round(
      playlist.tracks.reduce((total, track) => total + Number(track.duration_seconds || track.duration || 0), 0) / 60
    )
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-black pb-36 text-zinc-100">
      <RecommendationImpression sectionSlug={section.slug} eventType="open" trackCount={playlist.tracks.length} />

      <div className="absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-[#221016] via-black/70 to-black pointer-events-none" />

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-10 md:py-12">
        <section className="mt-10 grid gap-8 rounded-[2rem] border border-white/5 bg-zinc-900/40 p-5 shadow-2xl md:mt-0 md:grid-cols-[280px_1fr] md:gap-10 md:rounded-[2.5rem] md:p-10">
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900 shadow-[0_22px_60px_rgba(0,0,0,0.45)]">
            {images.length > 0 ? (
              <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
                {(images.length === 1 ? [images[0], images[0], images[0], images[0]] : images).map((url, index) => (
                  <div key={`${url}-${index}`} className="relative h-full w-full">
                    <Image src={url} alt="" fill className="object-cover" sizes="280px" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-700">
                <Sparkles size={54} />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col justify-end text-center md:text-left">
            <span className="mx-auto mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#FF0055]/25 bg-[#FF0055]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#FF0055] md:mx-0">
              <Sparkles size={13} /> Auto-Updating Mix
            </span>
            <h1 className="text-4xl font-black leading-none tracking-tighter text-white md:text-7xl">
              {section.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-zinc-400 md:text-base">
              {section.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest text-zinc-500 md:justify-start">
              <span>{playlist.tracks.length} songs</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} /> About {durationMinutes} min
              </span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{user ? "Personalized" : "Guest Mix"}</span>
            </div>
            <div className="mt-8 flex justify-center md:justify-start">
              <RecommendationImpression sectionSlug={section.slug} eventType="card_view" trackCount={playlist.tracks.length} />
              <CollectionPlayButton tracks={playlist.tracks} size="large" />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/[0.04] bg-[#080808]/80 p-2 md:p-4">
          <div className="space-y-1">
            {playlist.tracks.map((track, index) => (
              <div key={track.id}>
                <TrackRow track={track} index={index} context={section.title} allTracks={playlist.tracks} />
                {shouldRenderSongListAdAfter(index, playlist.tracks.length) && <SongListAdRow fallbackIndex={index} />}
              </div>
            ))}
          </div>
        </section>

        {playlist.tracks.length < 8 && <ResponsiveAd variant="feed" />}
      </main>
    </div>
  );
}
