"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic2, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CardGridSkeleton } from "@/components/user/Skeletons";
import type { Artist } from "@/types/music";

type FollowedArtistRow = {
  artists: Artist | Artist[] | null;
};

export default function FollowedArtistsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/signin");
        return;
      }

      const { data } = await supabase
        .from("followed_artists")
        .select("artists(id, name, image_url, bio)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      setArtists(
        ((data || []) as FollowedArtistRow[])
          .map((row) => (Array.isArray(row.artists) ? row.artists[0] : row.artists))
          .filter((artist): artist is Artist => Boolean(artist))
      );
      setLoading(false);
    }

    loadArtists();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 pb-40 text-white md:px-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <UserCheck size={12} /> Following
          </div>
          <h1 className="text-4xl font-black tracking-tighter md:text-6xl">Followed Artists</h1>
        </div>

        {loading ? (
          <CardGridSkeleton cards={8} />
        ) : artists.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 lg:grid-cols-6">
            {artists.map((artist) => (
              <Link key={artist.id} href={`/artist/${artist.id}`} className="group flex flex-col items-center text-center active:scale-95">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-[#FF0055] bg-zinc-900 shadow-[0_0_25px_rgba(255,0,85,0.25)] md:h-40 md:w-40">
                  {artist.image_url ? (
                    <Image src={artist.image_url} alt={artist.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-700">
                      <Mic2 size={38} />
                    </div>
                  )}
                </div>
                <h2 className="mt-3 w-full truncate text-sm font-black text-white md:text-base">{artist.name}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Artist</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <Mic2 size={42} className="mx-auto mb-4 text-zinc-700" />
            <h2 className="text-xl font-black">No followed artists yet</h2>
            <p className="mt-2 text-sm text-zinc-500">Follow artists from artist pages to keep them close.</p>
          </div>
        )}
      </div>
    </div>
  );
}
