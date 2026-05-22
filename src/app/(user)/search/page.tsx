// src/app/(user)/search/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon, Disc, Mic2, X, Loader2, Play, ListMusic } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import TrackRow from "@/components/user/TrackRow";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import SongListAdRow from "@/components/ads/SongListAdRow";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
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
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[400px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        
        {/* --- SEARCH HEADER --- */}
        <div className="sticky top-0 z-40 py-4 md:py-6 -mx-4 px-4 md:mx-0 md:px-0 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 mb-8 md:mb-10 transition-all">
          <div className="relative max-w-2xl mx-auto group">
            
            {/* Search Icon / Loader */}
            <div className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#FF0055] transition-colors z-10">
               {loading ? <Loader2 size={22} className="animate-spin text-[#FF0055]" /> : <SearchIcon size={22} />}
            </div>
            
            <input 
              value={query}
              onChange={(e) => {
                  setQuery(e.target.value);
                  if(e.target.value.trim().length > 1) setLoading(true);
              }}
              placeholder="Search songs, artists, albums, or lyrics when available"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-full py-4 md:py-5 pl-14 md:pl-16 pr-14 md:pr-16 text-white text-base md:text-lg font-black outline-none focus:bg-black focus:border-[#FF0055]/50 focus:ring-4 focus:ring-[#FF0055]/10 transition-all placeholder:text-zinc-600 shadow-2xl"
              autoFocus
            />

            {/* Clear Button */}
            {query && (
                <button 
                  onClick={() => { setQuery(""); setResults(emptyResults); setErrorMessage(""); }}
                  className="absolute right-5 md:right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-all active:scale-90"
                  aria-label="Clear search"
                >
                    <X size={16} />
                </button>
            )}
          </div>
        </div>

        {/* --- EMPTY STATE --- */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center animate-in fade-in duration-1000">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.02)] animate-[pulse_4s_ease-in-out_infinite]">
                <SearchIcon size={40} className="text-zinc-700" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2">Find Your Worship</h2>
            <p className="text-sm md:text-base font-medium text-zinc-500 max-w-sm">Search for songs, artists, albums, or lyrics when available.</p>
            {recentSearches.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuery(item)}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
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
          <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {errorMessage && (
                  <div className="lg:col-span-12 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </div>
                )}
                
                {/* --- LEFT COL: TOP RESULT --- */}
                {topResult && (
                    <div className="lg:col-span-5">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-5">Top Result</h2>
                        <Link 
                            href={topResultIsArtist ? `/artist/${topResult.id}` : `/album/${topResult.id}`} 
                            className="group relative block overflow-hidden rounded-[2rem] bg-[#0A0A0A] border border-white/5 hover:border-[#FF0055]/30 p-6 md:p-8 active:scale-[0.98] md:active:scale-100 transition-all duration-500 shadow-xl hover:shadow-[0_10px_40px_rgba(255,0,85,0.15)]"
                        >
                            {/* Animated Background Glow */}
                            <div className="absolute -inset-20 bg-gradient-to-br from-[#FF0055]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-700 pointer-events-none" />

                            <div className="relative z-10 flex flex-col gap-6">
                                <div className={`relative w-28 h-28 md:w-32 md:h-32 overflow-hidden shadow-2xl ${topResultIsArtist ? 'rounded-full' : 'rounded-2xl'}`}>
                                    {topResultImage ? (
                                        <Image src={topResultImage} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            {topResultIsArtist ? <Mic2 size={32} className="text-zinc-600"/> : <Disc size={32} className="text-zinc-600"/>}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-end justify-between">
                                    <div>
                                        <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none group-hover:text-[#FF0055] transition-colors line-clamp-2">
                                            {topResultTitle}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-3">
                                            <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-zinc-300">
                                                {topResultIsArtist ? 'Artist' : 'Album'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Play Button overlay */}
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#FF0055] flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,0,85,0.4)] translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:bg-[#ff1a66]">
                                        <Play fill="currentColor" size={24} className="ml-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* --- RIGHT COL: SONGS --- */}
                {showSongs && results.tracks.length > 0 && (
                    <div className={topResult ? "lg:col-span-7" : "lg:col-span-12"}>
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-5">Songs</h2>
                        <div className="space-y-1">
                            {results.tracks.map((track, i) => (
                                <div key={track.id}>
                                    <div className="active:scale-[0.99] md:active:scale-100 transition-transform">
                                        <TrackRow 
                                            track={track} 
                                            index={i} 
                                            context="Search" 
                                            allTracks={results.tracks}
                                        />
                                    </div>
                                    {shouldRenderSongListAdAfter(i, results.tracks.length) && <SongListAdRow fallbackIndex={i} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {resultCount > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                      activeTab === value
                        ? "border-[#FF0055] bg-[#FF0055] text-white"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {label} {count}
                  </button>
                ))}
              </div>
            )}

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
