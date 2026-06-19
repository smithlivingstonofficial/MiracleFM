"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock3,
  Headphones,
  Heart,
  Library,
  ListMusic,
  Music2,
  Pause,
  Play,
  Radio,
  ArrowUpRight,
  ScrollText,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import LikeButton from "@/components/user/LikeButton";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { Track } from "@/types/music";

type Banner = {
  id?: string;
  title: string;
  description?: string | null;
  image_url?: string | null;
  target_link?: string | null;
};

type TrackStats = {
  qualified_listens?: number | null;
  unique_listeners?: number | null;
  like_users?: number | null;
  playlist_save_users?: number | null;
  playlist_adds?: number | null;
  recent_7d_listens?: number | null;
};

type DesktopRightRailProps = {
  banners: Banner[];
  initialTracks: Track[];
  isSignedIn: boolean;
};

type RailEmptyStateProps = {
  banners: Banner[];
  tracks: Track[];
  isSignedIn: boolean;
};

type LyricLine = {
  id: string;
  time: number | null;
  text: string;
};

const formatCount = (value?: number | null) =>
  new Intl.NumberFormat("en-US", { notation: Number(value || 0) >= 10000 ? "compact" : "standard" }).format(Number(value || 0));

const formatDuration = (value?: number | null) => {
  if (!value || !Number.isFinite(value)) return null;
  const seconds = Math.max(0, Math.round(value > 10_000 ? value / 1000 : value));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
};

const imageFor = (track?: Track | null) =>
  track?.cover_url || track?.albums?.cover_url || track?.artists?.image_url || "/miraclefm.jpg";

const artistIdFor = (track?: Track | null) => track?.artists?.id || track?.artist_id || null;

const albumIdFor = (track?: Track | null) => track?.albums?.id || track?.album_id || null;

function parseLyrics(lyrics?: string | null): { lines: LyricLine[]; hasTimestamps: boolean } {
  const rawLines = lyrics?.replace(/\r/g, "").split("\n") || [];
  const lines: LyricLine[] = [];
  let hasTimestamps = false;

  rawLines.forEach((line, index) => {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, "").trim();

    if (matches.length === 0) {
      if (line.trim()) lines.push({ id: `plain-${index}`, time: null, text: line.trimEnd() });
      return;
    }

    hasTimestamps = true;
    matches.forEach((match, matchIndex) => {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
      if (text) lines.push({ id: `timed-${index}-${matchIndex}`, time: minutes * 60 + seconds + fraction, text });
    });
  });

  return { lines, hasTimestamps };
}

function activeLyricIndex(lines: LyricLine[], currentTime: number) {
  let active = -1;
  lines.forEach((line, index) => {
    if (line.time !== null && line.time <= currentTime) active = index;
  });
  return active;
}

export default function DesktopRightRail({ banners, initialTracks, isSignedIn }: DesktopRightRailProps) {
  const supabase = useMemo(() => createClient(), []);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const [trackDetails, setTrackDetails] = useState<Track | null>(null);
  const [statsState, setStatsState] = useState<{ trackId: string; stats: TrackStats | null } | null>(null);
  const [relatedState, setRelatedState] = useState<{ trackId: string; tracks: Track[] } | null>(null);

  useEffect(() => {
    if (!currentTrack?.id) return;

    let cancelled = false;
    const track = currentTrack;
    const artistId = artistIdFor(track);

    async function fetchDetails() {
      const [trackRes, statsRes, relatedRes] = await Promise.all([
        supabase
          .from("tracks")
          .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
          .eq("id", track.id)
          .maybeSingle(),
        supabase
          .from("track_engagement_stats")
          .select("qualified_listens, unique_listeners, like_users, playlist_save_users, playlist_adds, recent_7d_listens")
          .eq("track_id", track.id)
          .maybeSingle(),
        artistId
          ? supabase
              .from("tracks")
              .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
              .eq("artist_id", artistId)
              .eq("audio_status", "ready")
              .neq("id", track.id)
              .limit(6)
          : Promise.resolve({ data: [] }),
      ]);

      if (cancelled) return;
      setTrackDetails((trackRes.data as Track | null) || track);
      setStatsState({ trackId: track.id, stats: (statsRes.data as TrackStats | null) || null });
      setRelatedState({
        trackId: track.id,
        tracks: ((relatedRes.data || []) as Track[]).filter((relatedTrack) => relatedTrack.id !== track.id),
      });
    }

    fetchDetails();

    return () => {
      cancelled = true;
    };
  }, [currentTrack, supabase]);

  const activeTrack = trackDetails?.id === currentTrack?.id ? trackDetails : currentTrack;

  if (!activeTrack) {
    return <RailEmptyState banners={banners} tracks={initialTracks} isSignedIn={isSignedIn} />;
  }

  const stats = statsState?.trackId === activeTrack.id ? statsState.stats : null;
  const relatedTracks = relatedState?.trackId === activeTrack.id ? relatedState.tracks : [];
  const displayImage = imageFor(activeTrack);
  const artistId = artistIdFor(activeTrack);
  const albumId = albumIdFor(activeTrack);
  const duration = formatDuration(activeTrack.duration_seconds || activeTrack.duration);
  const lyrics = parseLyrics(activeTrack.lyrics);
  const activeIndex = activeLyricIndex(lyrics.lines, currentTime);
  const genres = activeTrack.genre || [];
  const allRelated = [activeTrack, ...relatedTracks];

  return (
    <aside className="hidden h-full w-[340px] shrink-0 border-l border-white/10 bg-[linear-gradient(180deg,#090909,#050505)] xl:block 2xl:w-[380px]">
      <div className="right-rail-scroll h-full overflow-y-auto px-4 pb-36 pt-4">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-52 opacity-35">
              <Image src={displayImage} alt="" fill className="scale-125 object-cover blur-3xl saturate-150" sizes="380px" priority />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#090909]/55 to-[#090909]" />
            </div>

            <div className="relative p-3">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-[0_22px_60px_rgba(0,0,0,0.55)]">
                <Image src={displayImage} alt={activeTrack.title} fill className="object-cover" sizes="380px" priority />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                <p className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#FF0055] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white shadow-[0_12px_34px_rgba(255,0,85,0.32)]">
                  <Radio size={11} /> Now Playing
                </p>
              </div>
            </div>

            <div className="relative space-y-4 px-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="line-clamp-2 text-[1.7rem] font-black leading-[1.12] tracking-tight text-white">
                    {activeTrack.title}
                  </h2>
                  <div className="mt-3 flex min-w-0 flex-col gap-1">
                    {artistId ? (
                      <Link href={`/artist/${artistId}`} className="truncate text-sm font-bold leading-5 text-zinc-100 hover:text-[#FF4D89]">
                        {activeTrack.artists?.name || "Unknown Artist"}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-bold leading-5 text-zinc-100">{activeTrack.artists?.name || "Unknown Artist"}</p>
                    )}
                    {albumId ? (
                      <Link href={`/album/${albumId}`} className="truncate text-xs font-semibold leading-5 text-zinc-500 hover:text-zinc-200">
                        {activeTrack.albums?.title || "Miracle FM"}
                      </Link>
                    ) : (
                      <p className="truncate text-xs font-semibold leading-5 text-zinc-500">{activeTrack.albums?.title || "Miracle FM"}</p>
                    )}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
                  <LikeButton trackId={activeTrack.id} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatTile icon={<Headphones size={14} />} label="Listens" value={formatCount(stats?.qualified_listens ?? activeTrack.play_count)} />
                <StatTile icon={<Users size={14} />} label="Listeners" value={formatCount(stats?.unique_listeners)} />
                <StatTile icon={<Heart size={14} />} label="Likes" value={formatCount(stats?.like_users)} />
                <StatTile icon={<Library size={14} />} label="Saves" value={formatCount(stats?.playlist_save_users ?? stats?.playlist_adds)} />
              </div>

              <div className="flex flex-wrap gap-2">
                {duration && <MetaPill icon={<Clock3 size={13} />} label={duration} />}
                {genres.slice(0, 3).map((genre) => (
                  <MetaPill key={genre} icon={<Music2 size={13} />} label={genre} />
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-black text-white">
                <ScrollText size={16} className="text-[#FF0055]" /> Lyrics
              </p>
              <Link href={`/song/${activeTrack.id}`} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">
                Open
              </Link>
            </div>

            {lyrics.lines.length > 0 ? (
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
                {lyrics.lines.slice(0, 24).map((line, index) => (
                  <p
                    key={line.id}
                    className={cn(
                      "whitespace-pre-wrap break-words text-sm font-bold leading-6 transition-colors",
                      lyrics.hasTimestamps ? (index === activeIndex ? "text-white" : "text-zinc-600") : "text-zinc-300"
                    )}
                  >
                    {line.text}
                  </p>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm font-semibold leading-6 text-zinc-500">
                Lyrics are not available for this song yet.
              </div>
            )}
          </section>

          {relatedTracks.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_56px_rgba(0,0,0,0.24)]">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-sm font-black text-white">More From This Artist</p>
                <CollectionPlayButton tracks={allRelated} size="sm" />
              </div>
              <div className="space-y-1">
                {relatedTracks.slice(0, 5).map((track, index) => (
                  <RailTrackRow key={track.id} track={track} tracks={allRelated} index={index + 1} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}

function RailEmptyState({ banners, tracks, isSignedIn }: RailEmptyStateProps) {
  const banner = banners[0];
  const [showBannerText, setShowBannerText] = useState(false);

  return (
    <aside className="hidden h-full w-[340px] shrink-0 border-l border-white/10 bg-[linear-gradient(180deg,#090909,#050505)] xl:block 2xl:w-[380px]">
      <div className="right-rail-scroll h-full overflow-y-auto px-4 pb-36 pt-4">
        <div className="space-y-4">
          {banner && (
            <Link
              href={banner.target_link || "#"}
              className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] transition-colors hover:border-[#FF0055]/35"
              onClick={(event) => {
                if (showBannerText) {
                  event.preventDefault();
                  setShowBannerText(false);
                }
              }}
            >
              <div className="relative m-3 aspect-video overflow-hidden rounded-xl bg-zinc-900">
                <Image src={banner.image_url || "/miraclefm.jpg"} alt={banner.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="380px" priority />
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowBannerText((value) => !value);
                  }}
                  className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/20 text-white backdrop-blur-xl transition hover:border-white/45 hover:bg-white/28 active:scale-95"
                  aria-label={showBannerText ? "Hide banner details" : "Show banner details"}
                >
                  <ArrowUpRight size={18} />
                </button>
                {showBannerText && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/82 via-black/36 to-transparent p-4"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#FF0055] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white">
                      <Sparkles size={11} /> Featured
                    </p>
                    <h2 className="line-clamp-2 text-2xl font-black leading-[1.12] tracking-tight text-white">{banner.title}</h2>
                    {banner.description && <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-zinc-200">{banner.description}</p>}
                  </div>
                )}
              </div>
            </Link>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[0_18px_56px_rgba(0,0,0,0.24)]">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-black text-white">
                  <TrendingUp size={16} className="text-[#FF0055]" />
                  {isSignedIn ? "Daily Mix" : "Start Listening"}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                  {isSignedIn ? "Made from your worship taste" : "Popular on Miracle FM"}
                </p>
              </div>
              <CollectionPlayButton tracks={tracks} size="sm" />
            </div>

            {tracks.length > 0 ? (
              <div className="space-y-1.5">
                {tracks.slice(0, 8).map((track, index) => (
                  <RailTrackRow key={track.id} track={track} tracks={tracks} index={index} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-black/25 p-5 text-center">
                <ListMusic size={26} className="mx-auto mb-2 text-zinc-700" />
                <p className="text-sm font-bold text-zinc-500">Fresh songs will appear here soon.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
}

function RailTrackRow({ track, tracks, index }: { track: Track; tracks: Track[]; index: number }) {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueue = usePlayerStore((state) => state.setQueue);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const isCurrent = currentTrack?.id === track.id;
  const image = imageFor(track);

  const handlePlay = () => {
    if (isCurrent) {
      setIsPlaying(!isPlaying);
      return;
    }
    setQueue(tracks, index);
  };

  return (
    <div className={cn("group flex items-center gap-3 rounded-xl p-2 transition-colors", isCurrent ? "bg-white/[0.08]" : "hover:bg-white/[0.05]")}>
      <button
        type="button"
        onClick={handlePlay}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 text-white shadow-[0_12px_26px_rgba(0,0,0,0.26)]"
        aria-label={isCurrent && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <Image src={image} alt="" fill className="object-cover" sizes="44px" />
        <span className={cn("absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity", isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          {isCurrent && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <Link href={`/song/${track.id}`} className={cn("block truncate text-sm font-bold hover:text-[#FF4D89]", isCurrent ? "text-[#FF4D89]" : "text-white")}>
          {track.title}
        </Link>
        <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">{track.artists?.name || "Miracle FM"}</p>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[#FF0055]">{icon}</span>
        <p className="text-lg font-black leading-tight text-white">{value}</p>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
    </div>
  );
}

function MetaPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="shrink-0 text-[#FF0055]">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
