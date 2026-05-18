"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Disc } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { CardGridSkeleton } from "@/components/user/Skeletons";
import { readLocalCache, writeLocalCache } from "@/lib/local-cache";
import type { Album } from "@/types/music";

type SavedAlbumRow = {
  albums: Album | Album[] | null;
};

export default function SavedAlbumsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAlbums() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const cacheKey = `saved-albums:${user.id}`;
      const cached = readLocalCache<Album[]>(cacheKey);
      if (cached) {
        setAlbums(cached);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("saved_albums")
        .select("albums(id, title, cover_url, created_at, artists(id, name, image_url))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const nextAlbums = ((data || []) as SavedAlbumRow[])
        .map((row) => (Array.isArray(row.albums) ? row.albums[0] : row.albums))
        .filter((album): album is Album => Boolean(album));
      writeLocalCache(cacheKey, nextAlbums);
      setAlbums(nextAlbums);
      setLoading(false);
    }

    loadAlbums();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 pb-40 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <Bookmark size={12} /> Saved Collection
          </div>
          <h1 className="text-4xl font-black tracking-tighter md:text-6xl">Saved Albums</h1>
        </div>

        {loading ? (
          <CardGridSkeleton cards={8} />
        ) : albums.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {albums.map((album, index) => (
              <Fragment key={album.id}>
                {albums.length >= 10 && index === 8 && <ResponsiveAd variant="grid" />}

              <Link href={`/album/${album.id}`} className="group active:scale-95">
                <div className="relative aspect-square overflow-hidden rounded-[1.5rem] border border-white/5 bg-zinc-900">
                  {album.cover_url ? (
                    <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-700">
                      <Disc size={38} />
                    </div>
                  )}
                </div>
                <h2 className="mt-3 truncate text-sm font-black text-white">{album.title}</h2>
                <p className="truncate text-xs font-bold text-zinc-500">{album.artists?.name}</p>
              </Link>
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Disc size={42} className="mx-auto mb-4 text-zinc-700" />
            <h2 className="text-xl font-black">No saved albums yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Save albums from album pages and they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
