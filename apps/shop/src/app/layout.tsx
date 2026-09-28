import type { Metadata } from "next";
import { Inter, Space_Grotesk, Newsreader, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CartProvider } from "@/components/store/CartProvider";
import SiteNav from "@/components/store/SiteNav";
import SiteFooter from "@/components/store/SiteFooter";
import CartDrawer from "@/components/store/CartDrawer";
import EntryGate from "@/components/store/EntryGate";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
// "The Pharmacopoeia" redesign — display serif for the new paper/ink theme.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
});
// Storefront micro-labels (announcement bar, class labels, spec captions).
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains" });

const BASE_URL = "https://auraprotocols.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "Aura Protocols — Research Peptides, Lot-Tested", template: "%s | Aura Protocols" },
  description: "Research-grade peptides with a certificate of analysis tied to every lot. For laboratory research use only.",
  keywords: ["research peptides", "certificate of analysis", "HPLC tested peptides", "lyophilized peptides"],
  authors: [{ name: "Aura Protocols", url: BASE_URL }],
  creator: "Aura Protocols",
  openGraph: {
    title: "Aura Protocols — Research Peptides, Lot-Tested",
    description: "Every lot independently tested, every certificate on the page. For research use only.",
    type: "website",
    url: BASE_URL,
    siteName: "Aura Protocols",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Aura Protocols" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Protocols — Research Peptides, Lot-Tested",
    description: "Every lot independently tested, every certificate on the page. For research use only.",
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
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#EDE9E0]">
        <CartProvider>
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CartDrawer />
          <EntryGate />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
