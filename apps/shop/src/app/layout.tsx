import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, Newsreader, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { CartProvider } from "@/components/store/CartProvider";
import SiteNav from "@/components/store/SiteNav";
import SiteFooter from "@/components/store/SiteFooter";
import CartDrawer from "@/components/store/CartDrawer";
import AccountGate from "@/components/store/gate/AccountGate";
import HideOnAdmin from "@/components/store/HideOnAdmin";
import { getLiveCatalogOrNull } from "@/lib/catalog-live";
import { showComingSoon } from "@/lib/early/access";

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

// Android: when the keyboard opens, shrink the page to the space above it so
// the account gate's fields stay visible (iOS is handled in AccountGate).
export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: "Aura Protocols — Research Peptides", template: "%s | Aura Protocols" },
  description: "Research-grade peptides with a certificate of analysis tied to every lot. For laboratory research use only.",
  keywords: ["research peptides", "certificate of analysis", "HPLC tested peptides", "lyophilized peptides"],
  authors: [{ name: "Aura Protocols", url: BASE_URL }],
  creator: "Aura Protocols",
  openGraph: {
    title: "Aura Protocols — Research Peptides",
    description: "Research peptides tested by an ISO/IEC 17025-accredited US lab. For laboratory research use only.",
    type: "website",
    url: BASE_URL,
    siteName: "Aura Protocols",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Aura Protocols — research peptides" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aura Protocols — Research Peptides",
    description: "Research peptides tested by an ISO/IEC 17025-accredited US lab. For laboratory research use only.",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Live catalog for the cart and footer. Empty while the DB can't be read
  // (pages show "Unavailable"; the cart keeps stored lines until it's back).
  const live = await getLiveCatalogOrNull();
  const shown = live?.shown ?? [];
  // Before launch (PRELAUNCH=1): the coming-soon page, unless this browser has early access.
  const prelaunch = await showComingSoon();
  return (
    // data-scroll-behavior: Next 16 turns off globals.css smooth scrolling while it
    // changes pages; without it a new page kept the old scroll position (Sign in
    // landed at the bottom of home, 2026-10-21). In-page #section links stay smooth.
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#EDE9E0]">
        <CartProvider catalog={shown}>
          {/* Before launch: no store chrome, cart or account gate (the coming-soon page has its own footer). */}
          {!prelaunch && <HideOnAdmin><SiteNav /></HideOnAdmin>}
          <main className="flex-1">{children}</main>
          {!prelaunch && <HideOnAdmin><SiteFooter catalog={shown} /></HideOnAdmin>}
          {!prelaunch && <CartDrawer />}
          {!prelaunch && <AccountGate />}
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
