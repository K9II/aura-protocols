import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Aura Protocols — Premium Peptide Research",
  description:
    "Discover high-purity research peptides sourced from the most trusted suppliers. Expert guides, verified vendors, and transparent affiliate partnerships.",
  keywords: ["peptides", "BPC-157", "TB-500", "semaglutide", "research peptides", "peptide affiliate"],
  openGraph: {
    title: "Aura Protocols",
    description: "Premium peptide research & trusted vendor directory.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="aurora-bg min-h-screen flex flex-col">
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
