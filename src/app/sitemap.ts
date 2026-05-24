import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type SitemapRow = {
  id: string;
  created_at?: string | null;
};

const toLastModified = (row: SitemapRow) => row.created_at || new Date().toISOString();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [tracksRes, albumsRes, artistsRes] = await Promise.all([
    supabase
      .from("tracks")
      .select("id, created_at")
      .eq("audio_status", "ready")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("albums").select("id, created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("artists").select("id, created_at").order("created_at", { ascending: false }).limit(5000),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/search"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const songs = ((tracksRes.data || []) as SitemapRow[]).map((track) => ({
    url: absoluteUrl(`/song/${track.id}`),
    lastModified: toLastModified(track),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const albums = ((albumsRes.data || []) as SitemapRow[]).map((album) => ({
    url: absoluteUrl(`/album/${album.id}`),
    lastModified: toLastModified(album),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const artists = ((artistsRes.data || []) as SitemapRow[]).map((artist) => ({
    url: absoluteUrl(`/artist/${artist.id}`),
    lastModified: toLastModified(artist),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...songs, ...albums, ...artists];
}
