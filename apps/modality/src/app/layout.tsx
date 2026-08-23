import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import { BASE_URL, SITE_INDEXABLE } from "@/lib/site";
import "./globals.css";

const serif = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "Modality — Prescription care, matched to you",
  description:
    "Browse clinician-led protocols and start a telehealth visit. Connect a wearable to personalize your match — optional, never required.",
  // Site-wide noindex until launch. Individual pages inherit this unless they
  // override `robots` in their own metadata (none do), so flipping SITE_INDEXABLE
  // opens up every route at once. Belt-and-suspenders with robots.ts.
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
