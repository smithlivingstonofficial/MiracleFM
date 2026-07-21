import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Music4 } from "lucide-react";

import HomeHeroMosaic from "@/components/user/home/HomeHeroMosaic";
import FeaturedCollectionShelf from "@/components/user/home/FeaturedCollectionShelf";
import NewReleasesSection from "@/components/user/home/NewReleasesSection";
import PopularArtistsSection from "@/components/user/home/PopularArtistsSection";
import HomeTrackSection from "@/components/user/home/HomeTrackSection";
import RecommendationMixSection from "@/components/user/home/RecommendationMixSection";
import HomeSessionCache from "@/components/user/home/HomeSessionCache";
import HomeFooter from "@/components/user/home/HomeFooter";
import ResponsiveAd from "@/components/ads/ResponsiveAd";
import { getCachedRecommendationPlaylists, getRecommendationSections } from "@/lib/recommendations";
import { getHomeLayoutSections, type HomeLayoutSection } from "@/lib/home-layout";
import { cn } from "@/lib/utils";
import type { Album, Artist, Playlist, Track } from "@/types/music";

type TrackMap = Record<string, Track[]>;
type PlaylistTrackRow = {
  playlist_id: string;
  tracks: Track | Track[] | null;
};
type TrackWithRelations = Track & {
  artist_id?: string | null;
  album_id?: string | null;
};

const HOMEPAGE_TRACK_SELECT = "id, title, artist_id, album_id, hls_url, fallback_audio_url, audio_status, audio_version, cover_url, duration, duration_seconds, genre, play_count, artists(id, name, image_url), albums(id, title, cover_url)";

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

    const [playlistsRes, artistsRes, albumsRes, newTracksRes, engagementStatsRes, genresRes] = await Promise.all([
      supabaseAnon.from("playlists").select("*").is("user_id", null).limit(6),
      supabaseAnon.from("artists").select("*").limit(12),
      supabaseAnon.from("albums").select("*, artists(id, name, image_url)").order("created_at", { ascending: false }).limit(10),
      supabaseAnon
        .from("tracks")
        .select(HOMEPAGE_TRACK_SELECT)
        .eq("audio_status", "ready")
        .order("created_at", { ascending: false })
        .limit(12),
      supabaseAnon
        .from("track_engagement_stats")
        .select("track_id, engagement_score, recent_7d_listens, qualified_listens")
        .order("engagement_score", { ascending: false })
        .limit(24),
      supabaseAnon.from("genres").select("name, slug").eq("is_active", true).order("sort_order"),
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
        .select(HOMEPAGE_TRACK_SELECT)
        .eq("audio_status", "ready")
        .in("id", engagementIds);

      if (engagementTracks?.length) {
        const byId = new Map((engagementTracks as unknown as Track[]).map((track) => [track.id, track]));
        popularTracks = popularIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
        trendingTracks = trendingIds.map((id) => byId.get(id)).filter((track): track is Track => Boolean(track));
      }
    }

    if (popularTracks.length === 0) popularTracks = (newTracksRes.data as unknown as Track[]) || [];
    if (trendingTracks.length === 0) trendingTracks = popularTracks;

    const playlistIds = (playlistsRes.data || []).map((playlist) => playlist.id).filter(Boolean);
    const albumIds = (albumsRes.data || []).map((album) => album.id).filter(Boolean);
    const artistIds = (artistsRes.data || []).map((artist) => artist.id).filter(Boolean);

    const [playlistTracksRes, albumTracksRes, artistTracksRes] = await Promise.all([
      playlistIds.length > 0
        ? supabaseAnon
            .from("playlist_tracks")
            .select(`playlist_id, tracks(${HOMEPAGE_TRACK_SELECT})`)
            .in("playlist_id", playlistIds)
            .order("added_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      albumIds.length > 0
        ? supabaseAnon
            .from("tracks")
            .select(HOMEPAGE_TRACK_SELECT)
            .in("album_id", albumIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      artistIds.length > 0
        ? supabaseAnon
            .from("tracks")
            .select(HOMEPAGE_TRACK_SELECT)
            .in("artist_id", artistIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const playlistTracks = ((playlistTracksRes.data || []) as unknown as PlaylistTrackRow[]).reduce<TrackMap>((acc, row) => {
      const track = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
      if (!track || (track.audio_status && track.audio_status !== "ready")) return acc;
      acc[row.playlist_id] = [...(acc[row.playlist_id] || []), track];
      return acc;
    }, {});

    const albumTracks = ((albumTracksRes.data || []) as unknown as TrackWithRelations[]).reduce<TrackMap>((acc, track) => {
      const albumId = track.album_id || track.albums?.id;
      if (!albumId) return acc;
      if (track.audio_status && track.audio_status !== "ready") return acc;
      acc[albumId] = [...(acc[albumId] || []), track];
      return acc;
    }, {});

    const artistTracks = ((artistTracksRes.data || []) as unknown as TrackWithRelations[]).reduce<TrackMap>((acc, track) => {
      const artistId = track.artist_id || track.artists?.id;
      if (!artistId) return acc;
      if (track.audio_status && track.audio_status !== "ready") return acc;
      if (acc[artistId]?.some((existing) => existing.id === track.id)) return acc;
      acc[artistId] = [...(acc[artistId] || []), track];
      return acc;
    }, {});

    // Build genre shelf: pair active genres with sample cover images from tracks
    const activeGenres = (genresRes.data || []) as { name: string; slug: string }[];
    const allReadyTracks = [
      ...(newTracksRes.data || []),
      ...(Object.values(albumTracks).flat()),
    ] as (Track & { genre?: string[] | null })[];

    const genreShelfItems: { name: string; slug: string; trackCount: number; coverImages: string[] }[] = activeGenres.map((genre) => {
      const matchingTracks = allReadyTracks.filter((t) =>
        (t.genre || []).some((g: string) => g.toLowerCase() === genre.name.toLowerCase())
      );
      const coverImages = Array.from(
        new Set(
          matchingTracks
            .map((t) => t.cover_url || t.albums?.cover_url)
            .filter((url): url is string => Boolean(url))
        )
      ).slice(0, 4);
      return { name: genre.name, slug: genre.slug, trackCount: matchingTracks.length, coverImages };
    }).filter((g) => g.trackCount > 0);

    return {
      playlists: playlistsRes.data || [],
      artists: artistsRes.data || [],
      albums: albumsRes.data || [],
      newTracks: newTracksRes.data || [],
      popularTracks,
      trendingTracks,
      playlistTracks,
      albumTracks,
      artistTracks,
      genreShelfItems,
    };
  },
  ["home-page-public-data"], // Cache Key
  { revalidate: 3600, tags: ["home-data"] } // Revalidates every hour (3600 seconds)
);

const getCachedBanners = unstable_cache(
  async () => {
    const supabaseAnon = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: banners } = await supabaseAnon
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    return banners || [];
  },
  ["banners-list"],
  { revalidate: 3600, tags: ["home-data", "banners-list"] }
);

function getCachedPersonalHomeData(userId: string) {
  return unstable_cache(
    async () => {
      const supabaseAnon = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1. Daily Mix Logic (Personal recommendation disabled to reduce storage and database load)
      let dailyMix: Track[] = [];
      let recentTracks: Track[] = [];
      let relatedTracks: Track[] = [];
      let userPlaylists: Playlist[] = [];
      let userPlaylistTracks: TrackMap = {};

      // 2. Recent Tracks
      const { data: recentEvents } = await supabaseAnon
        .from("play_events")
        .select(`track_id, tracks(${HOMEPAGE_TRACK_SELECT})`)
        .eq("user_id", userId)
        .eq("event_type", "listen_qualified")
        .order("created_at", { ascending: false })
        .limit(12);

      const seenTrackIds = new Set<string>();
      recentTracks =
        (recentEvents as any[])
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

      // 3. Related Tracks
      const recentArtistIds = Array.from(
        new Set(
          recentTracks
            .map((track) => (track as TrackWithRelations).artist_id || track.artists?.id)
            .filter((value): value is string => Boolean(value))
        )
      ).slice(0, 3);

      if (recentArtistIds.length > 0) {
        const { data: relatedData } = await supabaseAnon
          .from("tracks")
          .select(HOMEPAGE_TRACK_SELECT)
          .eq("audio_status", "ready")
          .in("artist_id", recentArtistIds)
          .limit(16);

        const recentIds = new Set(recentTracks.map((track) => track.id));
        relatedTracks = ((relatedData as unknown as Track[] || [])).filter((track) => !recentIds.has(track.id)).slice(0, 8);
      }

      // 4. User Playlists
      const { data: personalPlaylists } = await supabaseAnon
        .from("playlists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      userPlaylists = (personalPlaylists || []) as Playlist[];

      // 5. User Playlist Tracks
      const userPlaylistIds = userPlaylists.map((playlist) => playlist.id).filter(Boolean);
      if (userPlaylistIds.length > 0) {
        const { data: userPlaylistTrackRows } = await supabaseAnon
          .from("playlist_tracks")
          .select(`playlist_id, tracks(${HOMEPAGE_TRACK_SELECT})`)
          .in("playlist_id", userPlaylistIds)
          .order("added_at", { ascending: true });

        userPlaylistTracks = ((userPlaylistTrackRows as unknown as PlaylistTrackRow[] || [])).reduce<TrackMap>((acc, row) => {
          const track = Array.isArray(row.tracks) ? row.tracks[0] : row.tracks;
          if (!track || track.audio_status !== "ready") return acc;
          acc[row.playlist_id] = [...(acc[row.playlist_id] || []), track];
          return acc;
        }, {});
      }

      return {
        dailyMix,
        recentTracks,
        relatedTracks,
        userPlaylists,
        userPlaylistTracks,
      };
    },
    ["personal-home-data", userId],
    {
      revalidate: 120, // 2 minutes
      tags: [`user-personal-${userId}`, "home-data"],
    }
  )();
}

export default async function HomePage() {
  // 1. Fetch User (Dynamic per request using SSR Client)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Get Cached Public Data (Instant load, 0 DB cost)
  const { playlists, artists, albums, newTracks, popularTracks, trendingTracks, playlistTracks, albumTracks, artistTracks, genreShelfItems } = await getCachedPublicData() as any;

  const banners = await getCachedBanners();
  const [recommendationSections, homeLayoutSections] = await Promise.all([
    getRecommendationSections(supabase, user),
    getHomeLayoutSections(supabase),
  ]);

  // 3. Daily Mix Logic (Cached per user, 0 DB cost on cache hit)
  let dailyMix: Track[] = [];
  let recentTracks: Track[] = [];
  let relatedTracks: Track[] = [];
  let userPlaylists: Playlist[] = [];
  let userPlaylistTracks: TrackMap = {};
  if (user) {
    const personal = await getCachedPersonalHomeData(user.id);
    dailyMix = personal.dailyMix;
    recentTracks = personal.recentTracks;
    relatedTracks = personal.relatedTracks;
    userPlaylists = personal.userPlaylists;
    userPlaylistTracks = personal.userPlaylistTracks;
  }

  const recommendationPlaylists = await getCachedRecommendationPlaylists(user?.id || null, 12);

  const userSignalTracks = user ? [...dailyMix, ...recentTracks, ...relatedTracks] : [];
  const fallbackSignalTracks = [...trendingTracks, ...popularTracks, ...newTracks];
  const signalTracks = userSignalTracks.length > 0 ? userSignalTracks : fallbackSignalTracks;
  const signalArtistIds = new Set(
    signalTracks
      .map((track) => (track as TrackWithRelations).artist_id || (track as any).artists?.id)
      .filter((value): value is string => Boolean(value))
  );
  const signalGenres = new Set(
    signalTracks.flatMap((track) => track.genre || []).map((genre) => genre.toLowerCase())
  );
  const trendingTrackIds = new Set(trendingTracks.map((track: any) => track.id));
  const popularTrackIds = new Set(popularTracks.map((track: any) => track.id));

  let activeAlbums = [...albums];
  if (activeAlbums.length === 0) {
    const extractedMap = new Map<string, Album>();
    fallbackSignalTracks.forEach((track) => {
      if ((track as any).albums && (track as any).albums.id && !extractedMap.has((track as any).albums.id)) {
        extractedMap.set((track as any).albums.id, (track as any).albums as Album);
      }
    });
    activeAlbums = Array.from(extractedMap.values());
  }

  let activeArtists = [...artists];
  if (activeArtists.length === 0) {
    const extractedMap = new Map<string, Artist>();
    fallbackSignalTracks.forEach((track) => {
      if ((track as any).artists && (track as any).artists.id && !extractedMap.has((track as any).artists.id)) {
        extractedMap.set((track as any).artists.id, (track as any).artists as Artist);
      }
    });
    activeArtists = Array.from(extractedMap.values());
  }

  const rankedAlbums = activeAlbums.sort((a, b) => {
    const scoreAlbum = (album: (typeof albums)[number]) => {
      const tracks = album.id ? albumTracks[album.id] || [] : [];
      const artistId = album.artists?.id;
      const interestScore = tracks.some((track: any) => signalArtistIds.has(track.artist_id || track.artists?.id || "")) || (artistId && signalArtistIds.has(artistId)) ? 80 : 0;
      const genreScore = tracks.some((track: any) => (track.genre || []).some((genre: any) => signalGenres.has(genre.toLowerCase()))) ? 45 : 0;
      const trendingScore = tracks.filter((track: any) => trendingTrackIds.has(track.id)).length * 20;
      const popularScore = tracks.filter((track: any) => popularTrackIds.has(track.id)).length * 12;
      const playableScore = Math.min(tracks.length, 8) * 3;
      const recencyScore = album.created_at ? Math.max(0, 20 - Math.floor((Date.now() - new Date(album.created_at).getTime()) / 86_400_000)) : 0;
      return interestScore + genreScore + trendingScore + popularScore + playableScore + recencyScore;
    };
    return scoreAlbum(b) - scoreAlbum(a);
  });

  const rankedArtists = activeArtists.sort((a, b) => {
    const scoreArtist = (artist: (typeof artists)[number]) => {
      const artistId = artist.id || "";
      const tracks = artistTracks[artistId] || [];
      const interestScore = signalArtistIds.has(artistId) ? 100 : 0;
      const genreScore = tracks.some((track: any) => (track.genre || []).some((genre: any) => signalGenres.has(genre.toLowerCase()))) ? 40 : 0;
      const trendingScore = tracks.filter((track: any) => trendingTrackIds.has(track.id)).length * 24;
      const popularScore = tracks.filter((track: any) => popularTrackIds.has(track.id)).length * 14;
      const playableScore = Math.min(tracks.length, 8) * 4;
      return interestScore + genreScore + trendingScore + popularScore + playableScore;
    };
    return scoreArtist(b) - scoreArtist(a);
  });

  const allPlaylistTracks = { ...playlistTracks, ...userPlaylistTracks };
  let enabledHomeSections = homeLayoutSections
    .map((section) => {
      const s = (section.slug || "").toLowerCase();
      const t = (section.section_type || "").toLowerCase();
      const title = (section.title || "").toLowerCase();
      if (s.includes("album") || t.includes("album") || title.includes("album") ||
          s.includes("artist") || t.includes("artist") || title.includes("artist")) {
        return { ...section, enabled: true };
      }
      return section;
    })
    .filter((section) => section.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!enabledHomeSections.some((s) => (s.slug || "").toLowerCase().includes("album") || (s.section_type || "").toLowerCase().includes("album"))) {
    enabledHomeSections.push({
      slug: "albums",
      title: "Albums",
      description: "Fresh and popular worship albums.",
      section_type: "albums",
      enabled: true,
      sort_order: 50,
      settings: { max_items: 12 },
    });
  }
  if (!enabledHomeSections.some((s) => (s.slug || "").toLowerCase().includes("artist") || (s.section_type || "").toLowerCase().includes("artist"))) {
    enabledHomeSections.push({
      slug: "artists",
      title: "Popular Artists",
      description: "Worship leaders listeners are returning to most.",
      section_type: "artists",
      enabled: true,
      sort_order: 60,
      settings: { max_items: 12 },
    });
  }
  enabledHomeSections.sort((a, b) => a.sort_order - b.sort_order);

  const renderHomeSection = (section: HomeLayoutSection) => {
    const slug = (section.slug || "").toLowerCase();
    const type = (section.section_type || "").toLowerCase();
    const title = (section.title || "").toLowerCase();
    const key = slug || type;
    switch (key) {
      case "quick-access":
      case "quick_access":
        return (
          <HomeHeroMosaic
            key={section.slug}
            banners={banners || []}
            dailyMix={dailyMix}
            recommendationPlaylists={recommendationPlaylists}
            playlists={playlists}
            albums={albums}
            artists={rankedArtists}
            trendingTracks={trendingTracks}
            popularTracks={popularTracks}
            playlistTracks={playlistTracks}
            albumTracks={albumTracks}
            artistTracks={artistTracks}
            isSignedIn={Boolean(user)}
            userPlaylists={userPlaylists}
            recentTracks={recentTracks}
            relatedTracks={relatedTracks}
            quickAccessMaxItems={sectionLimit(section, 8)}
            mobileLayout={section.settings.quick_access_mobile || "quick_grid"}
            showHeroBanner={section.settings.show_hero !== false}
          />
        );
      case "recommendation-mixes":
      case "recommendation_mixes":
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
      case "admin_playlists": {
        const activeBanners = banners || [];
        const firstBanner = activeBanners[0];
        const bannerImage = firstBanner?.image_url;
        const bannerTitle = firstBanner?.title || "Miracle FM";
        const bannerDesc = firstBanner?.description || "Worship music for every moment";
        const bannerHref = firstBanner?.target_link || "/search";
        return (
          <div key={section.slug} className="px-4 md:px-8">
            {/* Tablet/Desktop: Top Header + Side-by-Side Content */}
            <div className="hidden md:block">
              {/* Common Section Header spanning across top */}
              <div className="mb-4 flex items-end justify-between gap-4 md:mb-5">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black tracking-tight text-white md:text-2xl">{section.title}</h2>
                  {sectionDescription(section) ? (
                    <p className="mt-0.5 line-clamp-1 text-xs font-medium text-zinc-500">{sectionDescription(section)}</p>
                  ) : null}
                </div>
                <Link href="/library" className="flex shrink-0 items-center gap-1 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors active:text-white md:hover:text-white">
                  View All <ChevronRight size={14} />
                </Link>
              </div>

              {/* Side by side content with matched height */}
              <div className="flex items-start gap-5 lg:gap-6">
                {/* Left: Banner card — height matches playlist card (192px image + 45px text = 237px) */}
                <div className="w-[320px] lg:w-[360px] xl:w-[400px] flex-shrink-0">
                  <a
                    href={bannerHref}
                    className="group relative block h-[237px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f] shadow-xl transition-all duration-300 md:hover:-translate-y-1 md:hover:border-[#FF0055]/30 md:hover:shadow-[0_10px_30px_rgba(255,0,85,0.12)]"
                  >
                    {bannerImage ? (
                      <Image
                        src={bannerImage}
                        alt={bannerTitle}
                        fill
                        className="object-cover brightness-85 transition-transform duration-700 group-hover:scale-[1.03]"
                        sizes="(max-width: 1280px) 40vw, 480px"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a14] to-[#0f0f13]" />
                    )}
                    {/* Subtle dark vignette */}
                    <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />
                    {/* Small icon in corner — no text */}
                    <div className="absolute bottom-3 right-3 flex items-center justify-center rounded-full border border-white/20 bg-black/50 p-2.5 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-[#FF0055]/50 group-hover:bg-[#FF0055]/20">
                      <Music4 size={16} className="text-white" />
                    </div>
                  </a>
                </div>
                {/* Right: Playlists shelf without redundant header */}
                <div className="min-w-0 flex-1 -mx-4 md:-mx-8">
                  <FeaturedCollectionShelf
                    title={section.title}
                    description={sectionDescription(section)}
                    viewAllHref="/library"
                    maxItems={sectionLimit(section, 8)}
                    playlists={playlists}
                    albums={[]}
                    recommendationPlaylists={[]}
                    playlistTracks={playlistTracks}
                    albumTracks={{}}
                    hideHeader
                  />
                </div>
              </div>
            </div>

            {/* Mobile: standard layout with header */}
            <div className="md:hidden -mx-4">
              <FeaturedCollectionShelf
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
            </div>
          </div>
        );
      }

      case "user-playlists":
      case "user_playlists":
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
      case "album":
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
      case "artist":
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
