import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EngineCTABanner from "@/components/EngineCTABanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const BASE_URL = "https://shop.auraprotocols.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Aura Protocols — Premium Peptide Research",
    template: "%s | Aura Protocols",
  },
  description:
    "Discover high-purity research peptides sourced from the most trusted suppliers. Expert guides, verified vendors, and transparent affiliate partnerships.",
  keywords: ["peptides", "BPC-157", "TB-500", "semaglutide", "research peptides", "peptide affiliate", "buy peptides", "peptide vendor review"],
  authors: [{ name: "Aura Protocols", url: BASE_URL }],
  creator: "Aura Protocols",
  openGraph: {
    title: "Aura Protocols — Premium Peptide Research",
    description: "Expert-curated research peptides from the most trusted suppliers.",
    type: "website",
    url: BASE_URL,
    siteName: "Aura Protocols",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Aura Protocols" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Protocols — Premium Peptide Research",
    description: "Expert-curated research peptides from the most trusted suppliers.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "19ef2131f7ff3aa2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`aurora-bg min-h-screen flex flex-col`}>
        <EngineCTABanner />
        {/* FTC Affiliate Disclosure */}
        <div className="disclosure">
          Affiliate Disclosure: Aura Protocols earns commissions from qualifying purchases via affiliate links. This does not affect our editorial independence.
        </div>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
