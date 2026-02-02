import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Image Configuration: Allow images from Cloudflare R2
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // This wildcard allows any public R2 bucket URL (pub-xxxx.r2.dev)
        hostname: "**.r2.dev", 
      },
      // (Optional) If you connect a custom domain later, add it here:
      // {
      //   protocol: "https",
      //   hostname: "media.miraclefm.com",
      // },
    ],
  },

  // 2. Security Headers: Required for FFmpeg (Transcoding) to work in the browser
  async headers() {
    return [
      {
        source: "/(.*)",
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
    ];
  },
};

export default nextConfig;