import type { Viewport } from "next";
import "./koenigreich.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function KoenigreichLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
