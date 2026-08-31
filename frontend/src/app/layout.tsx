import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shadowboxer.animatrous.com"),
  title: "SHADOW BOXER - AI WASM Boxing Physics Engine",
  description: "Local-first high-performance AI fitness tracker utilizing MediaPipe Pose and WASM to measure punch velocity, acceleration, power, and form.",
  keywords: ["shadow boxer", "ai fitness", "mediapipe", "pose estimation", "webassembly", "front-end", "boxing metrics", "local first"],
  authors: [{ name: "Antigravity Front-End Architect" }],
  openGraph: {
    title: "SHADOW BOXER - AI WASM Boxing Physics Engine",
    description: "Measure punch speed, power, and form in real-time with WebAssembly pose tracking. 100% local, private, and secure.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SHADOW BOXER - AI WASM Boxing Physics Engine",
    description: "Track your speed and power with real-time browser-based computer vision.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
