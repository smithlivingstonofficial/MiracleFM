// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // ── 1. Image Domains (Cloudflare R2 + Google OAuth avatars) ─────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",       // any public R2 bucket (pub-xxxx.r2.dev)
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google OAuth profile pictures
      },
      // Add a custom CDN domain here when you're ready:
      // { protocol: "https", hostname: "media.miraclefm.com" },
    ],
  },

  // ── 2. HTTP Headers ───────────────────────────────────────────────────────
  async headers() {
    return [

      // ── A. Global headers — applied to every route ─────────────────────
      {
        source: "/(.*)",
        headers: [
          /*
            Permissions-Policy: autoplay
            ─────────────────────────────────────────────────────────────────
            Chrome 66+ blocks autoplay by default. This header grants the
            autoplay permission to the same origin so the audio element can
            resume after a tab switch, screen lock, or navigation without
            requiring a new user gesture each time.
          */
          {
            key: "Permissions-Policy",
            value: "autoplay=(*), camera=(), microphone=()",
          },
        ],
      },

      // ── B. /upload route — FFmpeg transcoding in the browser ───────────
      // COOP + COEP are required for SharedArrayBuffer, which FFmpeg.wasm
      // needs. Scoped only to /upload so it doesn't interfere with HLS
      // workers on other pages.
      {
        source: "/upload",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },

      // ── C. Service Worker — scope + no-cache ──────────────────────────
      /*
        Service workers are restricted to the directory of their script URL
        by default. The Service-Worker-Allowed header extends the scope to
        the full origin so the SW can intercept ALL audio/image fetches,
        not just those under /sw.js's directory.

        Cache-Control: no-cache ensures the browser checks for a new SW
        version on every page load (stale SW = stale audio cache strategy).
      */
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "no-cache",
          },
        ],
      },

      // ── D. Web App Manifest ───────────────────────────────────────────
      // Prevents the manifest from being cached aggressively so PWA
      // installs always see the latest icon / name / theme-color.
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache",
          },
          {
            key: "Content-Type",
            value: "application/manifest+json",
          },
        ],
      },

      // ── E. API routes — CORS for R2 audio streaming ───────────────────
      /*
        hls.js fetches .m3u8 playlists and .ts segments via XHR/fetch.
        If your Next.js API routes proxy R2 responses, these headers allow
        the browser to accept the stream and support byte-range requests
        (needed for scrubbing on the lock-screen slider).
      */
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin",   value: "*" },
          { key: "Access-Control-Allow-Methods",  value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers",  value: "Range, Content-Type" },
          {
            key: "Access-Control-Expose-Headers",
            value: "Content-Range, Content-Length, Accept-Ranges",
          },
        ],
      },

    ];
  },
};

export default nextConfig;