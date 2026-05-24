import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin-tracks",
        "/albums",
        "/artists",
        "/covers",
        "/dashboard",
        "/genres",
        "/library",
        "/login",
        "/playlists",
        "/profile",
        "/recommendations",
        "/settings",
        "/signin",
        "/tracks",
        "/upload",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
