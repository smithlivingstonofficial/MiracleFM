// src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

// 1. PWA Viewport Configuration
// This is strictly required for mobile PWAs to behave like native apps
export const viewport: Viewport = {
  themeColor: "#000000", // Matches your black background
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Crucial for iOS: prevents auto-zooming when tapping buttons
  userScalable: false,
};

// 2. App Metadata + iOS PWA Configurations
export const metadata: Metadata = {
  title: "Miracle FM",
  description: "Tamil Christian Audio Streaming Platform",
  icons: {
    icon: "/miraclefm-192.png", // Your existing favicon
    apple: "/miraclefm-192.png", // iOS Home Screen Icon (from the public folder)
  },
  manifest: "/manifest.json", // Links to the PWA manifest
  appleWebApp: {
    capable: true, // Allows the app to be installed to the iOS Home Screen natively
    statusBarStyle: "black-translucent", // Blends the iOS status bar into your app's dark theme
    title: "Miracle FM",
  },
  formatDetection: {
    telephone: false, // Prevents iOS from aggressively highlighting random numbers as phone numbers
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google AdSense */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8115646001024972" 
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
        
        {/* Global UI & Analytics Components */}
        <Toaster position="bottom-right" richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}