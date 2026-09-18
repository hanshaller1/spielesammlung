import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hanna's Spiele",
  description: "Hannas kleine Spielesammlung für Browser und Smartphone.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
