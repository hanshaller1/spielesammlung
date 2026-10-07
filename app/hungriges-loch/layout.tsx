import type { Viewport } from "next";
import "./hungriges-loch.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function HungrigesLochLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
