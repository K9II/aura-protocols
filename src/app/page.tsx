import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";

const featured = products.filter((p) => p.featured);

const stats = [
  { value: "6+", label: "Partner Vendors" },
  { value: "50+", label: "Research Compounds" },
  { value: "10–15%", label: "Avg. Commission" },
  { value: "99%", label: "Purity Standards" },
];

const vendors = [
  "Peptide Sciences",
  "Core Peptides",
  "Limitless Life Nootropics",
  "Swiss Chems",
  "Behemoth Labz",
  "Blue Sky Peptides",
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Trusted Affiliate Partner Network
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Elevate Your Biology.<br />
          <span className="gradient-brand">Research Peptides,</span><br />
          Trusted Sources.
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed mb-10">
          Aura Protocols connects you with the highest-quality research peptides from the most reputable suppliers. Expert-curated, fully disclosed, built for results.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/products" className="btn-primary text-base px-8 py-3.5">
            Explore Products
          </Link>
          <Link href="/blog" className="btn-outline text-base px-8 py-3.5">
            Read the Research
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="glass p-6 text-center">
              <p className="text-3xl font-black gradient-brand mb-1">{s.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor marquee */}
      <section className="overflow-hidden py-6 border-y border-white/5 my-4">
        <div className="flex gap-16 animate-marquee whitespace-nowrap">
          {[...vendors, ...vendors].map((v, i) => (
            <span key={i} className="text-sm font-semibold text-slate-500 tracking-wide">
              {v}
            </span>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Featured</p>
            <h2 className="text-3xl font-bold text-white">Top Research Compounds</h2>
          </div>
          <Link href="/products" className="btn-outline text-sm py-2 px-5 hidden sm:inline-block">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center mt-10 sm:hidden">
          <Link href="/products" className="btn-outline text-sm py-2.5 px-6">
            View All Products
          </Link>
        </div>
      </section>

      {/* Trust section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="glass p-10 text-center glow-violet">
          <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold mb-4">Why Aura Protocols</p>
          <h2 className="text-3xl font-bold text-white mb-4">Built on Transparency</h2>
          <p className="max-w-2xl mx-auto text-slate-400 leading-relaxed mb-8">
            Every vendor in our network is vetted for purity testing, third-party COAs, and customer reputation. We only recommend what we&apos;d use ourselves.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { title: "COA Verified", desc: "All vendors provide third-party Certificates of Analysis." },
              { title: "FTC Compliant", desc: "Full affiliate disclosure on every page, always." },
              { title: "Independent Reviews", desc: "Our editorial content is never influenced by commissions." },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 rounded-xl p-5">
                <p className="font-bold text-white mb-1">{item.title}</p>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
