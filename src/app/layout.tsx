// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Miracle FM",
  description: "Tamil Christian Audio Streaming Platform",
  icons: {
    icon: "/miraclefm.jpg", // Path to your favicon in the public folder
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
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8115646001024972" crossOrigin="anonymous"/>
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
      <Analytics />
      <SpeedInsights />
      <GoogleAnalytics gaId="G-2PX140WBY7" />
    </html>
  );
}