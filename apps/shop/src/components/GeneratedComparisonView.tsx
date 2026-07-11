import Link from "next/link";
import { vendorProfiles } from "@/data/vendorProfiles";
import { goUrl } from "@/lib/affiliate";
import type { VendorPair } from "@/lib/vendorPairs";
import EngineCTACard from "@/components/EngineCTACard";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-5 h-2 rounded-sm ${i <= score ? "bg-cyan-400" : "bg-white/10"}`} />
        ))}
      </div>
      <span className="text-xs text-slate-400">{score}/5</span>
    </div>
  );
}

export default function GeneratedComparisonView({ pair }: { pair: VendorPair }) {
  const profileA = vendorProfiles.find((v) => v.vendor === pair.vendorA);
  const profileB = vendorProfiles.find((v) => v.vendor === pair.vendorB);
  if (!profileA || !profileB) return null;

  const rows: [string, "catalogBreadth" | "shippingSpeed" | "coaPractices"][] = [
    ["Catalog Breadth", "catalogBreadth"],
    ["Shipping Speed", "shippingSpeed"],
    ["COA Practices", "coaPractices"],
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
        <span>/</span>
        <span className="text-slate-300">{pair.vendorA} vs {pair.vendorB}</span>
      </nav>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-4 py-1.5 mb-4">
          Vendor Comparison
        </div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
          {pair.vendorA} vs {pair.vendorB}
        </h1>
        <p className="text-slate-400 leading-relaxed text-lg">
          Both vendors are independently vetted and carry{" "}
          {pair.sharedProducts.length === 1
            ? "one shared compound"
            : `${pair.sharedProducts.length} shared compounds`}{" "}
          on Aura Protocols: {pair.sharedProducts.map((p) => p.name).join(", ")}.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Category Breakdown</h2>
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 text-xs uppercase tracking-widest text-slate-500 font-semibold">
                <div className="col-span-2">Category</div>
                <div>{pair.vendorA}</div>
                <div>{pair.vendorB}</div>
              </div>
              {rows.map(([label, key]) => (
                <div key={key} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center">
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-white">{label}</p>
                  </div>
                  <ScoreBar score={profileA.scores[key]} />
                  <ScoreBar score={profileB.scores[key]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[profileA, profileB].map((v) => (
          <div key={v.vendor} className="glass p-6 flex flex-col gap-4">
            <h3 className="text-xl font-bold text-white">{v.vendor}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{v.summary}</p>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold mb-2">Pros</p>
              <ul className="space-y-1.5">
                {v.pros.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">+</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-rose-400 font-semibold mb-2">Cons</p>
              <ul className="space-y-1.5">
                {v.cons.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-rose-400 mt-0.5 flex-shrink-0">−</span> {c}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href={goUrl(v.vendor)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-auto btn-outline text-sm py-2.5 text-center"
            >
              Visit {v.vendor} →
            </a>
          </div>
        ))}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">Shared Compounds</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {pair.sharedProducts.map((p) => (
            <Link key={p.slug} href={`/products/${p.slug}`} className="glass product-card p-4 text-sm text-slate-300 hover:text-white">
              {p.name} →
            </Link>
          ))}
        </div>
      </section>

      <EngineCTACard />

      <p className="text-xs text-slate-600 border-t border-white/5 pt-6 mt-12 leading-relaxed">
        Affiliate Disclosure: This page contains affiliate links. Aura Protocols earns a commission when you purchase through these links at no additional cost to you. Vendor comparisons above reflect catalog breadth, shipping, and COA practices only — not price.
      </p>
    </div>
  );
}
