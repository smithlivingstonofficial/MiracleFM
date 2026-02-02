"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon, Disc, Mic2, Music, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import TrackRow from "@/components/user/TrackRow";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ tracks: any[], artists: any[], albums: any[] }>({
    tracks: [], artists: [], albums: []
  });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        const [t, a, alb] = await Promise.all([
          supabase.from("tracks").select("*, artists(name), albums(title, cover_url)").ilike("title", `%${query}%`).limit(5),
          supabase.from("artists").select("*").ilike("name", `%${query}%`).limit(5),
          supabase.from("albums").select("*, artists(name)").ilike("title", `%${query}%`).limit(5)
        ]);
        
        setResults({
          tracks: t.data || [],
          artists: a.data || [],
          albums: alb.data || []
        });
        setLoading(false);
      } else {
        setResults({ tracks: [], artists: [], albums: [] });
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="p-6 md:p-10 min-h-screen pb-32">
      {/* Search Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-xl z-20 py-4 -mx-6 px-6 mb-8 border-b border-white/5">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-zinc-900/50 border border-white/10 rounded-full py-4 pl-12 pr-6 text-white font-medium outline-none focus:bg-zinc-900 focus:border-[#FF0055] transition-all placeholder:text-zinc-500"
            autoFocus
          />
        </div>
      </div>

      {!query && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <SearchIcon size={64} className="mb-4 opacity-20" />
          <p className="font-bold text-lg">Search for songs, artists, or albums</p>
        </div>
      )}

      {query && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {/* Top Result (Best Match) */}
          {(results.artists.length > 0 || results.albums.length > 0) && (
            <section>
              <h2 className="text-xl font-black text-white mb-4">Top Result</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.artists[0] && (
                  <Link href={`/artist/${results.artists[0].id}`} className="bg-zinc-900/50 p-6 rounded-[2rem] hover:bg-zinc-900 transition-colors group flex items-center gap-6">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-lg">
                      <Image src={results.artists[0].image_url || "/placeholder.jpg"} alt="" fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white group-hover:text-[#FF0055] transition-colors">{results.artists[0].name}</h3>
                      <span className="text-xs font-bold bg-black/50 px-3 py-1 rounded-full uppercase tracking-wider text-zinc-400 mt-2 inline-block">Artist</span>
                    </div>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Songs */}
          {results.tracks.length > 0 && (
            <section>
              <h2 className="text-xl font-black text-white mb-4">Songs</h2>
              <div className="space-y-1">
                {results.tracks.map((track, i) => (
                  <TrackRow key={track.id} track={track} index={i} context="Search" />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {results.artists.length > 0 && (
            <section>
              <h2 className="text-xl font-black text-white mb-4">Artists</h2>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {results.artists.map(artist => (
                  <Link key={artist.id} href={`/artist/${artist.id}`} className="min-w-[140px] text-center group">
                    <div className="w-32 h-32 relative rounded-full overflow-hidden mb-3 mx-auto border-2 border-transparent group-hover:border-[#FF0055] transition-all">
                      {artist.image_url && <Image src={artist.image_url} alt="" fill className="object-cover" />}
                    </div>
                    <p className="font-bold text-white truncate">{artist.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Albums */}
          {results.albums.length > 0 && (
            <section>
              <h2 className="text-xl font-black text-white mb-4">Albums</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results.albums.map(album => (
                  <Link key={album.id} href={`/album/${album.id}`} className="group p-4 bg-zinc-900/30 rounded-2xl hover:bg-zinc-900 transition-colors">
                    <div className="aspect-square relative rounded-xl overflow-hidden mb-3 shadow-lg">
                      {album.cover_url && <Image src={album.cover_url} alt="" fill className="object-cover" />}
                    </div>
                    <p className="font-bold text-white truncate">{album.title}</p>
                    <p className="text-xs text-zinc-500">{album.artists?.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}