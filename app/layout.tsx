import type { Metadata } from "next";
import "./globals.css";
import { sitePath } from "./site-paths";

// The catalog and all games are client-side experiences with no request-time
// data. Declare that explicitly for Vinext's static-export analysis.
export const dynamic = "error";

export const metadata: Metadata = {
  title: "Hanna's Spiele",
  description: "Hannas kleine Spielesammlung für Browser und Smartphone.",
  icons: {
    icon: sitePath("/favicon.svg"),
    shortcut: sitePath("/favicon.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
