// src/components/player/FullScreenPlayer.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  ListMusic,
  Music2,
  Pause,
  Play,
  PlusCircle,
  Radio,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/lib/utils";
import LikeButton from "../user/LikeButton";
import type { Playlist, Track } from "@/types/music";

type LyricLine = {
  id: string;
  time: number | null;
  text: string;
};

export default function FullScreenPlayer() {
  const router = useRouter();
  const {
    isFullScreen,
    toggleFullScreen,
    currentTrack,
    isPlaying,
    setIsPlaying,
    playNext,
    playPrevious,
    isShuffled,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    currentTime,
    duration,
    seekTo,
  } = usePlayerStore();

  const supabase = useMemo(() => createClient(), []);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<Pick<Playlist, "id" | "title">[]>([]);
  const [localProgress, setLocalProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const dragStartYRef = useRef(0);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const autoScrollTimerRef = useRef<number | null>(null);

  const displayImage = currentTrack?.cover_url || currentTrack?.albums?.cover_url || currentTrack?.artists?.image_url;
  const artistId = currentTrack?.artists?.id || currentTrack?.artist_id || null;
  const albumId = currentTrack?.albums?.id || currentTrack?.album_id || null;
  const artistName = currentTrack?.artists?.name || "Unknown Artist";
  const albumTitle = currentTrack?.albums?.title || "Miracle FM";

  const lyricData = useMemo(() => parseLyrics(currentTrack?.lyrics), [currentTrack?.lyrics]);
  const hasLyrics = lyricData.lines.some((line) => line.text.trim());
  const activeLyricIndex = useMemo(
    () => getActiveLyricIndex(lyricData.lines, currentTime),
    [currentTime, lyricData.lines]
  );
  const progressPercent = Math.min((localProgress / (duration || 1)) * 100, 100);

  useEffect(() => {
    if (isSeeking) return;
    const frame = window.requestAnimationFrame(() => setLocalProgress(currentTime));
    return () => window.cancelAnimationFrame(frame);
  }, [currentTime, isSeeking]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!hasLyrics) setShowLyrics(false);
      setShowPlaylistMenu(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentTrack?.id, hasLyrics]);

  useEffect(() => {
    if (!showLyrics || !lyricData.hasTimestamps || activeLyricIndex < 0 || autoScrollPaused) return;

    const active = lyricData.lines[activeLyricIndex];
    const node = active ? lyricRefs.current[active.id] : null;
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLyricIndex, autoScrollPaused, lyricData.hasTimestamps, lyricData.lines, showLyrics]);

  useEffect(() => {
    return () => {
      if (autoScrollTimerRef.current) window.clearTimeout(autoScrollTimerRef.current);
    };
  }, []);

  const handleClose = () => {
    setShowLyrics(false);
    setShowPlaylistMenu(false);
    setDragY(0);
    setIsPanelDragging(false);
    toggleFullScreen();
  };

  const closeAndNavigate = (href: string) => {
    setShowLyrics(false);
    setShowPlaylistMenu(false);
    setDragY(0);
    toggleFullScreen();
    router.push(href);
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const url = `${window.location.origin}/song/${currentTrack.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: currentTrack.title, text: `Listen to ${currentTrack.title} on Miracle FM`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Song link copied");
    } catch {
      toast.message("Sharing was cancelled");
    }
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalProgress(parseFloat(event.target.value));
  };

  const handleSeekCommit = () => {
    seekTo(localProgress);
    setIsSeeking(false);
  };

  const handlePanelPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,a,input,[data-no-panel-drag='true']")) return;
    dragStartYRef.current = event.clientY;
    setIsPanelDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePanelPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanelDragging) return;
    const nextY = Math.max(0, event.clientY - dragStartYRef.current);
    setDragY(Math.min(nextY, 260));
  };

  const handlePanelPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanelDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsPanelDragging(false);

    if (dragY > 95) {
      handleClose();
      return;
    }

    setDragY(0);
  };

  const fetchMyPlaylists = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast.message("Sign in to add this song to a playlist.");

    const { data } = await supabase
      .from("playlists")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setMyPlaylists(data);
    setShowPlaylistMenu((value) => !value);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!currentTrack) return;

    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      track_id: currentTrack.id,
    });

    if (error?.code === "23505") toast.error("Already in this playlist");
    else if (!error) toast.success("Added to playlist");

    setShowPlaylistMenu(false);
  };

  const pauseLyricAutoScroll = () => {
    setAutoScrollPaused(true);
    if (autoScrollTimerRef.current) window.clearTimeout(autoScrollTimerRef.current);
    autoScrollTimerRef.current = window.setTimeout(() => setAutoScrollPaused(false), 3500);
  };

  if (!isFullScreen || !currentTrack) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] h-[100dvh] overflow-hidden bg-[#030303] text-white select-none",
        !isPanelDragging && "animate-in slide-in-from-bottom-[100%] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transition-transform"
      )}
      style={{ transform: dragY ? `translateY(${dragY}px)` : undefined }}
      onPointerDown={handlePanelPointerDown}
      onPointerMove={handlePanelPointerMove}
      onPointerUp={handlePanelPointerEnd}
      onPointerCancel={handlePanelPointerEnd}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {displayImage ? (
          <>
            <Image src={displayImage} alt="" fill className="scale-125 object-cover opacity-45 blur-[90px] saturate-150" priority />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(3,3,3,0.74),rgba(3,3,3,0.9)_48%,rgba(0,0,0,0.98))]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#050505]" />
        )}
      </div>

      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8 md:pb-8 md:pt-6">
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/25 md:hidden" />

        <header className="flex shrink-0 items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Minimize player"
          >
            <ChevronDown size={27} />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
              <span className={cn("h-1.5 w-1.5 rounded-full bg-[#FF0055]", isPlaying && "animate-pulse")} />
              Miracle FM Live
            </p>
            <button
              disabled={!albumId}
              onClick={() => albumId && closeAndNavigate(`/album/${albumId}`)}
              className={cn(
                "mt-1 max-w-[58vw] truncate text-sm font-black text-white md:max-w-[420px]",
                albumId && "hover:text-[#FF4D89]"
              )}
            >
              {albumTitle}
            </button>
          </div>

          <button
            onClick={() => closeAndNavigate(`/song/${currentTrack.id}`)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/75 transition hover:bg-white/10 hover:text-white active:scale-95"
            aria-label="Open song page"
            title="Open song"
          >
            <ExternalLink size={20} />
          </button>
        </header>

        <main className="grid min-h-0 flex-1 gap-4 pt-3 md:grid-cols-[minmax(330px,0.95fr)_minmax(420px,1.05fr)] md:gap-8 md:pt-7">
          <section className={cn("min-h-0 flex-col", showLyrics ? "hidden md:flex" : "flex")}>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <ArtworkPanel displayImage={displayImage} title={currentTrack.title} isPlaying={isPlaying} />
            </div>

            <div className="shrink-0 pt-3 md:pt-5">
              <TrackIdentity
                track={currentTrack}
                artistName={artistName}
                artistId={artistId}
                albumTitle={albumTitle}
                albumId={albumId}
                onNavigate={closeAndNavigate}
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col">
            <div className={cn("min-h-0 overflow-hidden", showLyrics ? "flex-1" : "hidden md:block md:flex-1")}>
              {showLyrics && hasLyrics ? (
                <LyricsPanel
                  lines={lyricData.lines}
                  hasTimestamps={lyricData.hasTimestamps}
                  activeIndex={activeLyricIndex}
                  containerRef={lyricsScrollRef}
                  lyricRefs={lyricRefs}
                  onManualScroll={pauseLyricAutoScroll}
                />
              ) : (
                <DesktopNowPlayingSummary
                  track={currentTrack}
                  artistName={artistName}
                  artistId={artistId}
                  albumTitle={albumTitle}
                  albumId={albumId}
                  onNavigate={closeAndNavigate}
                  hasLyrics={hasLyrics}
                  onLyrics={() => setShowLyrics(true)}
                />
              )}
            </div>

            <div className="mt-3 shrink-0 space-y-3 rounded-[1.75rem] border border-white/10 bg-black/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:mt-4 md:space-y-4 md:p-5">
              <ActionDock
                track={currentTrack}
                hasLyrics={hasLyrics}
                isLyricsActive={showLyrics}
                onLyrics={() => setShowLyrics((value) => !value)}
                onShare={handleShare}
                onFetchPlaylists={fetchMyPlaylists}
                showPlaylistMenu={showPlaylistMenu}
                myPlaylists={myPlaylists}
                onAddToPlaylist={addToPlaylist}
                onClosePlaylistMenu={() => setShowPlaylistMenu(false)}
              />

              <ProgressBar
                duration={duration}
                localProgress={localProgress}
                progressPercent={progressPercent}
                isSeeking={isSeeking}
                onSeekStart={() => setIsSeeking(true)}
                onSeekChange={handleSeekChange}
                onSeekCommit={handleSeekCommit}
              />

              <PlaybackControls
                isPlaying={isPlaying}
                isShuffled={isShuffled}
                repeatMode={repeatMode}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onPrevious={playPrevious}
                onNext={playNext}
                onShuffle={toggleShuffle}
                onRepeat={toggleRepeat}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ArtworkPanel({ displayImage, title, isPlaying }: { displayImage?: string | null; title: string; isPlaying: boolean }) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[min(76vw,430px)] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_32px_90px_-24px_rgba(0,0,0,0.95)] transition duration-700 md:max-w-[520px] md:rounded-[2.5rem]",
        isPlaying ? "scale-100" : "scale-[0.96] opacity-85"
      )}
    >
      {displayImage ? (
        <Image src={displayImage} alt={title} fill className="object-cover" priority />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900">
          <Music2 size={86} className="text-zinc-700" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/75 backdrop-blur-xl">
        <Radio size={12} className="text-[#FF0055]" />
        Live
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex h-12 items-end justify-center gap-1.5 opacity-75">
        {Array.from({ length: 22 }).map((_, index) => (
          <span
            key={index}
            className={cn("w-1 rounded-full bg-white/70", isPlaying && "animate-pulse")}
            style={{ height: `${18 + ((index * 13) % 28)}px`, animationDelay: `${index * 55}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function TrackIdentity({
  track,
  artistName,
  artistId,
  albumTitle,
  albumId,
  onNavigate,
}: {
  track: Track;
  artistName: string;
  artistId: string | null;
  albumTitle: string;
  albumId: string | null;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="text-center md:text-left">
      <h1 className="line-clamp-2 text-3xl font-black leading-[0.98] tracking-tight text-white md:text-5xl lg:text-6xl">
        {track.title}
      </h1>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-white/62 md:justify-start md:text-base">
        {artistId ? (
          <button onClick={() => onNavigate(`/artist/${artistId}`)} className="hover:text-[#FF4D89] hover:underline">
            {artistName}
          </button>
        ) : (
          <span>{artistName}</span>
        )}
        <span className="h-1 w-1 rounded-full bg-white/25" />
        {albumId ? (
          <button onClick={() => onNavigate(`/album/${albumId}`)} className="max-w-[260px] truncate hover:text-[#FF4D89] hover:underline">
            {albumTitle}
          </button>
        ) : (
          <span className="max-w-[260px] truncate">{albumTitle}</span>
        )}
      </div>
    </div>
  );
}

function DesktopNowPlayingSummary({
  track,
  artistName,
  artistId,
  albumTitle,
  albumId,
  onNavigate,
  onLyrics,
  hasLyrics,
}: {
  track: Track;
  artistName: string;
  artistId: string | null;
  albumTitle: string;
  albumId: string | null;
  onNavigate: (href: string) => void;
  onLyrics: () => void;
  hasLyrics: boolean;
}) {
  return (
    <div data-no-panel-drag="true" className="hidden h-full min-h-0 flex-col justify-center rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 backdrop-blur-xl md:flex">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FF4D89]">Now listening</p>
      <h2 className="mt-4 line-clamp-3 text-5xl font-black leading-none tracking-tight text-white">{track.title}</h2>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-base font-bold text-white/62">
        {artistId ? (
          <button onClick={() => onNavigate(`/artist/${artistId}`)} className="hover:text-[#FF4D89] hover:underline">
            {artistName}
          </button>
        ) : (
          <span>{artistName}</span>
        )}
        <span className="h-1 w-1 rounded-full bg-white/25" />
        {albumId ? (
          <button onClick={() => onNavigate(`/album/${albumId}`)} className="max-w-[320px] truncate hover:text-[#FF4D89] hover:underline">
            {albumTitle}
          </button>
        ) : (
          <span className="max-w-[320px] truncate">{albumTitle}</span>
        )}
      </div>
      {hasLyrics && (
        <button onClick={onLyrics} className="mt-8 w-fit rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-[#FF4D89] hover:text-white">
          Open Lyrics
        </button>
      )}
    </div>
  );
}

function LyricsPanel({
  lines,
  hasTimestamps,
  activeIndex,
  containerRef,
  lyricRefs,
  onManualScroll,
}: {
  lines: LyricLine[];
  hasTimestamps: boolean;
  activeIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  lyricRefs: React.MutableRefObject<Record<string, HTMLParagraphElement | null>>;
  onManualScroll: () => void;
}) {
  return (
    <div
      ref={containerRef}
      data-no-panel-drag="true"
      onWheel={onManualScroll}
      onTouchMove={onManualScroll}
      className="h-full overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0A0A0A]/72 px-5 py-7 shadow-inner backdrop-blur-2xl touch-pan-y md:px-8 md:py-9"
    >
      <div className="mb-7 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FF4D89]">Lyrics</p>
          <p className="mt-1 text-xs font-bold text-white/38">{hasTimestamps ? "Synced with playback" : "Lyric sheet"}</p>
        </div>
      </div>

      <div className="space-y-4 pb-24">
        {lines.map((line, index) => {
          const isActive = hasTimestamps && index === activeIndex;
          return (
            <p
              key={line.id}
              ref={(node) => {
                lyricRefs.current[line.id] = node;
              }}
              className={cn(
                "whitespace-pre-wrap text-2xl font-black leading-snug tracking-tight transition duration-300 md:text-4xl",
                !line.text && "h-5",
                hasTimestamps
                  ? isActive
                    ? "scale-[1.01] text-white drop-shadow-[0_0_22px_rgba(255,0,85,0.32)]"
                    : "text-white/28"
                  : "text-white/88"
              )}
            >
              {line.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function ActionDock({
  track,
  hasLyrics,
  isLyricsActive,
  onLyrics,
  onShare,
  onFetchPlaylists,
  showPlaylistMenu,
  myPlaylists,
  onAddToPlaylist,
  onClosePlaylistMenu,
}: {
  track: Track;
  hasLyrics: boolean;
  isLyricsActive: boolean;
  onLyrics: () => void;
  onShare: () => void;
  onFetchPlaylists: () => void;
  showPlaylistMenu: boolean;
  myPlaylists: Pick<Playlist, "id" | "title">[];
  onAddToPlaylist: (playlistId: string) => void;
  onClosePlaylistMenu: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {hasLyrics && (
          <IconButton onClick={onLyrics} active={isLyricsActive} label="Toggle lyrics">
            <FileText size={20} />
          </IconButton>
        )}
        <IconButton onClick={onShare} label="Share song">
          <Share2 size={20} />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]">
          <LikeButton trackId={track.id} />
        </div>
        <div className="relative">
          <IconButton onClick={onFetchPlaylists} label="Add to playlist">
            <PlusCircle size={21} />
          </IconButton>
          {showPlaylistMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={onClosePlaylistMenu} />
              <div data-no-panel-drag="true" className="absolute bottom-full right-0 z-50 mb-3 w-64 rounded-2xl border border-white/10 bg-[#121212]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.9)] backdrop-blur-xl">
                <p className="border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/45">Save to Playlist</p>
                <div className="max-h-56 overflow-y-auto py-1">
                  {myPlaylists.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs font-bold text-white/40">No playlists found</p>
                  ) : (
                    myPlaylists.map((playlist) => (
                      <button key={playlist.id} onClick={() => onAddToPlaylist(playlist.id)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-zinc-200 transition hover:bg-white/10">
                        <ListMusic size={16} className="text-[#FF0055]" />
                        <span className="truncate">{playlist.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, label, active, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.06] text-white/62 transition hover:bg-white/10 hover:text-white active:scale-95",
        active && "bg-[#FF0055] text-white hover:bg-[#FF0055]"
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ProgressBar({
  duration,
  localProgress,
  progressPercent,
  isSeeking,
  onSeekStart,
  onSeekChange,
  onSeekCommit,
}: {
  duration: number;
  localProgress: number;
  progressPercent: number;
  isSeeking: boolean;
  onSeekStart: () => void;
  onSeekChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekCommit: () => void;
}) {
  return (
    <div data-no-panel-drag="true" className="group space-y-2">
      <div className="relative flex h-3 items-center">
        <div className="absolute h-2 w-full overflow-hidden rounded-full bg-white/16">
          <div className={cn("h-full", isSeeking ? "bg-[#FF0055]" : "bg-white group-hover:bg-[#FF0055]")} style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={cn("absolute h-4 w-4 rounded-full bg-white shadow-lg transition", isSeeking ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ left: `${progressPercent}%`, transform: "translateX(-50%)" }} />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={localProgress}
          onChange={onSeekChange}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
          onMouseUp={onSeekCommit}
          onTouchEnd={onSeekCommit}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 touch-none"
          aria-label="Seek playback position"
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] font-bold tracking-wider text-white/45">
        <span>{formatTime(localProgress)}</span>
        <span>-{formatTime((duration || 0) - localProgress)}</span>
      </div>
    </div>
  );
}

function PlaybackControls({
  isPlaying,
  isShuffled,
  repeatMode,
  onPlayPause,
  onPrevious,
  onNext,
  onShuffle,
  onRepeat,
}: {
  isPlaying: boolean;
  isShuffled: boolean;
  repeatMode: "off" | "all" | "one";
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onShuffle} className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] transition active:scale-95", isShuffled ? "text-[#FF0055]" : "text-white/48 hover:text-white")} aria-label="Toggle shuffle">
        <Shuffle size={21} />
      </button>

      <div className="flex items-center gap-4 md:gap-6">
        <button onClick={onPrevious} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-white transition hover:text-[#FF4D89] active:scale-95" aria-label="Previous track">
          <SkipBack size={28} fill="currentColor" />
        </button>
        <button onClick={onPlayPause} className="flex h-[4.35rem] w-[4.35rem] items-center justify-center rounded-full bg-white text-black shadow-[0_18px_48px_rgba(255,255,255,0.12)] transition active:scale-95 md:h-20 md:w-20" aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
        </button>
        <button onClick={onNext} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06] text-white transition hover:text-[#FF4D89] active:scale-95" aria-label="Next track">
          <SkipForward size={28} fill="currentColor" />
        </button>
      </div>

      <button onClick={onRepeat} className={cn("relative flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] transition active:scale-95", repeatMode !== "off" ? "text-[#FF0055]" : "text-white/48 hover:text-white")} aria-label="Toggle repeat">
        {repeatMode === "one" ? <Repeat1 size={21} /> : <Repeat size={21} />}
        {repeatMode !== "off" && <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#FF0055]" />}
      </button>
    </div>
  );
}

function parseLyrics(lyrics?: string | null): { lines: LyricLine[]; hasTimestamps: boolean } {
  const rawLines = lyrics?.replace(/\r/g, "").split("\n") || [];
  const lines: LyricLine[] = [];
  let hasTimestamps = false;

  rawLines.forEach((line, index) => {
    const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, "").trim();

    if (matches.length === 0) {
      lines.push({ id: `plain-${index}`, time: null, text: line.trimEnd() });
      return;
    }

    hasTimestamps = true;
    matches.forEach((match, matchIndex) => {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
      lines.push({
        id: `timed-${index}-${matchIndex}`,
        time: minutes * 60 + seconds + fraction,
        text,
      });
    });
  });

  return {
    lines: lines.filter((line) => line.text || line.time !== null),
    hasTimestamps,
  };
}

function getActiveLyricIndex(lines: LyricLine[], currentTime: number) {
  let activeIndex = -1;

  lines.forEach((line, index) => {
    if (line.time !== null && line.time <= currentTime) activeIndex = index;
  });

  return activeIndex;
}

function formatTime(time: number) {
  if (!time || Number.isNaN(time) || time === Infinity) return "0:00";
  const minutes = Math.floor(Math.max(0, time) / 60);
  const seconds = Math.floor(Math.max(0, time) % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
