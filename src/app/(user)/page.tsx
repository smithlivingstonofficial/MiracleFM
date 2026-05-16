import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import HeroSection from "@/components/user/HeroSection";
import DailyMixSection from "@/components/user/home/DailyMixSection";
import EditorialSection from "@/components/user/home/EditorialSection";
import NewReleasesSection from "@/components/user/home/NewReleasesSection";
import PopularArtistsSection from "@/components/user/home/PopularArtistsSection";
import ContinueListeningSection from "@/components/user/home/ContinueListeningSection";
import GuestRecentlyPlayedSection from "@/components/user/home/GuestRecentlyPlayedSection";
import HomeTrackSection from "@/components/user/home/HomeTrackSection";
import RecommendationMixSection from "@/components/user/home/RecommendationMixSection";
import HomeFooter from "@/components/user/home/HomeFooter";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { getRecommendationPlaylists, getRecommendationSections } from "@/lib/recommendations";
import type { Track } from "@/types/music";

// We force the page to be dynamic so user auth works, 
// but we cache the heavy database queries below.
export const dynamic = "force-dynamic";

// --- TIER 3 SERVER CACHE ---
// This function runs ONLY ONCE PER HOUR across your entire application.
// It uses the generic Supabase client to avoid Next.js Cookie errors.
const getCachedPublicData = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [bannersRes, playlistsRes, artistsRes, albumsRes, newTracksRes, popularTracksRes] = await Promise.all([
      supabaseAnon.from("banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabaseAnon.from("playlists").select("*").is("user_id", null).limit(6),
      supabaseAnon.from("artists").select("*").limit(12),
      supabaseAnon.from("albums").select("*, artists(name)").order("created_at", { ascending: false }).limit(10),
      supabaseAnon
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .eq("audio_status", "ready")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAnon
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .eq("audio_status", "ready")
        .order("play_count", { ascending: false })
        .limit(12),
    ]);

    let trendingTracks = popularTracksRes.data || [];
    const { data: trendingStats } = await supabaseAnon
      .from("track_listen_stats")
      .select("track_id, qualified_listens")
      .order("qualified_listens", { ascending: false })
      .limit(12);

    const trendingIds = trendingStats?.map((stat) => stat.track_id).filter(Boolean) || [];
    if (trendingIds.length > 0) {
      const { data: statTracks } = await supabaseAnon
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .eq("audio_status", "ready")
        .in("id", trendingIds);

      if (statTracks?.length) {
        const byId = new Map(statTracks.map((track) => [track.id, track]));
        trendingTracks = trendingIds.map((id) => byId.get(id)).filter(Boolean);
      }
    }

    return {
      banners: bannersRes.data || [],
      playlists: playlistsRes.data ||[],
      artists: artistsRes.data || [],
      albums: albumsRes.data ||[],
      newTracks: newTracksRes.data || [],
      popularTracks: popularTracksRes.data || [],
      trendingTracks,
    };
  },
  ['home-page-public-data'], // Cache Key
  { revalidate: 3600, tags: ['home-data'] } // Revalidates every hour (3600 seconds)
);

export default async function HomePage() {
  // 1. Fetch User (Dynamic per request using SSR Client)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Get Cached Public Data (Instant load, 0 DB cost)
  const { banners, playlists, artists, albums, newTracks, popularTracks, trendingTracks } = await getCachedPublicData();
  const recommendationSections = await getRecommendationSections(supabase, user);

  // 3. Daily Mix Logic (Dynamic per request, only if logged in)
  let dailyMix: Track[] = [];
  let recentTracks: Track[] = [];
  let recommendedTracks: Track[] = [];
  let relatedTracks: Track[] = [];
  if (user) {
    const { data: mixData } = await supabase.rpc('get_personalized_mix', { uid: user.id, limit_count: 20 });
    if (mixData && mixData.length > 0) {
      const { data: enrichedTracks } = await supabase
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .eq("audio_status", "ready")
        .in("id", mixData.map((track: { id: string }) => track.id));
      dailyMix = enrichedTracks ||[];
    }

    const { data: recentEvents } = await supabase
      .from("play_events")
      .select("track_id, tracks(*, artists(name, image_url), albums(title, cover_url))")
      .eq("user_id", user.id)
      .eq("event_type", "listen_qualified")
      .order("created_at", { ascending: false })
      .limit(12);

    const seenTrackIds = new Set<string>();
    recentTracks =
      recentEvents
        ?.map((event) => {
          const raw = event.tracks;
          const track = Array.isArray(raw) ? raw[0] : raw;
          return (track as Track) ?? null;
        })
        .filter((track): track is Track => {
          if (!track || track.audio_status !== "ready" || seenTrackIds.has(track.id)) return false;
          seenTrackIds.add(track.id);
          return true;
        })
        .slice(0, 6) || [];

    const recentArtistIds = Array.from(
      new Set(
        recentTracks
          .map((track) => (track as Track & { artist_id?: string | null }).artist_id || track.artists?.id)
          .filter((value): value is string => Boolean(value))
      )
    ).slice(0, 3);

    if (recentArtistIds.length > 0) {
      const { data: relatedData } = await supabase
        .from("tracks")
        .select("*, artists(name, image_url), albums(title, cover_url)")
        .eq("audio_status", "ready")
        .in("artist_id", recentArtistIds)
        .limit(16);

      const recentIds = new Set(recentTracks.map((track) => track.id));
      relatedTracks = ((relatedData || []) as Track[]).filter((track) => !recentIds.has(track.id)).slice(0, 8);
    }
  }

  recommendedTracks = dailyMix.length > 0 ? dailyMix : relatedTracks.length > 0 ? relatedTracks : trendingTracks.length > 0 ? trendingTracks : popularTracks;
  const recommendationPlaylists = await getRecommendationPlaylists(supabase, recommendationSections, user, 12);

  // Note: "Greeting" logic is handled internally by <HomeHeader /> for animation

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[500px] md:h-[600px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />
      <div className="absolute top-[-100px] right-[-50px] md:top-[-200px] md:right-[-100px] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#FF0055]/10 md:bg-[#FF0055]/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none -z-10" />

      {/* 2. Hero & Mix Grid */}
      <div className="px-4 md:px-8 mt-4 md:mt-6 mb-10 md:mb-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Hero Slider */}
          <div className="lg:col-span-2 w-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
             <HeroSection banners={banners} />
          </div>

          {/* Daily Mix Card */}
          <DailyMixSection user={user} dailyMix={dailyMix} />
        </div>
      </div>

      {/* 3. Sections Stack */}
      <div className="space-y-12 md:space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-forwards">
        
        <EditorialSection playlists={playlists} />

        <RecommendationMixSection playlists={recommendationPlaylists} />

        <ContinueListeningSection tracks={recentTracks} />

        <GuestRecentlyPlayedSection enabled={!user} />

        <HomeTrackSection
          title={user ? "Recommended For You" : "Recommended Worship"}
          description={user ? "Based on your worship collection and recent listening." : "A strong place to start, even before signing in."}
          tracks={recommendedTracks}
          context="Recommended"
        />

        <HomeTrackSection
          title="Trending Songs"
          description="Songs with real qualified listens from Miracle FM playback."
          tracks={trendingTracks.length > 0 ? trendingTracks : popularTracks}
          context="Trending"
        />

        <HomeTrackSection
          title="New Tamil Christian Songs"
          description="Fresh playable songs added to Miracle FM."
          tracks={newTracks}
          context="New Songs"
        />

        {relatedTracks.length > 0 && (
          <HomeTrackSection
            title="Related Songs"
            description="More songs connected to artists you recently listened to."
            tracks={relatedTracks}
            context="Related"
          />
        )}
        
        <NewReleasesSection albums={albums} />

        <ResponsiveAd variant="feed" />
          
        <PopularArtistsSection artists={artists} />

      </div>

      {/* 4. Footer */}
      <HomeFooter />
    </div>
  );
}
