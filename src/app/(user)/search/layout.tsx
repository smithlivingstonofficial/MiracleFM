import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Tamil Christian Songs",
  description: "Search Tamil Christian songs, worship artists, albums, playlists, and lyrics on Miracle FM.",
  alternates: {
    canonical: "/search",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
