import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BASE_URL } from "@/lib/constants";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

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
    <html lang="en" className={`${serif.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="pharmacopoeia flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
