import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Disc3, Music4 } from "lucide-react";
import CollectionPlayButton from "@/components/user/CollectionPlayButton";
import PlaylistCover from "@/components/user/PlaylistCover";
import type { Album, GeneratedPlaylist, Playlist, Track } from "@/types/music";

type TrackMap = Record<string, Track[]>;

type FeaturedCollectionShelfProps = {
  playlists: Playlist[];
  albums: Album[];
  recommendationPlaylists: GeneratedPlaylist[];
  playlistTracks: TrackMap;
  albumTracks: TrackMap;
  title?: string;
  description?: string;
  viewAllHref?: string;
  maxItems?: number;
};

type FeaturedItem =
  | {
      id: string;
      kind: "playlist";
      title: string;
      subtitle: string;
      href: string;
      coverUrl?: string | null;
      playlistId: string;
      tracks: Track[];
    }
  | {
      id: string;
      kind: "album";
      title: string;
      subtitle: string;
      href: string;
      coverUrl?: string | null;
      tracks: Track[];
    }
  | {
      id: string;
      kind: "mix";
      title: string;
      subtitle: string;
      href: string;
      coverUrls: string[];
      tracks: Track[];
    };

const mixArtwork = (playlist: GeneratedPlaylist) =>
  Array.from(
    new Set(
      playlist.tracks
        .map((track) => track.cover_url || track.albums?.cover_url || track.artists?.image_url)
        .filter((url): url is string => Boolean(url))
    )
  ).slice(0, 4);

function buildItems({
  playlists,
  albums,
  recommendationPlaylists,
  playlistTracks,
  albumTracks,
  maxItems = 8,
}: FeaturedCollectionShelfProps): FeaturedItem[] {
  const playlistItems: FeaturedItem[] = playlists.map((playlist) => ({
    id: `playlist-${playlist.id}`,
    kind: "playlist",
    title: playlist.title,
    subtitle: playlist.description || "Editorial playlist",
    href: `/playlist/${playlist.id}`,
    coverUrl: playlist.cover_url,
    playlistId: playlist.id,
    tracks: playlistTracks[playlist.id] || [],
  }));

  const albumItems: FeaturedItem[] = albums
    .filter((album): album is Album & { id: string } => Boolean(album.id))
    .map((album) => ({
      id: `album-${album.id}`,
      kind: "album",
      title: album.title,
      subtitle: album.artists?.name || "New release",
      href: `/album/${album.id}`,
      coverUrl: album.cover_url,
      tracks: albumTracks[album.id] || [],
    }));

  const mixItems: FeaturedItem[] = recommendationPlaylists
    .filter((playlist) => playlist.tracks.length > 0)
    .map((playlist) => ({
      id: `mix-${playlist.section.slug}`,
      kind: "mix",
      title: playlist.section.title,
      subtitle: playlist.section.description,
      href: `/mix/${playlist.section.slug}`,
      coverUrls: mixArtwork(playlist),
      tracks: playlist.tracks,
    }));

  const baseItems = playlistItems.length >= 4 ? playlistItems : [...playlistItems, ...albumItems, ...mixItems];
  return baseItems.slice(0, maxItems);
}

function ItemArtwork({ item }: { item: FeaturedItem }) {
  if (item.kind === "playlist") {
    return <PlaylistCover playlistId={item.playlistId} explicitCover={item.coverUrl} className="h-full w-full" />;
  }

  if (item.kind === "mix") {
    if (item.coverUrls.length === 0) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
          <Music4 size={42} />
        </div>
      );
    }

    const covers = item.coverUrls.length === 1 ? [item.coverUrls[0], item.coverUrls[0], item.coverUrls[0], item.coverUrls[0]] : item.coverUrls.slice(0, 4);
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
        {covers.map((url, index) => (
          <div key={`${url}-${index}`} className="relative h-full w-full">
            <Image src={url} alt="" fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="180px" />
          </div>
        ))}
      </div>
    );
  }

  if (item.coverUrl) {
    return <Image src={item.coverUrl} alt={item.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" sizes="180px" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
      <Disc3 size={42} />
    </div>
  );
}

export default function FeaturedCollectionShelf(props: FeaturedCollectionShelfProps) {
  const items = buildItems(props);
  const title = props.title || "Curated For You";
  const description = props.description;
  const viewAllHref = props.viewAllHref || "/library";
  if (items.length === 0) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-black tracking-tight text-white md:text-3xl">{title}</h2>
          {description ? <p className="mt-1 line-clamp-1 text-sm font-medium text-zinc-500">{description}</p> : null}
        </div>
        <Link href={viewAllHref} className="flex shrink-0 items-center gap-1 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors active:text-white md:hover:text-white">
          View All <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {items.map((item) => (
          <article key={item.id} className="group min-w-0 transition-transform duration-300 active:scale-95 md:active:scale-100">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-[0_14px_34px_rgba(0,0,0,0.22)] transition-all duration-300 md:group-hover:-translate-y-1 md:group-hover:border-[#FF0055]/30 md:group-hover:shadow-[0_10px_30px_rgba(255,0,85,0.12)]">
              <Link href={item.href} className="absolute inset-0 z-0">
                <ItemArtwork item={item} />
              </Link>

              <div className="absolute inset-0 hidden bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 md:block md:group-hover:opacity-100" />
              <div className="absolute inset-0 hidden translate-y-4 items-center justify-center opacity-0 transition-all duration-500 md:flex md:group-hover:translate-y-0 md:group-hover:opacity-100">
                <CollectionPlayButton tracks={item.tracks} size="default" />
              </div>

              <div className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {item.tracks.length > 0 ? `${item.tracks.length} Songs` : item.kind}
                </span>
              </div>
            </div>

            <div className="px-1 pt-2">
              <Link href={item.href} className="block truncate text-sm font-bold text-zinc-100 transition-colors md:text-base md:group-hover:text-[#FF0055]">
                {item.title}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
