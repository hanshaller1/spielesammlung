import type { Viewport } from "next";
import "./waren-sortieren.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function WarenSortierenLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
