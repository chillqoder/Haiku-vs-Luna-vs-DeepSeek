import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloudrest | A living sky island",
  description: "An interactive low-poly village diorama built with Three.js.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
