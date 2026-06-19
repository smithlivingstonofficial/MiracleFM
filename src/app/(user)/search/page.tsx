// src/app/(user)/search/page.tsx

"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon, Disc, Mic2, ListMusic, Clock3 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
import SongPlayButton from "@/components/user/SongPlayButton";
import LikeButton from "@/components/user/LikeButton";
import { shouldRenderSongListAdAfter } from "@/lib/ads";
import type { Album, Artist, Playlist, Track } from "@/types/music";

type SearchResults = {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
};

type SearchTab = "all" | "songs" | "artists" | "albums" | "playlists";

const emptyResults: SearchResults = { tracks: [], artists: [], albums: [], playlists: [] };
const isArtistResult = (result: Artist | Album): result is Artist => "name" in result;

const mergeTracks = (primary: Track[], secondary: Track[]) => {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
};

const formatDuration = (value?: number | null) => {
  if (!value || !Number.isFinite(value)) return "--:--";
  const seconds = Math.max(0, Math.round(value > 10_000 ? value / 1000 : value));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

const getTrackImage = (track: Track) =>
  track.cover_url || track.albums?.cover_url || track.artists?.image_url || "/miraclefm-192.png";

function SearchTrackResult({ track, index, queue }: { track: Track; index: number; queue: Track[] }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition-all hover:border-[#FF0055]/30 hover:bg-white/[0.06] md:rounded-[1.35rem] md:p-3.5">
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_12%_20%,rgba(255,0,85,0.16),transparent_34%)]" />
      <div className="relative z-10 flex items-center gap-3 md:gap-4">
        <div className="hidden w-8 shrink-0 text-center font-mono text-sm text-zinc-500 md:block">
          {index + 1}
        </div>

        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-zinc-900 shadow-lg md:h-16 md:w-16">
          <Image src={getTrackImage(track)} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
        </div>

        <div className="min-w-0 flex-1">
          <Link href={`/song/${track.id}`} className="block truncate text-sm font-black text-white transition-colors hover:text-[#FF0055] md:text-base">
            {track.title}
          </Link>
          <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 md:text-[11px]">
            {track.artists?.name || "Miracle FM"}
          </p>
          <div className="mt-2 hidden items-center gap-2 text-xs font-medium text-zinc-500 md:flex">
            <Disc size={13} className="text-[#FF0055]" />
            <span className="truncate">{track.albums?.title || "Single"}</span>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 text-sm text-zinc-500 lg:block">
          <p className="truncate">{track.albums?.title || "Single"}</p>
        </div>

        <div className="hidden items-center gap-1.5 text-xs font-black tabular-nums text-zinc-500 md:flex">
          <Clock3 size={13} />
          {formatDuration(track.duration_seconds || track.duration)}
        </div>

        <div className="hidden items-center md:flex" onClick={(event) => event.stopPropagation()}>
          <LikeButton trackId={track.id} />
        </div>

        <SongPlayButton
          track={track}
          queue={queue}
          label=""
          className="h-12 w-12 shrink-0 px-0 py-0 shadow-[0_14px_34px_-18px_rgba(255,0,85,0.95)] md:h-11 md:w-11"
        />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchShell />}>
      <SearchExperience />
    </Suspense>
  );
}

function SearchShell() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] pb-56 text-zinc-100 selection:bg-[#FF0055] selection:text-white md:pb-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,85,0.16),transparent_42%),linear-gradient(180deg,rgba(25,6,13,0.95),rgba(5,5,5,0.82)_48%,#050505)]" />
      <div className="relative mx-auto max-w-7xl px-4 pt-16 md:px-8 md:pt-24" />
    </div>
  );
}

function SearchExperience() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem("miraclefm-recent-searches") || "[]");
  });
  const [activeTab, setActiveTab] = useState<SearchTab>("all");
  const requestIdRef = useRef(0);
  const supabase = createClient();

  useEffect(() => {
    const trimmedQuery = query.trim();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const delayDebounceFn = setTimeout(async () => {
      if (trimmedQuery.length > 1) {
        const [t, a, alb, pl, lyrics] = await Promise.all([
          supabase
            .from("tracks")
            .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
            .eq("audio_status", "ready")
            .ilike("title", `%${trimmedQuery}%`)
            .limit(8),
          supabase.from("artists").select("*").ilike("name", `%${trimmedQuery}%`).limit(5),
          supabase.from("albums").select("*, artists(name)").ilike("title", `%${trimmedQuery}%`).limit(5),
          supabase
            .from("playlists")
            .select("id, title, cover_url, user_id, is_public")
            .or("user_id.is.null,is_public.eq.true")
            .ilike("title", `%${trimmedQuery}%`)
            .limit(5),
          supabase
            .from("tracks")
            .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
            .eq("audio_status", "ready")
            .ilike("lyrics", `%${trimmedQuery}%`)
            .limit(5),
        ]);

        if (requestIdRef.current !== requestId) return;

        const allCoreSearchesFailed = Boolean(t.error && a.error && alb.error && pl.error);
        if (allCoreSearchesFailed) {
          setErrorMessage("Search is having trouble right now. Please try again.");
          setResults(emptyResults);
          setLoading(false);
          return;
        }
        
        setResults({
          tracks: mergeTracks(t.data || [], lyrics.error ? [] : lyrics.data || []).slice(0, 8),
          artists: a.error ? [] : a.data ||[],
          albums: alb.error ? [] : alb.data ||[],
          playlists: pl.error ? [] : pl.data ||[],
        });
        setErrorMessage("");
        setLoading(false);
        if (!t.error || !a.error || !alb.error || !pl.error) {
          setRecentSearches((current) => {
            const next = [trimmedQuery, ...current.filter((item) => item.toLowerCase() !== trimmedQuery.toLowerCase())].slice(0, 5);
            localStorage.setItem("miraclefm-recent-searches", JSON.stringify(next));
            return next;
          });
        }
      } else {
        setResults(emptyResults);
        setErrorMessage("");
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, supabase]);

  const resultCount = results.tracks.length + results.artists.length + results.albums.length + results.playlists.length;
  const showSearchAd = query.trim().length > 1 && !loading && !errorMessage && resultCount > 0;
  const showSongs = activeTab === "all" || activeTab === "songs";
  const showArtists = activeTab === "all" || activeTab === "artists";
  const showAlbums = activeTab === "all" || activeTab === "albums";
  const showPlaylists = activeTab === "all" || activeTab === "playlists";
  const showOverview = activeTab === "all";
  const topResult: Artist | Album | null = results.artists.length > 0 ? results.artists[0] : (results.albums.length > 0 ? results.albums[0] : null);
  const topResultIsArtist = topResult ? isArtistResult(topResult) : false;
  const topResultImage = topResult
    ? (isArtistResult(topResult)
      ? topResult.image_url
      : topResult.cover_url)
    : null;
  const topResultTitle = topResult
    ? (isArtistResult(topResult) ? topResult.name : topResult.title)
    : "";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] pb-56 text-zinc-100 selection:bg-[#FF0055] selection:text-white md:pb-40">
      
      {/* Background Atmosphere */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,0,85,0.18),transparent_42%),radial-gradient(circle_at_18%_26%,rgba(255,255,255,0.055),transparent_26%),linear-gradient(180deg,rgba(25,6,13,0.95),rgba(5,5,5,0.82)_48%,#050505)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-[#FF0055]/70 via-[#FF0055]/15 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        {/* --- EMPTY STATE --- */}
        {!query && (
          <div className="animate-in fade-in flex flex-col items-center justify-center px-2 pb-12 pt-12 text-center duration-1000 md:pb-20 md:pt-20">
            <div className="relative mb-7 flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_70px_rgba(255,0,85,0.08)]">
                <div className="absolute inset-0 rounded-full bg-[#FF0055]/10 blur-2xl animate-pulse" />
                <SearchIcon size={42} className="relative text-zinc-600" />
            </div>
            <h2 className="mb-2 text-3xl font-black tracking-tight text-white md:text-5xl">Find Your Worship</h2>
            <p className="max-w-md text-sm font-semibold leading-6 text-zinc-500 md:text-base">Search for songs, artists, albums, playlists, or lyrics when available.</p>
            {recentSearches.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      router.replace(`/search?q=${encodeURIComponent(item.trim())}`, { scroll: false });
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:border-[#FF0055]/35 hover:bg-[#FF0055]/10 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- RESULTS SECTION --- */}
        {query && (
          <div className="animate-in fade-in slide-in-from-bottom-8 space-y-5 pb-8 duration-700 md:space-y-6">
            {resultCount > 0 && (
              <div className="search-tabs-scroll sticky top-0 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-white/5 bg-[#050505]/88 px-4 py-3 shadow-[0_18px_50px_-42px_rgba(255,0,85,0.7)] backdrop-blur-xl md:mx-0 md:mt-4 md:rounded-full md:border md:bg-white/[0.045] md:px-3">
                {[
                  ["all", "All", resultCount],
                  ["songs", "Songs", results.tracks.length],
                  ["artists", "Artists", results.artists.length],
                  ["albums", "Albums", results.albums.length],
                  ["playlists", "Playlists", results.playlists.length],
                ].map(([value, label, count]) => (
                  <button
                    key={value}
                    onClick={() => setActiveTab(value as SearchTab)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                      activeTab === value
                        ? "border-[#FF0055] bg-[#FF0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.25)]"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {label} {count}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm font-bold text-zinc-400">
                Searching Miracle FM...
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-7">
                {errorMessage && (
                  <div className="lg:col-span-12 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </div>
                )}
                
                {/* --- LEFT COL: TOP RESULT --- */}
                {showOverview && topResult && (
                    <div className="lg:col-span-4">
                        <h2 className="mb-4 text-xl font-black tracking-tight text-white md:text-2xl">Top Result</h2>
                        <Link 
                            href={topResultIsArtist ? `/artist/${topResult.id}` : `/album/${topResult.id}`} 
                            className="group relative block overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.25))] p-5 shadow-xl transition-all duration-500 active:scale-[0.98] hover:border-[#FF0055]/35 hover:bg-white/[0.06] hover:shadow-[0_18px_60px_-42px_rgba(255,0,85,0.75)] md:p-6"
                        >
                            {/* Animated Background Glow */}
                            <div className="pointer-events-none absolute -inset-20 bg-gradient-to-br from-[#FF0055]/16 via-transparent to-transparent opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />

                            <div className="relative z-10 flex items-center gap-5 lg:block">
                                <div className={`relative h-24 w-24 shrink-0 overflow-hidden shadow-2xl md:h-28 md:w-28 lg:mb-7 lg:h-36 lg:w-36 ${topResultIsArtist ? 'rounded-full' : 'rounded-2xl'}`}>
                                    {topResultImage ? (
                                        <Image src={topResultImage} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                                            {topResultIsArtist ? <Mic2 size={32} className="text-zinc-600"/> : <Disc size={32} className="text-zinc-600"/>}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="min-w-0">
                                    <h3 className="line-clamp-2 text-3xl font-black leading-[1.12] tracking-tight text-white transition-colors group-hover:text-[#FF0055] md:text-4xl">
                                        {topResultTitle}
                                    </h3>
                                    <div className="mt-4 flex items-center gap-2">
                                        <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                                            {topResultIsArtist ? 'Artist' : 'Album'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* --- RIGHT COL: SONGS --- */}
                {showSongs && results.tracks.length > 0 && (
                    <div className={showOverview && topResult ? "lg:col-span-8" : "lg:col-span-12"}>
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Songs</h2>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{results.tracks.length} tracks</p>
                        </div>
                        <div className="space-y-2.5">
                            {results.tracks.map((track, i) => (
                                <div key={track.id}>
                                    <SearchTrackResult track={track} index={i} queue={results.tracks} />
                                    {shouldRenderSongListAdAfter(i, results.tracks.length) && <SongListAdRow fallbackIndex={i} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {showSearchAd && results.tracks.length < 8 && (
              <ResponsiveAd variant="banner" className="px-0" />
            )}

            {/* --- ARTISTS ROW (Story Ring Design) --- */}
            {showArtists && results.artists.length > 0 && (
              <section className="-mx-4 px-4 md:mx-0 md:px-0">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-5">Artists</h2>
                <div className="flex gap-4 md:gap-8 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar pr-4 md:pr-0">
                  {results.artists.map(artist => (
                    <Link key={artist.id} href={`/artist/${artist.id}`} className="min-w-[110px] md:min-w-[140px] snap-start flex flex-col items-center group active:scale-95 md:active:scale-100 transition-transform duration-300">
                      
                      {/* Story Ring #FF0055 Theme */}
                      <div className="w-[100px] h-[100px] md:w-32 md:h-32 rounded-full p-[3px] md:p-[4px] bg-gradient-to-b from-[#FF0055] via-[#ff1a66] to-[#4d001a] mb-3 md:mb-4 shadow-[0_0_15px_rgba(255,0,85,0.2)] md:group-hover:shadow-[0_0_25px_rgba(255,0,85,0.5)] transition-all duration-500 relative overflow-hidden">
                         <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0%,#FF0055_50%,transparent_100%)] animate-[spin_4s_linear_infinite] opacity-40 mix-blend-overlay" />
                         <div className="w-full h-full rounded-full overflow-hidden bg-[#050505] border-[3px] md:border-4 border-[#050505] relative z-10">
                            {artist.image_url ? (
                                <Image src={artist.image_url} alt="" fill className="object-cover md:filter md:grayscale md:group-hover:grayscale-0 transition-all duration-500 md:scale-100 md:group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Mic2 size={32} className="text-zinc-600"/></div>
                            )}
                         </div>
                      </div>
                      <p className="font-bold text-xs md:text-sm text-zinc-200 md:text-zinc-300 md:group-hover:text-white truncate w-full text-center px-1 transition-colors">{artist.name}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* --- ALBUMS GRID --- */}
            {showAlbums && results.albums.length > 0 && (
              <section>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-5">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {results.albums.map(album => (
                    <Link key={album.id} href={`/album/${album.id}`} className="group flex flex-col gap-2 md:gap-3 active:scale-95 md:active:scale-100 transition-transform duration-300">
                      <div className="aspect-square relative rounded-2xl md:rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-white/5 shadow-md md:group-hover:shadow-[0_10px_25px_rgba(255,255,255,0.05)] md:group-hover:border-white/20 md:group-hover:-translate-y-1 transition-all duration-500">
                        {album.cover_url ? (
                            <Image src={album.cover_url} alt="" fill className="object-cover md:transition-transform md:duration-700 md:group-hover:scale-105" />
                        ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><Disc size={40} className="text-zinc-600"/></div>
                        )}
                        <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="px-1">
                        <p className="font-bold text-sm md:text-base text-zinc-100 truncate md:group-hover:text-white transition-colors">{album.title}</p>
                        <p className="text-[10px] md:text-xs text-zinc-400 md:text-zinc-500 font-bold uppercase tracking-wider truncate mt-0.5">{album.artists?.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {showPlaylists && results.playlists.length > 0 && (
              <section>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-5">Playlists</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {results.playlists.map((playlist) => (
                    <Link key={playlist.id} href={`/playlist/${playlist.id}`} className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-[#FF0055]/30 hover:bg-white/[0.06]">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 text-[#FF0055]">
                        {playlist.cover_url ? <Image src={playlist.cover_url} alt="" width={56} height={56} className="h-full w-full object-cover" /> : <ListMusic size={24} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{playlist.title}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Playlist</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* --- NO RESULTS MESSAGE --- */}
            {query && !loading && resultCount === 0 && (
              <div className="text-center py-20 text-zinc-500 animate-in fade-in">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <SearchIcon size={32} className="text-zinc-600" />
                </div>
                <p className="font-black text-lg text-white mb-1">No worship results found</p>
                <p className="text-sm">Try a song title, artist, album, or lyric when available.</p>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
