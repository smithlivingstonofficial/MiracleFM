import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Initialize the PWA plugin
const withPWA = withPWAInit({
  dest: "public",
  // Disable PWA in development so you don't get annoying caching issues while coding
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  // 1. Image Configuration: Allow images from Cloudflare R2 & Google
  images: {
    remotePatterns:[
      {
        protocol: "https",
        // This wildcard allows any public R2 bucket URL (pub-xxxx.r2.dev)
        hostname: "**.r2.dev", 
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
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
        source: "/upload",
        headers:[
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

// Export the config wrapped with the PWA initialization
export default withPWA(nextConfig);