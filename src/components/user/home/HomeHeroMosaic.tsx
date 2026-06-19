import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Disc3, ListMusic, Music4, Play, Radio, TrendingUp } from "lucide-react";
import HeroSection from "@/components/user/HeroSection";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import MixCard from "@/components/user/MixCard";
import PlaylistCover from "@/components/user/PlaylistCover";
import TrackRow from "@/components/user/TrackRow";
import type { Album, GeneratedPlaylist, Playlist, Track } from "@/types/music";

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
  trendingTracks: Track[];
  popularTracks: Track[];
  playlistTracks: TrackMap;
  albumTracks: TrackMap;
  isSignedIn: boolean;
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

function PlaylistFeature({ playlist, tracks }: { playlist: Playlist; tracks: Track[] }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <ListMusic size={10} /> Playlist
          </div>
          <Link href={`/playlist/${playlist.id}`} className="block truncate text-2xl font-black leading-snug tracking-tight text-white hover:text-[#FF0055] md:text-3xl">
            {playlist.title}
          </Link>
          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-zinc-400">
            {playlist.description || "Handpicked worship collections."}
          </p>
        </div>
        <CollectionPlayButton tracks={tracks} size="default" />
      </div>
      <Link href={`/playlist/${playlist.id}`} className="relative mt-2 block aspect-square border-t border-white/5">
        <PlaylistCover playlistId={playlist.id} explicitCover={playlist.cover_url} className="h-full w-full" />
        <span className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
          {tracks.length || "Open"} Songs
        </span>
      </Link>
    </article>
  );
}

function AlbumFeature({ album, tracks }: { album: Album; tracks: Track[] }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <Disc3 size={10} /> Album
          </div>
          <Link href={`/album/${album.id}`} className="block truncate text-2xl font-black leading-snug tracking-tight text-white hover:text-[#FF0055] md:text-3xl">
            {album.title}
          </Link>
          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-zinc-400">{albumArtist(album)}</p>
        </div>
        <CollectionPlayButton tracks={tracks} size="default" />
      </div>
      <Link href={`/album/${album.id}`} className="relative mt-2 block aspect-square border-t border-white/5 bg-zinc-900">
        {album.cover_url ? (
          <Image src={album.cover_url} alt={album.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="360px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-700">
            <Disc3 size={44} />
          </div>
        )}
        <span className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
          {tracks.length || "Open"} Songs
        </span>
      </Link>
    </article>
  );
}

function GeneratedFeature({ playlist }: { playlist: GeneratedPlaylist }) {
  const images = generatedArtwork(playlist);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-[#0A0A0A] shadow-2xl">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <Radio size={10} /> Made For You
          </div>
          <Link href={`/mix/${playlist.section.slug}`} className="block truncate text-2xl font-black leading-snug tracking-tight text-white hover:text-[#FF0055] md:text-3xl">
            {playlist.section.title}
          </Link>
          <p className="mt-1 line-clamp-1 text-[10px] font-bold text-zinc-400">{playlist.section.description}</p>
        </div>
        <CollectionPlayButton tracks={playlist.tracks} size="default" />
      </div>
      <Link href={`/mix/${playlist.section.slug}`} className="relative mt-2 block aspect-square border-t border-white/5">
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
    <article className="h-full rounded-[2rem] border border-white/5 bg-[#0A0A0A] p-4 shadow-2xl md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#FF0055]/20 bg-[#FF0055]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0055]">
            <TrendingUp size={10} /> Trending
          </div>
          <h2 className="truncate text-2xl font-black leading-snug tracking-tight text-white md:text-3xl">Trending Now</h2>
          <p className="mt-1 text-[10px] font-bold text-zinc-400">Songs listeners are playing today.</p>
        </div>
        <CollectionPlayButton tracks={tracks} size="default" />
      </div>
      <div className="space-y-1">
        {tracks.slice(0, 4).map((track, index) => (
          <TrackRow key={track.id} track={track} index={index} context="Trending" allTracks={tracks} />
        ))}
      </div>
    </article>
  );
}

type QuickAccessItem =
  | {
      id: string;
      kind: "mix";
      title: string;
      subtitle: string;
      href: string;
      tracks: Track[];
      images: string[];
    }
  | {
      id: string;
      kind: "playlist";
      title: string;
      subtitle: string;
      href: string;
      tracks: Track[];
      playlistId: string;
      coverUrl?: string | null;
    }
  | {
      id: string;
      kind: "album";
      title: string;
      subtitle: string;
      href: string;
      tracks: Track[];
      coverUrl?: string | null;
    }
  | {
      id: string;
      kind: "tracks";
      title: string;
      subtitle: string;
      href: string;
      tracks: Track[];
      image?: string | null;
    };

function QuickArtwork({ item }: { item: QuickAccessItem }) {
  if (item.kind === "playlist") {
    return <PlaylistCover playlistId={item.playlistId} explicitCover={item.coverUrl} className="h-full w-full" />;
  }

  if (item.kind === "mix") {
    return <ArtworkGrid images={item.images} fallbackIcon={<Radio size={24} />} />;
  }

  const image = item.kind === "album" ? item.coverUrl : item.image;
  if (image) {
    return <Image src={image} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="96px" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
      {item.kind === "album" ? <Disc3 size={24} /> : <Music4 size={24} />}
    </div>
  );
}

function QuickAccessCard({ item, compact = false }: { item: QuickAccessItem; compact?: boolean }) {
  return (
    <article className="group grid min-w-0 grid-cols-[56px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] p-1.5 transition-colors active:bg-white/[0.08] md:hover:border-[#FF0055]/30 md:hover:bg-white/[0.075]">
      <Link href={item.href} className="relative h-14 w-14 overflow-hidden rounded-md bg-zinc-900">
        <QuickArtwork item={item} />
      </Link>
      <Link href={item.href} className="min-w-0">
        <p className="line-clamp-2 text-sm font-black leading-4 text-white transition-colors md:group-hover:text-[#FF4D89]">{item.title}</p>
        {!compact ? <p className="mt-1 line-clamp-1 text-[10px] font-bold text-zinc-500">{item.subtitle}</p> : null}
      </Link>
    </article>
  );
}

function MobileDiscoveryGrid({ items, maxItems }: { items: QuickAccessItem[]; maxItems: number }) {
  if (items.length === 0) return null;

  return (
    <div className="md:hidden">
      <div className="grid grid-cols-2 gap-2">
        {items.slice(0, maxItems).map((item) => (
          <QuickAccessCard key={item.id} item={item} compact />
        ))}
      </div>
    </div>
  );
}

function DesktopDiscoveryGrid({ items, maxItems }: { items: QuickAccessItem[]; maxItems: number }) {
  return (
    <div className="hidden xl:block">
      <div className="grid grid-cols-3 gap-2 2xl:grid-cols-4">
        {items.slice(0, maxItems).map((item) => (
          <QuickAccessCard key={item.id} item={item} compact />
        ))}
      </div>
    </div>
  );
}

function HeroFallback({ playlist, album, mix, tracks }: { playlist?: Playlist; album?: Album; mix?: GeneratedPlaylist; tracks: Track[] }) {
  if (mix) {
    return (
      <div className="h-full min-h-[360px]">
        <MixCard tracks={mix.tracks} title={mix.section.title} description={mix.section.description} badgeText="Made For You" href={`/mix/${mix.section.slug}`} />
      </div>
    );
  }

  const title = playlist?.title || album?.title || "Miracle FM Live";
  const description = playlist?.description || (album ? albumArtist(album) : "Start with the songs listeners love most.");
  const href = playlist ? `/playlist/${playlist.id}` : album?.id ? `/album/${album.id}` : "/search";
  const image = playlist?.cover_url || album?.cover_url || tracks[0]?.cover_url || tracks[0]?.albums?.cover_url || "/miraclefm.jpg";

  return (
    <Link href={href} className="group relative block aspect-video min-h-[320px] overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#050505] shadow-2xl shadow-black/50 md:rounded-[2.5rem]">
      <Image src={image} alt={title} fill className="object-cover brightness-75 transition-transform duration-700 group-hover:scale-105" priority />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-10">
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#FF0055]">Featured</p>
          <h1 className="line-clamp-2 text-3xl font-black leading-[1.12] tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-2 line-clamp-2 max-w-xl text-sm font-bold text-zinc-300">{description}</p>
        </div>
        <div className="hidden rounded-full bg-[#FF0055] p-5 text-white shadow-[0_0_30px_rgba(255,0,85,0.4)] md:block">
          <Play fill="currentColor" size={28} />
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
  trendingTracks,
  popularTracks,
  playlistTracks,
  albumTracks,
  isSignedIn,
  quickAccessMaxItems = 8,
  mobileLayout = "quick_grid",
  showHeroBanner = true,
}: HomeHeroMosaicProps) {
  const firstGenerated = recommendationPlaylists.find((playlist) => playlist.tracks.length > 0);
  const firstPlaylist = playlists[0];
  const firstAlbum = albums.find((album) => album.id);
  const chartTracks = trendingTracks.length > 0 ? trendingTracks : popularTracks;
  const hasDailyMix = isSignedIn && dailyMix.length > 0;
  const quickItems: QuickAccessItem[] = [
    ...(hasDailyMix
      ? [
          {
            id: "daily-mix",
            kind: "mix" as const,
            title: "Daily Mix",
            subtitle: "Fresh worship shaped from your listening.",
            href: "/mix/daily-mix",
            tracks: dailyMix,
            images: generatedArtwork({ tracks: dailyMix } as GeneratedPlaylist),
          },
        ]
      : []),
    ...recommendationPlaylists
      .filter((playlist) => playlist.tracks.length > 0)
      .slice(0, 3)
      .map((playlist) => ({
        id: `mix-${playlist.section.slug}`,
        kind: "mix" as const,
        title: playlist.section.title,
        subtitle: playlist.section.description,
        href: `/mix/${playlist.section.slug}`,
        tracks: playlist.tracks,
        images: generatedArtwork(playlist),
      })),
    ...playlists.slice(0, 2).map((playlist) => ({
      id: `playlist-${playlist.id}`,
      kind: "playlist" as const,
      title: playlist.title,
      subtitle: playlist.description || "Editorial playlist",
      href: `/playlist/${playlist.id}`,
      tracks: playlistTracks[playlist.id] || [],
      playlistId: playlist.id,
      coverUrl: playlist.cover_url,
    })),
    ...albums
      .filter((album): album is Album & { id: string } => Boolean(album.id))
      .slice(0, 2)
      .map((album) => ({
        id: `album-${album.id}`,
        kind: "album" as const,
        title: album.title,
        subtitle: albumArtist(album),
        href: `/album/${album.id}`,
        tracks: albumTracks[album.id] || [],
        coverUrl: album.cover_url,
      })),
    {
      id: "trending-now",
      kind: "tracks" as const,
      title: "Trending Now",
      subtitle: "Songs listeners are playing today.",
      href: "/search",
      tracks: chartTracks,
      image: chartTracks[0]?.cover_url || chartTracks[0]?.albums?.cover_url || chartTracks[0]?.artists?.image_url,
    },
  ];

  const sideFeature = hasDailyMix ? (
    <MixCard tracks={dailyMix} title="Daily Mix" description="Fresh tunes for your spirit." badgeText="Daily" href="/mix/daily-mix" />
  ) : firstGenerated ? (
    <GeneratedFeature playlist={firstGenerated} />
  ) : firstPlaylist ? (
    <PlaylistFeature playlist={firstPlaylist} tracks={playlistTracks[firstPlaylist.id] || []} />
  ) : firstAlbum?.id ? (
    <AlbumFeature album={firstAlbum} tracks={albumTracks[firstAlbum.id] || []} />
  ) : (
    <TrendingFeature tracks={chartTracks} />
  );

  return (
    <section className="px-4 md:px-8">
      <DesktopDiscoveryGrid items={quickItems} maxItems={quickAccessMaxItems} />
      <div className="grid grid-cols-1 items-stretch gap-4 md:gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.8fr)] xl:hidden">
        {showHeroBanner ? (
          <div className="w-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
            {banners.length > 0 ? (
              <HeroSection banners={banners} />
            ) : (
              <HeroFallback playlist={firstPlaylist} album={firstAlbum} mix={firstGenerated} tracks={chartTracks} />
            )}
          </div>
        ) : null}
        <div className="w-full active:scale-[0.98] transition-transform duration-300 md:active:scale-100">
          {mobileLayout === "quick_grid" ? <MobileDiscoveryGrid items={quickItems} maxItems={quickAccessMaxItems} /> : null}
          <div className={mobileLayout === "quick_grid" ? "hidden md:block" : ""}>{sideFeature}</div>
        </div>
      </div>
    </section>
  );
}
