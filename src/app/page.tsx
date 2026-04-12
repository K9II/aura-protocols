import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { products } from "@/data/products";
import { posts } from "@/data/posts";

const featured = products.filter((p) => p.featured);

const latestPosts = [...posts]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 3);

const stats = [
  { value: "6+",    label: "Partner Vendors",     border: "border-category-emerald" },
  { value: "50+",   label: "Research Compounds",  border: "border-category-rose" },
  { value: "10–15%",label: "Avg. Commission",     border: "border-category-violet" },
  { value: "99%",   label: "Purity Standards",    border: "border-category-cyan" },
];

const categories = [
  { name: "Recovery",             color: "emerald", icon: "🧬", href: "/products", count: products.filter((p) => p.category === "Recovery").length },
  { name: "Weight Management",    color: "rose",    icon: "⚖️", href: "/products", count: products.filter((p) => p.category === "Weight Management").length },
  { name: "Growth & Performance", color: "violet",  icon: "📈", href: "/products", count: products.filter((p) => p.category === "Growth & Performance").length },
  { name: "Wellness",             color: "cyan",    icon: "✦",  href: "/products", count: products.filter((p) => p.category === "Wellness").length },
];

const categoryTextClass: Record<string, string> = {
  emerald: "text-emerald-400",
  rose:    "text-rose-400",
  violet:  "text-violet-400",
  cyan:    "text-cyan-400",
};

const categoryBorderClass: Record<string, string> = {
  emerald: "border-category-emerald",
  rose:    "border-category-rose",
  violet:  "border-category-violet",
  cyan:    "border-category-cyan",
};

const vendorGrid = [
  { name: "Core Peptides",             commission: "12%", url: "https://www.corepeptides.com/" },
  { name: "Limitless Life Nootropics", commission: "15%", url: "https://limitlesslifenootropics.com/" },
  { name: "Swiss Chems",               commission: "10%", url: "https://swisschems.is/" },
  { name: "Behemoth Labz",             commission: "12%", url: "https://behemothlabz.com/" },
];

const postPillClass: Record<string, string> = {
  "Recovery":             "text-emerald-400 bg-emerald-400/10",
  "Weight Management":    "text-rose-400 bg-rose-400/10",
  "Growth & Performance": "text-violet-400 bg-violet-400/10",
  "Wellness":             "text-cyan-400 bg-cyan-400/10",
  "Buyer's Guide":        "text-amber-400 bg-amber-400/10",
};

const postAccentClass: Record<string, string> = {
  "Recovery":             "bg-emerald-500",
  "Weight Management":    "bg-rose-500",
  "Growth & Performance": "bg-violet-500",
  "Wellness":             "bg-cyan-500",
  "Buyer's Guide":        "bg-amber-500",
};

export default function HomePage() {
  return (
    <>
      {/* ── 1. HERO ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Watermark */}
        <span
          className="hero-watermark hidden lg:block"
          style={{ bottom: "-0.1em", right: "-0.05em", zIndex: 0 }}
          aria-hidden="true"
        >
          AURA
        </span>

        {/* Radial glow blobs */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 55% 45% at 70% 60%, rgba(139,92,246,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 35% at 30% 40%, rgba(0,212,255,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-16 items-center">
          {/* Left — copy */}
          <div>
            <div className="stagger-1 inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Trusted Affiliate Partner Network
            </div>

            <h1
              className="stagger-2 font-display text-white leading-[1.05] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)", fontWeight: 800 }}
            >
              Elevate Your<br />
              <span className="gradient-brand">Biology.</span>
            </h1>

            <p className="stagger-3 text-xl text-slate-400 leading-relaxed mb-10 max-w-xl">
              Research peptides from the most vetted suppliers — every compound linked to a public COA, every affiliate disclosed. No guesswork.
            </p>

            <div className="stagger-4 flex flex-col sm:flex-row gap-4">
              <Link href="/products" className="btn-primary text-base px-8 py-3.5">
                Explore Compounds
              </Link>
              <Link href="/blog" className="btn-outline text-base px-8 py-3.5">
                Read the Research
              </Link>
            </div>
          </div>

          {/* Right — decorative category pill cluster */}
          <div className="relative hidden lg:flex items-center justify-center h-80" aria-hidden="true">
            {/* Glow behind */}
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.18) 0%, transparent 70%)", borderRadius: "50%" }} />
            {/* Overlapping pills */}
            <span className="absolute text-sm font-semibold px-5 py-2.5 rounded-full text-emerald-400 bg-emerald-400/10 border border-emerald-400/20" style={{ top: "8%", left: "10%", transform: "rotate(-6deg)" }}>Recovery</span>
            <span className="absolute text-sm font-semibold px-5 py-2.5 rounded-full text-violet-400 bg-violet-400/10 border border-violet-400/20" style={{ top: "20%", right: "5%", transform: "rotate(4deg)" }}>Growth &amp; Performance</span>
            <span className="absolute text-sm font-semibold px-5 py-2.5 rounded-full text-rose-400 bg-rose-400/10 border border-rose-400/20" style={{ bottom: "25%", left: "5%", transform: "rotate(3deg)" }}>Weight Management</span>
            <span className="absolute text-sm font-semibold px-5 py-2.5 rounded-full text-cyan-400 bg-cyan-400/10 border border-cyan-400/20" style={{ bottom: "10%", right: "12%", transform: "rotate(-4deg)" }}>Wellness</span>
            {/* Center mark */}
            <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
              <span className="text-2xl">⬡</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STATS STRIP ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className={`glass p-6 text-center ${s.border}`}>
              <p className="font-display text-4xl font-black gradient-brand mb-1">{s.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. CATEGORY EXPLORER ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Browse by Goal</p>
          <h2 className="font-display text-4xl font-bold text-white">Find Your Protocol</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className={`glass vendor-card product-card p-6 flex flex-col gap-3 ${categoryBorderClass[cat.color]}`}
            >
              <span className="text-3xl">{cat.icon}</span>
              <p className={`font-display text-xl font-bold text-white`}>{cat.name}</p>
              <p className="text-xs text-slate-500">{cat.count} compound{cat.count !== 1 ? "s" : ""}</p>
              <p className={`text-sm font-semibold mt-auto ${categoryTextClass[cat.color]}`}>
                Explore →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 4. FEATURED PRODUCTS ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Featured</p>
            <h2 className="font-display text-4xl font-bold text-white">Top Research Compounds</h2>
          </div>
          <Link href="/products" className="btn-outline text-sm py-2 px-5 hidden sm:inline-block">
            View All
          </Link>
        </div>
        <p className="text-sm text-slate-500 mb-10">COA-verified sources only</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
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

      {/* ── 5. LATEST RESEARCH ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold mb-2">Research</p>
            <h2 className="font-display text-4xl font-bold text-white">Latest from the Lab</h2>
          </div>
          <Link href="/blog" className="btn-outline text-sm py-2 px-5 hidden sm:inline-block">
            View All Articles
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {latestPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
              <div className="glass product-card flex overflow-hidden">
                {/* Accent bar */}
                <div className={`w-1 flex-shrink-0 ${postAccentClass[post.category] ?? "bg-slate-600"}`} />
                {/* Content */}
                <div className="p-6 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${postPillClass[post.category] ?? "text-slate-400 bg-slate-400/10"}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-slate-500">{post.date}</span>
                    <span className="text-xs text-slate-500">{post.readTime}</span>
                  </div>
                  <p className="font-display text-xl font-bold text-white mb-2 leading-snug">{post.title}</p>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{post.excerpt}</p>
                  <span className="text-sm font-semibold text-cyan-400">Read article →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link href="/blog" className="btn-outline text-sm py-2.5 px-6">
            View All Articles
          </Link>
        </div>
      </section>

      {/* ── 6. VENDOR TRUST GRID ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Partner Network</p>
          <h2 className="font-display text-4xl font-bold text-white mb-2">Vetted Vendors</h2>
          <p className="text-slate-400 max-w-xl">Every partner holds a public Certificate of Analysis. Commission rates are fully disclosed.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorGrid.map((vendor) => (
            <div key={vendor.name} className="glass vendor-card p-6 flex flex-col gap-3">
              <p className="font-bold text-white">{vendor.name}</p>
              <p className="text-xs text-slate-500">
                Commission:{" "}
                <span className="text-cyan-400 font-semibold">{vendor.commission}</span>
              </p>
              <a
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="btn-outline text-xs py-2 px-4 mt-auto self-start"
              >
                Visit Vendor
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. FINAL CTA BANNER ──────────────────────────────── */}
      <section className="banner-gradient py-24 px-6 text-center mt-8">
        <div className="max-w-3xl mx-auto">
          <h2
            className="font-display font-extrabold text-white mb-4 tracking-tight"
            style={{ fontSize: "clamp(1.875rem, 4vw, 3rem)" }}
          >
            Stop Guessing.<br />Start Researching.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Every compound on Aura Protocols links to a vendor with a public COA.
            No hidden affiliates, no unverified sources.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products" className="btn-primary text-base px-8 py-3.5">
              Explore the Catalog
            </Link>
            <Link href="/compare" className="btn-outline text-base px-8 py-3.5">
              Compare Vendors
            </Link>
          </div>

          {/* Trust signals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 max-w-2xl mx-auto text-left">
            {[
              { title: "COA Verified",       desc: "Third-party Certificates of Analysis for every vendor." },
              { title: "FTC Compliant",       desc: "Full affiliate disclosure on every page, always." },
              { title: "Independent Reviews", desc: "Editorial content is never influenced by commissions." },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 rounded-xl p-4">
                <p className="font-bold text-white text-sm mb-1">{item.title}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
