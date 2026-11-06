import type { Metadata } from "next";
import Script from "next/script";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Daily Club", template: "%s · Daily Club" },
  description: "Your private scoreboard for the games you play every day.",
  icons: {
    icon: [{ url: "/Neon Lime Leaderboard Icon.png", type: "image/png" }],
    apple: [{ url: "/Neon Lime Leaderboard Icon.png", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
        <Script
          async
          crossOrigin="anonymous"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7254167041351258"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
