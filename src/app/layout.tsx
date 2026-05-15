// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

// ─── Viewport (separate export — Next.js 14+ requirement) ───────────────────
// themeColor drives the OS media-notification accent and Android status bar.
// interactiveWidget prevents the virtual keyboard from resizing the audio player.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#FF0055" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",           // lets content sit behind iPhone notch / Dynamic Island
  interactiveWidget: "resizes-content",
};

// ─── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://miraclefm.com"),
  title: {
    default:  "Miracle FM",
    template: "%s | Miracle FM",
  },
  description: "Tamil Christian Audio Streaming Platform",
  applicationName: "Miracle FM",

  // ── PWA / Home-screen ──────────────────────────────────────────────────────
  // manifest.json is what makes Chrome / Edge treat this as an installable PWA,
  // which in turn allows background audio to persist without throttling.
  manifest: "/manifest.json",

  // ── Apple-specific ─────────────────────────────────────────────────────────
  // appleWebApp.capable = true is THE flag that tells iOS Safari to grant
  // background audio playback (equivalent to <meta apple-mobile-web-app-capable>).
  // Without it, Safari suspends the audio engine the moment the screen locks.
  appleWebApp: {
    capable:    true,
    title:      "Miracle FM",
    statusBarStyle: "black-translucent", // lets the player show behind the status bar
    startupImage: "/miraclefm.jpg",
  },

  icons: {
    icon:             [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple:            [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/miraclefm.jpg",
  },

  // ── Open Graph (lock-screen / notification artwork fallback) ───────────────
  openGraph: {
    title:       "Miracle FM",
    description: "Tamil Christian Audio Streaming Platform",
    siteName:    "Miracle FM",
    images: [{ url: "/miraclefm.jpg", width: 1200, height: 630 }],
    locale:      "ta_IN",
    type:        "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mediaDomain =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    "";

  return (
    // suppressHydrationWarning avoids server/client mismatch on 'dark' class
    <html lang="ta" className="dark" suppressHydrationWarning>
      <head>
        {/* ── CDN pre-connect: zero-latency audio delivery ─────────────────── */}
        {mediaDomain && (
          <>
            <link rel="preconnect" href={mediaDomain} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={mediaDomain} />
          </>
        )}

        {/*
          ── Audio context policy (Chrome) ───────────────────────────────────
          autoplay-policy: no-user-gesture-required is no longer settable via
          meta tag in modern Chrome, but the Permissions-Policy header (set in
          next.config.js) is the correct place. The meta tag below is kept for
          older WebViews that still respect it.
        */}
        <meta name="google" content="notranslate" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8115646001024972"
          crossOrigin="anonymous"
        />
      </head>

      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics gaId="G-2PX140WBY7" />
      </body>
    </html>
  );
}
