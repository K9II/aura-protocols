import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { comparisons } from "@/data/comparisons";

export const metadata: Metadata = {
  title: "Aura Protocols — Expert Peptide Research & Reviews",
  description:
    "Expert-curated research peptides from the most trusted suppliers. Vendor reviews, compound guides, and transparent affiliate partnerships.",
  alternates: { canonical: "/" },
};

const featuredProducts = products.filter((p) => p.featured);
const latestPosts = posts.slice(0, 3);

const categoryColor: Record<string, string> = {
  Recovery: "text-emerald-400 bg-emerald-400/10",
  "Weight Management": "text-rose-400 bg-rose-400/10",
  "Growth & Performance": "text-violet-400 bg-violet-400/10",
  Wellness: "text-cyan-400 bg-cyan-400/10",
  "Buyer's Guide": "text-slate-400 bg-slate-400/10",
};

const vendors = [
  {
    name: "Core Peptides",
    commission: "12%",
    specialty: "Recovery & Performance",
    note: "Top-tier BPC-157, TB-500, and Sermorelin with same-day US shipping and batch COAs.",
    href: "https://www.corepeptides.com",
  },
  {
    name: "Limitless Life Nootropics",
    commission: "15%",
    specialty: "GH Secretagogues",
    note: "Top-rated CJC-1295/Ipamorelin stacks with USA manufacturing and 99%+ purity.",
    href: "https://limitlesslifenootropics.com",
  },
  {
    name: "Swiss Chems",
    commission: "10%",
    specialty: "Broad Catalog",
    note: "International shipping, PT-141, SARMs, and an extensive peptide catalog.",
    href: "https://swisschems.is",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div
            style={{
              position: "absolute",
              top: "-10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "800px",
              height: "600px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "30%",
              left: "15%",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <p
            className="font-display text-xs font-bold tracking-widest uppercase mb-5 stagger-1"
            style={{ color: "var(--cyan)" }}
          >
            Trusted Peptide Research
          </p>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6 stagger-2">
            The source for{" "}
            <span className="gradient-brand">serious peptide</span>{" "}
            research.
          </h1>

          <p
            className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto stagger-3"
            style={{ color: "var(--muted)" }}
          >
            Expert-curated compound guides, vetted vendor reviews, and
            transparent COA-verified sourcing — everything you need to make
            informed decisions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 stagger-4">
            <Link href="/products" className="btn-primary text-sm w-full sm:w-auto text-center">
              Browse Compounds
            </Link>
            <Link href="/blog" className="btn-outline text-sm w-full sm:w-auto text-center">
              Read Research Guides
            </Link>
          </div>
        </div>

        {/* Trust stats */}
        <div className="max-w-3xl mx-auto mt-16">
          <div className="glass flex flex-col sm:flex-row items-center justify-around gap-6 px-8 py-6">
            {[
              { stat: "6+", label: "Researched Compounds" },
              { stat: "3", label: "Vetted Vendors" },
              { stat: "COA", label: "Verified Purity" },
              { stat: "100%", label: "FTC Compliant" },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-2xl font-bold" style={{ color: "var(--cyan)" }}>
                  {stat}
                </p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Compounds ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--cyan)" }}>
              Top Compounds
            </p>
            <h2 className="font-display text-3xl font-bold text-white">Featured Research Peptides</h2>
          </div>
          <Link href="/products" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
            View all compounds →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/products" className="btn-outline text-sm">
            View All Compounds
          </Link>
        </div>
      </section>

      {/* ── Vendor Trust Strip ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--cyan)" }}>
            Our Partners
          </p>
          <h2 className="font-display text-3xl font-bold text-white mb-3">Vetted Vendor Network</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Every vendor is manually reviewed for third-party HPLC purity testing,
            batch-specific COA availability, and customer service track record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vendors.map((v) => (
            <a
              key={v.name}
              href={v.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="glass vendor-card p-6 flex flex-col gap-4 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {v.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{v.specialty}</p>
                </div>
                <span className="badge shrink-0">{v.commission}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{v.note}</p>
              <p className="text-xs mt-auto" style={{ color: "var(--cyan)" }}>
                Visit site →
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* ── Vendor Comparisons ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--cyan)" }}>
              Side-by-Side Analysis
            </p>
            <h2 className="font-display text-3xl font-bold text-white">Vendor Comparisons</h2>
          </div>
          <Link href="/compare" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
            All comparisons →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {comparisons.map((c) => (
            <Link
              key={c.slug}
              href={`/compare/${c.slug}`}
              className="glass vendor-card p-6 flex flex-col gap-3 group"
            >
              <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                <span className="text-white">{c.vendorA}</span>
                <span>vs</span>
                <span className="text-white">{c.vendorB}</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                {c.intro.slice(0, 110)}…
              </p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                <span className="text-xs text-slate-500">
                  Winner: <span className="text-white font-semibold">{c.winner === "A" ? c.vendorA : c.winner === "B" ? c.vendorB : "Tie"}</span>
                </span>
                <span className="text-xs group-hover:text-white transition-colors" style={{ color: "var(--cyan)" }}>
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Why Aura Protocols ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="glass p-10 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--cyan)" }}>
                Our Standard
              </p>
              <h2 className="font-display text-3xl font-bold text-white mb-4 leading-snug">
                We only recommend what we'd use ourselves.
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm mb-6">
                The peptide industry is noisy. We cut through it with a simple rule: every
                vendor on this site must pass a manual review for documentation quality,
                purity standards, and operational reliability — regardless of commission rate.
              </p>
              <Link href="/about" className="btn-outline text-sm">
                Our Methodology
              </Link>
            </div>
            <div className="space-y-4">
              {[
                ["Third-Party COAs", "Independent Certificates of Analysis for every batch — not self-reported."],
                ["HPLC Purity ≥98%", "High-Performance Liquid Chromatography purity testing on every product."],
                ["Transparent Sourcing", "We disclose every affiliate relationship, every time, on every page."],
                ["No Phantom Vendors", "Peptide Sciences shut down in March 2026 — we removed them immediately."],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-4">
                  <span
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: "var(--cyan)" }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Latest Research ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--cyan)" }}>
              From the Blog
            </p>
            <h2 className="font-display text-3xl font-bold text-white">Latest Research Guides</h2>
          </div>
          <Link href="/blog" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">
            All articles →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="glass vendor-card p-6 flex flex-col gap-4 group"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    categoryColor[post.category] ?? "text-slate-400 bg-slate-400/10"
                  }`}
                >
                  {post.category}
                </span>
                <span className="text-xs text-slate-500">{post.readTime}</span>
              </div>
              <div>
                <h3 className="text-white font-bold leading-snug group-hover:text-cyan-400 transition-colors mb-2">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">{post.excerpt}</p>
              </div>
              <p className="text-xs mt-auto" style={{ color: "var(--cyan)" }}>
                Read article →
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link href="/blog" className="btn-outline text-sm">
            All Research Guides
          </Link>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="banner-gradient rounded-2xl px-10 py-14 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            Ready to start your research?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
            Browse our full compound catalog or dive into our research guides.
            Every link goes to a COA-verified, manually reviewed vendor.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/products" className="btn-primary text-sm w-full sm:w-auto text-center">
              View All Compounds
            </Link>
            <Link href="/compare" className="btn-outline text-sm w-full sm:w-auto text-center">
              Compare Vendors
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
