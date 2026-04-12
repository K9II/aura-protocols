import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-display" });

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
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Protocols — Premium Peptide Research",
    description: "Expert-curated research peptides from the most trusted suppliers.",
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
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className={`aurora-bg min-h-screen flex flex-col`}>
        {/* FTC Affiliate Disclosure */}
        <div className="disclosure">
          Affiliate Disclosure: Aura Protocols earns commissions from qualifying purchases via affiliate links. This does not affect our editorial independence.
        </div>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
