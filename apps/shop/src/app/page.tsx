import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import ProtocolSelector from "@/components/ProtocolSelector";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Aura Protocols — Research Peptide Protocols, Independently Reviewed",
  description:
    "Third-party COA verification required. Zero pay-to-play. Connect your wearable and get a protocol engineered to your biometric data.",
  alternates: { canonical: "/" },
};

const latestPosts = posts.slice(0, 3);

const trustChips = [
  "Batch COA required",
  "0 pay-to-play",
  "Manually reviewed",
  "Biometric-synced protocols",
];

export default function HomePage() {
  const tickerItems = products.map((p) => ({
    name: p.name,
    vendor: p.vendors[0].vendor,
  }));

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:pt-24">
        <div className="flex flex-col lg:flex-row lg:items-center gap-12">

          {/* Left column */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-4">
              Independent · COA-Verified · Protocol-Engineered
            </p>
            <h1 className="font-display text-4xl font-bold text-white md:text-5xl leading-tight mb-5">
              Your biology is unique.<br />
              Your protocol should match it.
            </h1>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-xl">
              Third-party, batch-specific COAs required from every vendor we list. Zero pay-to-play placements.
              Connect your wearable and the Engine engineers a protocol to your actual biometric data.
            </p>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 mb-8">
              {trustChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-white/[0.04] border border-white/10 rounded-full px-3 py-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                  {chip}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <a href="#protocols" className="btn-primary">
                Browse protocols →
              </a>
              <a href={ENGINE_URL} target="_blank" rel={EXTERNAL_REL} className="btn-outline">
                Connect a wearable →
              </a>
            </div>
          </div>

          {/* Right column — compound index ticker */}
          <div className="lg:w-72 xl:w-80 flex-shrink-0">
            <div className="glass rounded-2xl overflow-hidden border border-white/8">
              {/* Header */}
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Compound Index</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-display font-bold text-white">{products.length}</p>
                  <p className="text-xs text-slate-500">reviewed</p>
                </div>
              </div>

              {/* Scrolling ticker */}
              <div className="h-64 overflow-hidden relative">
                {/* Fade masks */}
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0d1117] to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0d1117] to-transparent z-10 pointer-events-none" />

                <div className="animate-scroll-up">
                  {/* Render twice for seamless loop */}
                  {[...tickerItems, ...tickerItems].map((item, i) => (
                    <div
                      key={i}
                      className="px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate">{item.vendor}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 flex-shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        COA ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/8">
                <p className="text-xs text-slate-600">Updated manually · Every vendor reviewed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol selector */}
      <section id="protocols" className="mx-auto max-w-6xl px-6 py-10">
        <ProtocolSelector />
      </section>

      {/* Latest posts */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-display text-4xl font-bold text-white">Latest from the library</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {latestPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-white/10 bg-[#0d1117] p-6 transition hover:border-cyan-400/40"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                {post.category}
              </p>
              <h3 className="font-display mt-2 text-xl font-bold text-white">{post.title}</h3>
              <p className="mt-3 line-clamp-3 text-slate-400">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Email */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <EmailCapture />
      </section>
    </>
  );
}
