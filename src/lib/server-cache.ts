import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

// 1. Cache the Homepage Public Data for 1 hour (3600 seconds)
export const getCachedHomeData = unstable_cache(
  async () => {
    const supabase = await createClient();
    
    const[playlistsRes, artistsRes, albumsRes] = await Promise.all([
      supabase.from("playlists").select("*").is("user_id", null).limit(6),
      supabase.from("artists").select("*").limit(12),
      supabase.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
    ]);

    return {
      playlists: playlistsRes.data || [],
      artists: artistsRes.data ||[],
      albums: albumsRes.data || [],
    };
  },
  ['home-page-public-data'], // Cache Key
  { revalidate: 3600, tags: ['home-data'] } // Revalidates every hour automatically
);
