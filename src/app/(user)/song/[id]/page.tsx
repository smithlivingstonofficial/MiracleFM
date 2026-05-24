import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Disc3, Headphones, Music4, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AddToPlaylistButton from "@/components/user/AddToPlaylistButton";
import LikeButton from "@/components/user/LikeButton";
import ShareButton from "@/components/user/ShareButton";
import SongPlayButton from "@/components/user/SongPlayButton";
import TrackRow from "@/components/user/TrackRow";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { absoluteUrl, compactObject, DEFAULT_IMAGE, SITE_NAME, secondsToIsoDuration } from "@/lib/seo";
import type { Track } from "@/types/music";
import type { Metadata } from "next";

export const revalidate = 60;

type TrackWithIds = Track & {
  artist_id?: string | null;
  album_id?: string | null;
  created_at?: string | null;
};

const formatCount = (value: number) => new Intl.NumberFormat("en-US").format(value);

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const rounded = Math.round(seconds > 10_000 ? seconds / 1000 : seconds);
  const minutes = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${minutes}:${remaining < 10 ? "0" : ""}${remaining}`;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("tracks")
    .select("title, cover_url, artists(name)")
    .eq("id", id)
    .single();

  if (!track) return { title: "Song" };

  const metadataTrack = track as { title: string; cover_url?: string | null; artists?: { name?: string | null } | { name?: string | null }[] | null };
  const metadataArtist = Array.isArray(metadataTrack.artists) ? metadataTrack.artists[0] : metadataTrack.artists;
  const artistName = metadataArtist?.name;
  const description = artistName ? `Listen to ${metadataTrack.title} by ${artistName} on Miracle FM.` : `Listen to ${metadataTrack.title} on Miracle FM.`;
  const image = metadataTrack.cover_url || DEFAULT_IMAGE;
  const title = artistName ? `${metadataTrack.title} by ${artistName}` : metadataTrack.title;

  return {
    title,
    description,
    alternates: {
      canonical: `/song/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `/song/${id}`,
      type: "music.song",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: trackData } = await supabase
    .from("tracks")
    .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
    .eq("id", id)
    .single();

  if (!trackData) return notFound();

  const track = trackData as TrackWithIds;
  const artistId = track.artist_id || track.artists?.id;
  const duration = formatDuration(track.duration_seconds || track.duration);
  const displayImage = track.cover_url || track.albums?.cover_url || track.artists?.image_url || "/miraclefm.jpg";

  const [{ data: stats }, { data: relatedData }] = await Promise.all([
    supabase.from("track_listen_stats").select("qualified_listens").eq("track_id", id).maybeSingle(),
    artistId
      ? supabase
          .from("tracks")
          .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
          .eq("artist_id", artistId)
          .eq("audio_status", "ready")
          .neq("id", id)
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const qualifiedListens = Number(stats?.qualified_listens || 0);
  const relatedTracks = ((relatedData || []) as Track[]).filter((item) => item.id !== track.id);
  const queue = [track, ...relatedTracks];
  const songDescription = track.artists?.name
    ? `Listen to ${track.title} by ${track.artists.name} on Miracle FM.`
    : `Listen to ${track.title} on Miracle FM.`;
  const songJsonLd = compactObject({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: track.title,
    url: absoluteUrl(`/song/${track.id}`),
    image: absoluteUrl(displayImage),
    description: songDescription,
    duration: secondsToIsoDuration(track.duration_seconds || track.duration),
    byArtist: track.artists?.name
      ? compactObject({
          "@type": "MusicGroup",
          name: track.artists.name,
          url: track.artists.id ? absoluteUrl(`/artist/${track.artists.id}`) : undefined,
        })
      : undefined,
    inAlbum: track.albums?.title
      ? compactObject({
          "@type": "MusicAlbum",
          name: track.albums.title,
          url: track.albums.id ? absoluteUrl(`/album/${track.albums.id}`) : undefined,
          image: track.albums.cover_url ? absoluteUrl(track.albums.cover_url) : undefined,
        })
      : undefined,
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] pb-44 text-white selection:bg-[#FF0055] selection:text-white md:pb-40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(songJsonLd) }}
      />
      <div className="relative px-4 pb-8 pt-7 md:px-12 md:pt-16">
        <div className="absolute inset-x-0 top-0 h-[460px] overflow-hidden pointer-events-none md:h-[520px]">
          <Image src={displayImage} alt="" fill className="object-cover opacity-35 blur-[80px] scale-125" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/35 via-[#050505]/85 to-[#050505]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-6 md:flex-row md:items-end md:gap-10">
          <div className="relative aspect-square w-[68vw] max-w-[260px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900 shadow-2xl md:w-72 md:rounded-[2rem]">
            <Image src={displayImage} alt={track.title} fill className="object-cover" priority />
          </div>

          <div className="w-full min-w-0 flex-1 text-center md:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
              <Music4 size={12} /> Song
            </div>
            <h1 className="mx-auto max-w-[22rem] break-words text-[2rem] font-black leading-[0.95] tracking-tighter text-white md:mx-0 md:max-w-5xl md:text-7xl lg:text-8xl">
              {track.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-zinc-300 md:justify-start">
              {track.artists?.id ? (
                <Link href={`/artist/${track.artists.id}`} className="hover:text-white">
                  {track.artists.name}
                </Link>
              ) : (
                <span>{track.artists?.name || "Unknown Artist"}</span>
              )}
              {track.albums?.id && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-600" />
                  <Link href={`/album/${track.albums.id}`} className="hover:text-white">
                    {track.albums.title}
                  </Link>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-500 md:justify-start">
              <span className="inline-flex items-center gap-2">
                <Headphones size={14} className="text-[#FF0055]" />
                {formatCount(qualifiedListens)} listens
              </span>
              {duration && (
                <span className="inline-flex items-center gap-2">
                  <Clock size={14} />
                  {duration}
                </span>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 md:mt-8 md:justify-start">
              <SongPlayButton track={track} queue={queue} />
              <div className="flex h-12 items-center rounded-full border border-white/5 bg-white/5 px-4">
                <LikeButton trackId={track.id} />
              </div>
              <AddToPlaylistButton trackId={track.id} />
              <ShareButton title={track.title} className="h-12 w-12" iconSize={21} label="Share song" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-9 px-4 md:px-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 md:rounded-[2rem] md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <ScrollText size={22} className="text-[#FF0055]" />
            <h2 className="text-2xl font-black tracking-tighter text-white">Lyrics</h2>
          </div>
          {track.lyrics?.trim() ? (
            <div className="whitespace-pre-wrap break-words text-base font-semibold leading-8 text-zinc-200 md:text-xl md:leading-10">
              {track.lyrics}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center md:p-8">
              <Disc3 size={36} className="mx-auto mb-3 text-zinc-700" />
              <p className="text-sm font-bold leading-6 text-zinc-300 md:text-base">Lyrics are not available for this song yet.</p>
              <p className="mt-1 text-sm text-zinc-500">You can still listen, share, and add it to your worship playlist.</p>
            </div>
          )}
        </section>

        <aside className="min-w-0 space-y-4">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white">More From This Artist</h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">Related worship songs ready to play.</p>
          </div>
          {relatedTracks.length > 0 ? (
            <div className="rounded-[2rem] border border-white/5 bg-[#0A0A0A]/80 p-2">
              {relatedTracks.slice(0, 6).map((related, index) => (
                <TrackRow key={related.id} track={related} index={index} context="Song" allTracks={queue} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm font-medium text-zinc-500">
              Related songs will appear here as the catalog grows.
            </div>
          )}
          <ResponsiveAd variant="compact" className="px-0" />
        </aside>
      </div>
    </div>
  );
}
