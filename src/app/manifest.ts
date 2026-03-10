// app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Music Player", // Change to your app's name
    short_name: "Music",
    description: "The best streaming experience",
    start_url: "/",
    display: "standalone", // CRITICAL: This hides the Safari/Chrome browser UI and makes it feel native
    background_color: "#050505",
    theme_color: "#FF0055", // Your brand color
    orientation: "portrait",
    icons:[
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}