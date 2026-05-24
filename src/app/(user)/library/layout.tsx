import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Library",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
