// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  // ── 1. Image domains ──────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // ── 2. HTTP headers ───────────────────────────────────────────────────────
  async headers() {
    return [

      // ── A. Every route — autoplay permission only ──────────────────────
      // COOP/COEP are intentionally NOT here.
      // Adding them globally breaks Google AdSense, Google Analytics,
      // Vercel Analytics and any other cross-origin postMessage service
      // because they cannot communicate across a cross-origin isolated context.
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "autoplay=(*), camera=(), microphone=()",
          },
        ],
      },

      // ── B. /upload only — COOP + COEP for FFmpeg.wasm ─────────────────
      // SharedArrayBuffer (required by FFmpeg.wasm) needs cross-origin
      // isolation, but that isolation must be scoped to /upload only.
      // Applying it globally is what causes AdSense / Analytics to break.
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

      // ── C. Service worker — full-origin scope + no-cache ──────────────
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

      // ── D. Manifest — correct MIME + no-cache ─────────────────────────
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

      // ── E. API routes — CORS for R2 byte-range audio streaming ────────
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