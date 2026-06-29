import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Disc3, Heart, ListMusic, Mic2, Music4, Play, Radio, Sparkles, TrendingUp } from "lucide-react";
import HeroSection from "@/components/user/HeroSection";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import MixCard from "@/components/user/MixCard";
import PlaylistCover from "@/components/user/PlaylistCover";
import TrackRow from "@/components/user/TrackRow";
import type { Album, Artist, GeneratedPlaylist, Playlist, Track } from "@/types/music";

type TrackMap = Record<string, Track[]>;

type HomeHeroMosaicProps = {
  banners: {
    id?: string;
    title: string;
    description?: string | null;
    image_url?: string | null;
    target_link?: string | null;
  }[];
  dailyMix: Track[];
  recommendationPlaylists: GeneratedPlaylist[];
  playlists: Playlist[];
  albums: Album[];
  artists: Artist[];
  trendingTracks: Track[];
  popularTracks: Track[];
  playlistTracks: TrackMap;
  albumTracks: TrackMap;
  artistTracks: TrackMap;
  isSignedIn: boolean;
  // Personalization data
  userPlaylists?: Playlist[];
  recentTracks?: Track[];
  relatedTracks?: Track[];
  quickAccessMaxItems?: number;
  mobileLayout?: "quick_grid" | "feature_card";
  showHeroBanner?: boolean;
};

const albumArtist = (album: Album) => album.artists?.name || "Miracle FM";

const generatedArtwork = (playlist: GeneratedPlaylist) =>
  Array.from(
    new Set(
      playlist.tracks
        .map((track) => track.cover_url || track.albums?.cover_url || track.artists?.image_url)
        .filter((url): url is string => Boolean(url))
    )
  ).slice(0, 4);

function ArtworkGrid({ images, fallbackIcon }: { images: string[]; fallbackIcon: ReactNode }) {
  if (images.length === 0) {
    return <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">{fallbackIcon}</div>;
  }

  const displayImages = images.length === 1 ? [images[0], images[0], images[0], images[0]] : images.slice(0, 4);
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
      {displayImages.map((url, index) => (
        <div key={`${url}-${index}`} className="relative h-full w-full overflow-hidden">
          <Image src={url} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="220px" />
        </div>
      ))}
    </div>
  );
}

function GeneratedFeature({ playlist }: { playlist: GeneratedPlaylist }) {
  const images = generatedArtwork(playlist);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <Radio size={10} /> Made For You
          </div>
          <Link href={`/mix/${playlist.section.slug}`} className="block truncate text-xl font-black leading-snug tracking-tight text-white hover:text-[#FF0055]">
            {playlist.section.title}
          </Link>
          <p className="mt-0.5 line-clamp-1 text-[10px] font-bold text-zinc-400">{playlist.section.description}</p>
        </div>
        <CollectionPlayButton tracks={playlist.tracks} size="default" />
      </div>
      <Link href={`/mix/${playlist.section.slug}`} className="relative mt-1 block aspect-square border-t border-white/5">
        <ArtworkGrid images={images} fallbackIcon={<Music4 size={44} />} />
        <span className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
          {playlist.tracks.length} Songs
        </span>
      </Link>
    </article>
  );
}

function TrendingFeature({ tracks }: { tracks: Track[] }) {
  return (
    <article className="h-full rounded-2xl border border-white/5 bg-[#0A0A0A] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <TrendingUp size={10} /> Trending
          </div>
          <h2 className="truncate text-xl font-black leading-snug tracking-tight text-white">Trending Now</h2>
          <p className="mt-0.5 text-[10px] font-bold text-zinc-400">Songs listeners are playing today.</p>
        </div>
        <CollectionPlayButton tracks={tracks} size="default" />
      </div>
      <div className="space-y-0.5">
        {tracks.slice(0, 4).map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} context="Trending" allTracks={tracks} />
        ))}
      </div>
    </article>
  );
}

type QuickAccessItem =
  | { id: string; kind: "mix"; title: string; subtitle: string; href: string; tracks: Track[]; images: string[] }
  | { id: string; kind: "playlist"; title: string; subtitle: string; href: string; tracks: Track[]; playlistId: string; coverUrl?: string | null }
  | { id: string; kind: "album"; title: string; subtitle: string; href: string; tracks: Track[]; coverUrl?: string | null }
  | { id: string; kind: "artist"; title: string; subtitle: string; href: string; tracks: Track[]; image?: string | null }
  | { id: string; kind: "tracks"; title: string; subtitle: string; href: string; tracks: Track[]; image?: string | null }
  | { id: string; kind: "static"; title: string; subtitle: string; href: string; icon: "heart" | "album" | "artist" | "playlist" | "search" | "trending" | "music" | "sparkles" };

function QuickArtwork({ item }: { item: QuickAccessItem }) {
  if (item.kind === "playlist") {
    return <PlaylistCover playlistId={item.playlistId} explicitCover={item.coverUrl} className="h-full w-full" />;
  }
  if (item.kind === "mix") {
    return <ArtworkGrid images={item.images} fallbackIcon={<Radio size={24} />} />;
  }
  if (item.kind === "static") {
    const Icon =
      item.icon === "heart" ? Heart
      : item.icon === "album" ? Disc3
      : item.icon === "artist" ? Mic2
      : item.icon === "playlist" ? ListMusic
      : item.icon === "trending" ? TrendingUp
      : item.icon === "music" ? Music4
      : item.icon === "sparkles" ? Sparkles
      : TrendingUp;
    return (
      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(135deg,#251018,#101012)] text-white">
        <Icon size={23} className={item.icon === "heart" ? "fill-[#FF0055] text-[#FF0055]" : "text-[#FF4D89]"} />
      </div>
    );
  }
  const image = item.kind === "album" ? item.coverUrl : item.image;
  if (image) {
    return <Image src={image} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="96px" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
      {item.kind === "album" ? <Disc3 size={24} /> : item.kind === "artist" ? <Mic2 size={24} /> : <Music4 size={24} />}
    </div>
  );
}

function QuickAccessCard({ item }: { item: QuickAccessItem }) {
  return (
    <article className="group grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-1.5 py-1.5 transition-all duration-200 active:bg-white/[0.08] md:hover:border-[#FF0055]/25 md:hover:bg-white/[0.07]">
      <Link href={item.href} className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-zinc-900">
        <QuickArtwork item={item} />
      </Link>
      <Link href={item.href} className="min-w-0">
        <p className="line-clamp-2 text-[13px] font-bold leading-[1.3] text-white transition-colors md:group-hover:text-[#FF4D89]">{item.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-zinc-500">{item.subtitle}</p>
      </Link>
    </article>
  );
}

// Builds the personalized bottom-4 tiles based on user's actual listening history
function buildPersonalizedItems(
  isSignedIn: boolean,
  recentTracks: Track[],
  relatedTracks: Track[],
  userPlaylists: Playlist[],
  playlists: Playlist[],
  albums: Album[],
  artists: Artist[],
  playlistTracks: TrackMap,
  albumTracks: TrackMap,
  artistTracks: TrackMap,
  chartTracks: Track[]
): QuickAccessItem[] {
  if (!isSignedIn) {
    return [
      { id: "trending-now", kind: "tracks", title: "Trending Now", subtitle: "Songs playing right now", href: "/search", tracks: chartTracks, image: chartTracks[0]?.cover_url || chartTracks[0]?.albums?.cover_url },
      { id: "discover", kind: "static", title: "Discover", subtitle: "Find something new", href: "/search", icon: "search" as const },
      { id: "top-songs", kind: "static", title: "Top Songs", subtitle: "Popular now", href: "/search", icon: "trending" as const },
      { id: "new-songs", kind: "static", title: "New Songs", subtitle: "Fresh releases", href: "/search", icon: "music" as const },
    ];
  }

  const items: QuickAccessItem[] = [];

  // 1. Most recent user playlist
  const recentPlaylist = userPlaylists[0] || playlists[0];
  if (recentPlaylist) {
    items.push({
      id: `playlist-${recentPlaylist.id}`,
      kind: "playlist",
      title: recentPlaylist.title,
      subtitle: "Your playlist",
      href: `/playlist/${recentPlaylist.id}`,
      tracks: playlistTracks[recentPlaylist.id] || [],
      playlistId: recentPlaylist.id,
      coverUrl: recentPlaylist.cover_url,
    });
  }

  // 2. Most recently listened artist (from recentTracks)
  type TrackWithArtistId = Track & { artist_id?: string | null };
  const recentArtistId = (recentTracks[0] as TrackWithArtistId)?.artist_id || recentTracks[0]?.artists?.id;
  const recentArtist = artists.find((a) => a.id === recentArtistId) || artists[0];
  if (recentArtist?.id) {
    items.push({
      id: `artist-${recentArtist.id}`,
      kind: "artist",
      title: recentArtist.name,
      subtitle: "Recently played",
      href: `/artist/${recentArtist.id}`,
      tracks: artistTracks[recentArtist.id] || [],
      image: recentArtist.image_url,
    });
  }

  // 3. Most recently listened album (from recentTracks)
  const recentAlbumId = (recentTracks[0] as TrackWithArtistId & { album_id?: string | null })?.album_id || recentTracks[0]?.albums?.id;
  const recentAlbum = albums.find((a) => a.id === recentAlbumId) || albums[0];
  if (recentAlbum?.id) {
    items.push({
      id: `album-${recentAlbum.id}`,
      kind: "album",
      title: recentAlbum.title,
      subtitle: albumArtist(recentAlbum),
      href: `/album/${recentAlbum.id}`,
      tracks: albumTracks[recentAlbum.id] || [],
      coverUrl: recentAlbum.cover_url,
    });
  }

  // 4. Related/discovery track from a different artist
  const discoveryTrack = relatedTracks[0];
  if (discoveryTrack) {
    const discoveryArtistId = (discoveryTrack as TrackWithArtistId).artist_id || discoveryTrack.artists?.id;
    const discoveryArtist = discoveryArtistId ? artists.find((a) => a.id === discoveryArtistId) : undefined;
    items.push({
      id: `discovery-${discoveryTrack.id}`,
      kind: "artist",
      title: discoveryArtist?.name || discoveryTrack.artists?.name || "Discover",
      subtitle: "Artist you might like",
      href: discoveryArtistId ? `/artist/${discoveryArtistId}` : "/search",
      tracks: discoveryArtistId ? artistTracks[discoveryArtistId] || [discoveryTrack] : [discoveryTrack],
      image: discoveryArtist?.image_url || discoveryTrack.artists?.image_url || discoveryTrack.cover_url,
    });
  }

  // Pad with playlists/albums/artists if not enough personal items
  if (items.length < 4) {
    const secondPlaylist = (userPlaylists[1] || playlists[1]);
    if (secondPlaylist && !items.find((i) => i.id === `playlist-${secondPlaylist.id}`)) {
      items.push({
        id: `playlist-${secondPlaylist.id}`,
        kind: "playlist",
        title: secondPlaylist.title,
        subtitle: "Playlist",
        href: `/playlist/${secondPlaylist.id}`,
        tracks: playlistTracks[secondPlaylist.id] || [],
        playlistId: secondPlaylist.id,
        coverUrl: secondPlaylist.cover_url,
      });
    }
  }
  if (items.length < 4) {
    items.push({ id: "trending-now", kind: "tracks", title: "Trending Now", subtitle: "Songs playing right now", href: "/search", tracks: chartTracks, image: chartTracks[0]?.cover_url });
  }

  return items.slice(0, 4);
}

// Inline banner card — Spotify-style wide banner in the content feed
function InlineBanner({ banners, playlist, album, mix, tracks }: {
  banners: HomeHeroMosaicProps["banners"];
  playlist?: Playlist;
  album?: Album;
  mix?: GeneratedPlaylist;
  tracks: Track[];
}) {
  if (banners.length > 0) {
    return <HeroSection banners={banners} />;
  }

  // Fallback to a generated or editorial card
  const title = mix?.section.title || playlist?.title || album?.title || "Miracle FM";
  const subtitle = mix?.section.description || playlist?.description || (album ? albumArtist(album) : "Worship music for every moment");
  const href = mix ? `/mix/${mix.section.slug}` : playlist ? `/playlist/${playlist.id}` : album?.id ? `/album/${album.id}` : "/search";
  const image = playlist?.cover_url || album?.cover_url || tracks[0]?.cover_url || tracks[0]?.albums?.cover_url || "/miraclefm.jpg";
  const playTracks = mix?.tracks || (playlist ? [] : tracks.slice(0, 8));

  return (
    <Link
      href={href}
      className="group relative block h-[200px] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] shadow-2xl shadow-black/40 md:h-[220px]"
    >
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover brightness-60 transition-transform duration-700 group-hover:scale-[1.03]"
        priority
        sizes="(max-width: 768px) 100vw, 1200px"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-between gap-6 px-6 py-5 md:px-8">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-[#FF0055]">
            {mix ? "Made For You" : playlist ? "Featured Playlist" : album ? "New Album" : "Featured"}
          </p>
          <h2 className="line-clamp-1 text-2xl font-black leading-tight tracking-tight text-white md:text-3xl">{title}</h2>
          <p className="mt-1.5 line-clamp-1 text-sm font-medium text-zinc-300/80">{subtitle}</p>
        </div>
        <div className="flex-shrink-0">
          {playTracks.length > 0 ? (
            <div
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-3"
            >
              <CollectionPlayButton tracks={playTracks} size="default" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 group-hover:bg-[#FF0055] group-hover:border-[#FF0055]">
              <Play size={20} fill="currentColor" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomeHeroMosaic({
  banners,
  dailyMix,
  recommendationPlaylists,
  playlists,
  albums,
  artists,
  trendingTracks,
  popularTracks,
  playlistTracks,
  albumTracks,
  artistTracks,
  isSignedIn,
  userPlaylists = [],
  recentTracks = [],
  relatedTracks = [],
  showHeroBanner = true,
}: HomeHeroMosaicProps) {
  const firstGenerated = recommendationPlaylists.find((playlist) => playlist.tracks.length > 0);
  const firstPlaylist = playlists[0];
  const firstAlbum = albums.find((album) => album.id);
  const chartTracks = trendingTracks.length > 0 ? trendingTracks : popularTracks;
  const hasDailyMix = isSignedIn && dailyMix.length > 0;

  // Fixed top 4 items (always the same)
  const topItems: QuickAccessItem[] = [
    {
      id: "liked-songs",
      kind: "static",
      title: isSignedIn ? "Liked Songs" : "Your Library",
      subtitle: isSignedIn ? "Saved songs" : "Sign in to save",
      href: isSignedIn ? "/library/liked" : "/library",
      icon: "heart",
    },
    { id: "all-albums", kind: "static", title: "Albums", subtitle: "Full library", href: "/album", icon: "album" },
    { id: "all-artists", kind: "static", title: "Artists", subtitle: "Voices you follow", href: "/artist", icon: "artist" },
    { id: "all-playlists", kind: "static", title: "Playlists", subtitle: "Curated sets", href: "/library", icon: "playlist" },
  ];

  // Bottom 4: personalized or guest fallback
  const bottomItems = buildPersonalizedItems(
    isSignedIn,
    recentTracks,
    relatedTracks,
    userPlaylists,
    playlists,
    albums,
    artists,
    playlistTracks,
    albumTracks,
    artistTracks,
    chartTracks
  );

  const quickItems = [...topItems, ...bottomItems];

  const sideFeature = hasDailyMix ? (
    <MixCard tracks={dailyMix} title="Daily Mix" description="Fresh tunes for your spirit." badgeText="Daily" href="/mix/daily-mix" />
  ) : firstGenerated ? (
    <GeneratedFeature playlist={firstGenerated} />
  ) : (
    <TrendingFeature tracks={chartTracks} />
  );

  return (
    <section className="px-4 md:px-8 space-y-3 md:space-y-4">
      {/* Mobile-only banner — shown only on phones, hidden on tablet/desktop */}
      {showHeroBanner && (
        <div className="md:hidden">
          <a
            href={banners[0]?.target_link || (firstPlaylist ? `/playlist/${firstPlaylist.id}` : firstAlbum?.id ? `/album/${firstAlbum.id}` : "/search")}
            className="group relative block aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/5 bg-[#050505] shadow-xl active:scale-[0.98] transition-transform"
          >
            <Image
              src={banners[0]?.image_url || firstPlaylist?.cover_url || firstAlbum?.cover_url || chartTracks[0]?.cover_url || "/miraclefm.jpg"}
              alt="Featured"
              fill
              className="object-cover brightness-90 transition-transform duration-700 group-hover:scale-[1.03]"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />
            <div className="absolute bottom-3 right-3 flex items-center justify-center rounded-full border border-white/20 bg-black/50 p-2 text-white backdrop-blur-sm">
              <Music4 size={14} className="text-white" />
            </div>
          </a>
        </div>
      )}

      {/* Quick Access Grid — 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {quickItems.map((item) => (
          <QuickAccessCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
