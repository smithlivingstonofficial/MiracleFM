import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

// Cache Homepage Public Data for 1 hour (3600 seconds) using anonymous client
export const getCachedHomeData = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const [playlistsRes, artistsRes, albumsRes] = await Promise.all([
      supabaseAnon.from("playlists").select("id, title, cover_url, description").is("user_id", null).limit(6),
      supabaseAnon.from("artists").select("id, name, image_url, bio").limit(12),
      supabaseAnon.from("albums").select("id, title, cover_url, created_at, artists(id, name)").order("created_at", { ascending: false }).limit(10),
    ]);

    return {
      playlists: playlistsRes.data || [],
      artists: artistsRes.data || [],
      albums: albumsRes.data || [],
    };
  },
  ['home-page-public-data'], // Cache Key
  { revalidate: 3600, tags: ['home-data'] }
);
