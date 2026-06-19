import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

import HomeHeroMosaic from "@/components/user/home/HomeHeroMosaic";
import FeaturedCollectionShelf from "@/components/user/home/FeaturedCollectionShelf";
import NewReleasesSection from "@/components/user/home/NewReleasesSection";
import PopularArtistsSection from "@/components/user/home/PopularArtistsSection";
import HomeTrackSection from "@/components/user/home/HomeTrackSection";
import RecommendationMixSection from "@/components/user/home/RecommendationMixSection";
import HomeSessionCache from "@/components/user/home/HomeSessionCache";
import HomeFooter from "@/components/user/home/HomeFooter";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { getRecommendationPlaylists, getRecommendationSections } from "@/lib/recommendations";
import { getHomeLayoutSections, type HomeLayoutSection } from "@/lib/home-layout";
import { cn } from "@/lib/utils";
import type { Playlist, Track } from "@/types/music";

type TrackMap = Record<string, Track[]>;
type PlaylistTrackRow = {
  playlist_id: string;
  tracks: Track | Track[] | null;
};
type TrackWithRelations = Track & {
  artist_id?: string | null;
  album_id?: string | null;
};

const sectionLimit = (section: HomeLayoutSection, fallback: number) =>
  Math.min(Math.max(Number(section.settings.max_items || fallback), 1), 24);

const sectionDescription = (section: HomeLayoutSection) =>
  section.settings.show_description === false ? undefined : section.description;

const sectionVisibilityClass = (section: HomeLayoutSection) => {
  if (section.settings.visibility === "mobile") return "md:hidden";
  if (section.settings.visibility === "desktop") return "hidden md:block";
  return "";
};

const sectionSpacingClass = (section: HomeLayoutSection) => {
  if (section.settings.spacing === "compact") return "mb-6 md:mb-8";
  if (section.settings.spacing === "relaxed") return "mb-14 md:mb-20";
  return "mb-10 md:mb-12";
};

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

    const [playlistsRes, artistsRes, albumsRes, newTracksRes, engagementStatsRes] = await Promise.all([
      supabaseAnon.from("playlists").select("*").is("user_id", null).limit(6),
      supabaseAnon.from("artists").select("*").limit(12),
      supabaseAnon.from("albums").select("*, artists(id, name, image_url)").order("created_at", { ascending: false }).limit(10),
      supabaseAnon
        .from("tracks")
        .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAnon
        .from("track_engagement_stats")
        .select("track_id, engagement_score, recent_7d_listens, qualified_listens")
        .order("engagement_score", { ascending: false })
        .limit(24),
    ]);

    let popularTracks: Track[] = [];
    let trendingTracks: Track[] = [];
    const engagementRows = engagementStatsRes.data || [];
    const popularIds = engagementRows.map((stat) => stat.track_id).filter(Boolean).slice(0, 12);
    const trendingIds = [...engagementRows]
      .sort((a, b) => Number(b.recent_7d_listens || 0) - Number(a.recent_7d_listens || 0) || Number(b.engagement_score || 0) - Number(a.engagement_score || 0))
      .map((stat) => stat.track_id)
      .filter(Boolean)
      .slice(0, 12);
    const engagementIds = Array.from(new Set([...popularIds, ...trendingIds]));

    if (engagementIds.length > 0) {
      const { data: engagementTracks } = await supabaseAnon
        .from("tracks")
        .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .in("id", engagementIds);

      if (engagementTracks?.length) {
        const byId = new Map(engagementTracks.map((track) => [track.id, track as Track]));
        popularTracks = popularIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
        trendingTracks = trendingIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
      }
    }

    if (popularTracks.length === 0) popularTracks = newTracksRes.data || [];
    if (trendingTracks.length === 0) trendingTracks = popularTracks;

    const playlistIds = (playlistsRes.data || []).map((playlist) => playlist.id).filter(Boolean);
    const albumIds = (albumsRes.data || []).map((album) => album.id).filter(Boolean);

    const [playlistTracksRes, albumTracksRes] = await Promise.all([
      playlistIds.length > 0
        ? supabaseAnon
            .from("playlist_tracks")
            .select("playlist_id, tracks(*, artists(id, name, image_url), albums(id, title, cover_url))")
            .in("playlist_id", playlistIds)
            .order("added_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      albumIds.length > 0
        ? supabaseAnon
            .from("tracks")
            .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
            .eq("audio_status", "ready")
            .in("album_id", albumIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const playlistTracks = ((playlistTracksRes.data || []) as PlaylistTrackRow[]).reduce<TrackMap>((acc, row) => {
      const track = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
      if (!track || track.audio_status !== "ready") return acc;
      acc[row.playlist_id] = [...(acc[row.playlist_id] || []), track];
      return acc;
    }, {});

    const albumTracks = ((albumTracksRes.data || []) as TrackWithRelations[]).reduce<TrackMap>((acc, track) => {
      const albumId = track.album_id;
      if (!albumId || track.audio_status !== "ready") return acc;
      acc[albumId] = [...(acc[albumId] || []), track];
      return acc;
    }, {});

    const artistTracks = [
      ...((trendingTracks || []) as TrackWithRelations[]),
      ...((popularTracks || []) as TrackWithRelations[]),
      ...((newTracksRes.data || []) as TrackWithRelations[]),
      ...(Object.values(albumTracks).flat() as TrackWithRelations[]),
    ].reduce<TrackMap>((acc, track) => {
      const artistId = track.artist_id || track.artists?.id;
      if (!artistId || track.audio_status !== "ready") return acc;
      if (acc[artistId]?.some((existing) => existing.id === track.id)) return acc;
      acc[artistId] = [...(acc[artistId] || []), track];
      return acc;
    }, {});

    return {
      playlists: playlistsRes.data ||[],
      artists: artistsRes.data || [],
      albums: albumsRes.data ||[],
      newTracks: newTracksRes.data || [],
      popularTracks,
      trendingTracks,
      playlistTracks,
      albumTracks,
      artistTracks,
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
  const { playlists, artists, albums, newTracks, popularTracks, trendingTracks, playlistTracks, albumTracks, artistTracks } = await getCachedPublicData();
  const { data: banners } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  const [recommendationSections, homeLayoutSections] = await Promise.all([
    getRecommendationSections(supabase, user),
    getHomeLayoutSections(supabase),
  ]);

  // 3. Daily Mix Logic (Dynamic per request, only if logged in)
  let dailyMix: Track[] = [];
  let recentTracks: Track[] = [];
  let relatedTracks: Track[] = [];
  let userPlaylists: Playlist[] = [];
  let userPlaylistTracks: TrackMap = {};
  if (user) {
    const { data: mixData } = await supabase.rpc('get_personalized_mix', { uid: user.id, limit_count: 20 });
    if (mixData && mixData.length > 0) {
      const { data: enrichedTracks } = await supabase
        .from("tracks")
        .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .in("id", mixData.map((track: { id: string }) => track.id));
      dailyMix = enrichedTracks ||[];
    }

    const { data: recentEvents } = await supabase
      .from("play_events")
      .select("track_id, tracks(*, artists(id, name, image_url), albums(id, title, cover_url))")
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
        .select("*, artists(id, name, image_url), albums(id, title, cover_url)")
        .eq("audio_status", "ready")
        .in("artist_id", recentArtistIds)
        .limit(16);

      const recentIds = new Set(recentTracks.map((track) => track.id));
      relatedTracks = ((relatedData || []) as Track[]).filter((track) => !recentIds.has(track.id)).slice(0, 8);
    }

    const { data: personalPlaylists } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);

    userPlaylists = (personalPlaylists || []) as Playlist[];

    const userPlaylistIds = userPlaylists.map((playlist) => playlist.id).filter(Boolean);
    if (userPlaylistIds.length > 0) {
      const { data: userPlaylistTrackRows } = await supabase
        .from("playlist_tracks")
        .select("playlist_id, tracks(*, artists(id, name, image_url), albums(id, title, cover_url))")
        .in("playlist_id", userPlaylistIds)
        .order("added_at", { ascending: true });

      userPlaylistTracks = ((userPlaylistTrackRows || []) as PlaylistTrackRow[]).reduce<TrackMap>((acc, row) => {
        const track = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
        if (!track || track.audio_status !== "ready") return acc;
        acc[row.playlist_id] = [...(acc[row.playlist_id] || []), track];
        return acc;
      }, {});
    }
  }

  const recommendationPlaylists = await getRecommendationPlaylists(supabase, recommendationSections, user, 12);

  const userSignalTracks = user ? [...dailyMix, ...recentTracks, ...relatedTracks] : [];
  const fallbackSignalTracks = [...trendingTracks, ...popularTracks, ...newTracks];
  const signalTracks = userSignalTracks.length > 0 ? userSignalTracks : fallbackSignalTracks;
  const signalArtistIds = new Set(
    signalTracks
      .map((track) => (track as TrackWithRelations).artist_id || track.artists?.id)
      .filter((value): value is string => Boolean(value))
  );
  const signalGenres = new Set(
    signalTracks.flatMap((track) => track.genre || []).map((genre) => genre.toLowerCase())
  );
  const trendingTrackIds = new Set(trendingTracks.map((track) => track.id));
  const popularTrackIds = new Set(popularTracks.map((track) => track.id));

  const rankedAlbums = [...albums].sort((a, b) => {
    const scoreAlbum = (album: (typeof albums)[number]) => {
      const tracks = album.id ? albumTracks[album.id] || [] : [];
      const artistId = album.artists?.id;
      const interestScore = tracks.some((track) => signalArtistIds.has((track as TrackWithRelations).artist_id || track.artists?.id || "")) || (artistId && signalArtistIds.has(artistId)) ? 80 : 0;
      const genreScore = tracks.some((track) => (track.genre || []).some((genre) => signalGenres.has(genre.toLowerCase()))) ? 45 : 0;
      const trendingScore = tracks.filter((track) => trendingTrackIds.has(track.id)).length * 20;
      const popularScore = tracks.filter((track) => popularTrackIds.has(track.id)).length * 12;
      const playableScore = Math.min(tracks.length, 8) * 3;
      const recencyScore = album.created_at ? Math.max(0, 20 - Math.floor((Date.now() - new Date(album.created_at).getTime()) / 86_400_000)) : 0;
      return interestScore + genreScore + trendingScore + popularScore + playableScore + recencyScore;
    };
    return scoreAlbum(b) - scoreAlbum(a);
  });

  const rankedArtists = [...artists].sort((a, b) => {
    const scoreArtist = (artist: (typeof artists)[number]) => {
      const artistId = artist.id || "";
      const tracks = artistTracks[artistId] || [];
      const interestScore = signalArtistIds.has(artistId) ? 100 : 0;
      const genreScore = tracks.some((track) => (track.genre || []).some((genre) => signalGenres.has(genre.toLowerCase()))) ? 40 : 0;
      const trendingScore = tracks.filter((track) => trendingTrackIds.has(track.id)).length * 24;
      const popularScore = tracks.filter((track) => popularTrackIds.has(track.id)).length * 14;
      const playableScore = Math.min(tracks.length, 8) * 4;
      return interestScore + genreScore + trendingScore + popularScore + playableScore;
    };
    return scoreArtist(b) - scoreArtist(a);
  });

  const allPlaylistTracks = { ...playlistTracks, ...userPlaylistTracks };
  const enabledHomeSections = homeLayoutSections
    .filter((section) => section.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  const renderHomeSection = (section: HomeLayoutSection) => {
    switch (section.slug) {
      case "quick-access":
        return (
          <HomeHeroMosaic
            key={section.slug}
            banners={banners || []}
            dailyMix={dailyMix}
            recommendationPlaylists={recommendationPlaylists}
            playlists={playlists}
            albums={albums}
            trendingTracks={trendingTracks}
            popularTracks={popularTracks}
            playlistTracks={playlistTracks}
            albumTracks={albumTracks}
            isSignedIn={Boolean(user)}
            quickAccessMaxItems={sectionLimit(section, 8)}
            mobileLayout={section.settings.quick_access_mobile || "quick_grid"}
            showHeroBanner={section.settings.show_hero !== false}
          />
        );
      case "recommendation-mixes":
        return (
          <RecommendationMixSection
            key={section.slug}
            playlists={recommendationPlaylists}
            title={section.title}
            description={sectionDescription(section)}
            maxItems={sectionLimit(section, 10)}
          />
        );
      case "admin-playlists":
        return (
          <FeaturedCollectionShelf
            key={section.slug}
            title={section.title}
            description={sectionDescription(section)}
            viewAllHref="/library"
            maxItems={sectionLimit(section, 8)}
            playlists={playlists}
            albums={[]}
            recommendationPlaylists={[]}
            playlistTracks={playlistTracks}
            albumTracks={{}}
          />
        );
      case "user-playlists":
        return user ? (
          <FeaturedCollectionShelf
            key={section.slug}
            title={section.title}
            description={sectionDescription(section)}
            viewAllHref="/library"
            maxItems={sectionLimit(section, 8)}
            playlists={userPlaylists}
            albums={[]}
            recommendationPlaylists={[]}
            playlistTracks={allPlaylistTracks}
            albumTracks={{}}
          />
        ) : null;
      case "albums":
        return (
          <NewReleasesSection
            key={section.slug}
            albums={rankedAlbums}
            albumTracks={albumTracks}
            personalized={Boolean(user && userSignalTracks.length > 0)}
            title={section.title}
            description={sectionDescription(section)}
            maxItems={sectionLimit(section, 12)}
          />
        );
      case "artists":
        return (
          <PopularArtistsSection
            key={section.slug}
            artists={rankedArtists}
            artistTracks={artistTracks}
            personalized={Boolean(user && userSignalTracks.length > 0)}
            title={section.title}
            description={sectionDescription(section)}
            maxItems={sectionLimit(section, 12)}
          />
        );
      case "trending-songs":
        return (
          <HomeTrackSection
            key={section.slug}
            title={section.title}
            description={sectionDescription(section)}
            tracks={trendingTracks.length > 0 ? trendingTracks.slice(0, sectionLimit(section, 8)) : popularTracks.slice(0, sectionLimit(section, 8))}
            context="Trending"
          />
        );
      case "new-songs":
        return (
          <HomeTrackSection
            key={section.slug}
            title={section.title}
            description={sectionDescription(section)}
            tracks={newTracks.slice(0, sectionLimit(section, 8))}
            context="New Songs"
          />
        );
      case "related-songs":
        return relatedTracks.length > 0 ? (
          <HomeTrackSection
            key={section.slug}
            title={section.title}
            description={sectionDescription(section)}
            tracks={relatedTracks.slice(0, sectionLimit(section, 8))}
            context="Related"
          />
        ) : null;
      case "feed-ad":
        return <ResponsiveAd key={section.slug} variant="feed" className="px-4 md:px-8" />;
      case "banner-ad":
        return <ResponsiveAd key={section.slug} variant="banner" className="px-4 md:px-8" />;
      default:
        return null;
    }
  };

  // Note: "Greeting" logic is handled internally by <HomeHeader /> for animation

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-zinc-100 pb-32 overflow-x-hidden selection:bg-[#FF0055] selection:text-white">
      <HomeSessionCache userId={user?.id} sections={recommendationSections} playlists={recommendationPlaylists} />
      
      {/* Background Atmosphere */}
      <div className="absolute top-0 inset-x-0 h-[500px] md:h-[600px] bg-gradient-to-b from-[#1a0b10] via-[#050505]/80 to-[#050505] -z-10" />

      {/* 2. Admin-configurable Sections Stack */}
      <div className="mt-4 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards md:mt-6">
        {enabledHomeSections.map((section, index) => {
          const node = renderHomeSection(section);
          if (!node) return null;

          return (
            <div
              key={section.slug}
              className={cn(
                sectionVisibilityClass(section),
                index === enabledHomeSections.length - 1 ? "" : sectionSpacingClass(section)
              )}
            >
              {node}
            </div>
          );
        })}
      </div>

      {/* 4. Footer */}
      <HomeFooter />
    </div>
  );
}
