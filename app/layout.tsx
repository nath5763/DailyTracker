import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Daily Club", template: "%s · Daily Club" },
  description: "Your private scoreboard for the games you play every day.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
