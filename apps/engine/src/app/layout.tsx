import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BASE_URL } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const syne = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-syne", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "Aura Protocols — Peptide Protocols Tuned to Your Biometrics", template: "%s — Aura Protocols" },
  description: "Connect your wearable. The Engine reads your recovery, sleep, and stress and returns a peptide protocol tuned to your data. Free. Educational only.",
  openGraph: { type: "website", url: BASE_URL, siteName: "Aura Protocols" },
  twitter: { card: "summary_large_image", site: "@aura_protocols" },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
