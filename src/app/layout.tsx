// src/app/layout.tsx

// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { absoluteUrl, DEFAULT_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Miracle FM",
    "Tamil Christian music",
    "Tamil Christian songs",
    "Tamil worship songs",
    "Christian gospel music",
    "Tamil gospel songs",
    "Christian devotional audio",
    "worship music streaming",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "music",
  verification: {
    google: "0v6Hmws4g7AsVjkst14NDV0ISXErjmmKjnsQu8LqWGk",
  },
  alternates: {
    canonical: "/",
  },

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
      { url: "/miraclefm.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple:            [
      { url: "/miraclefm.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    shortcut: "/miraclefm.jpg",
  },

  // ── Open Graph (lock-screen / notification artwork fallback) ───────────────
  openGraph: {
    title:       SITE_TITLE,
    description: SITE_DESCRIPTION,
    url:         SITE_URL,
    siteName:    SITE_NAME,
    images: [{ url: DEFAULT_IMAGE, width: 512, height: 512, alt: "Miracle FM Tamil Christian Music logo" }],
    locale:      "ta_IN",
    type:        "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_IMAGE, alt: "Miracle FM Tamil Christian Music logo" }],
  },
  other: {
    "msapplication-TileImage": "/miraclefm.jpg",
    "msapplication-TileColor": "#FF0055",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mediaDomain =
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    "";

  const siteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl(DEFAULT_IMAGE),
      description: SITE_DESCRIPTION,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/search")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "MusicStreamingService",
      name: SITE_NAME,
      url: SITE_URL,
      image: absoluteUrl(DEFAULT_IMAGE),
      logo: absoluteUrl(DEFAULT_IMAGE),
      description: SITE_DESCRIPTION,
      inLanguage: ["ta", "en"],
      genre: ["Tamil Christian", "Gospel", "Worship", "Devotional"],
    },
  ];

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>

      <body className={`${manrope.className} ${manrope.variable} bg-black text-white antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
        <Analytics />
        <SpeedInsights />
        <GoogleAnalytics gaId="G-2PX140WBY7" />

        {/* Google AdSense (Loaded lazily post-hydration to prevent ad-blocker hydration mismatches) */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8115646001024972"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
