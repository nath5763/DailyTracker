import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import Script from "next/script";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Daily Tracker", template: "%s · Daily Tracker" },
  description: "Your private scoreboard for the games you play every day.",
  icons: {
    icon: [{ url: "/Neon Lime Leaderboard Icon.png", type: "image/png" }],
    apple: [{ url: "/Neon Lime Leaderboard Icon.png", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: `try { var user = localStorage.getItem('daily-club:theme-user'); var theme = user && localStorage.getItem('daily-club:theme:' + user); document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light'; } catch { document.documentElement.dataset.theme = 'light'; }` }} /></head>
      <body>
        {children}
        <SiteFooter />
        <Script
          async
          crossOrigin="anonymous"
          nonce={nonce}
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7254167041351258"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
