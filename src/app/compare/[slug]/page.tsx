import { notFound } from "next/navigation";
import Link from "next/link";
import { comparisons } from "@/data/comparisons";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) return {};
  const title = `${comp.vendorA} vs ${comp.vendorB} — Aura Protocols`;
  return {
    title,
    description: comp.intro,
    openGraph: {
      title,
      description: comp.intro,
      url: `https://shop.auraprotocols.com/compare/${comp.slug}`,
      images: [{ url: `/compare/${comp.slug}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: comp.intro,
      images: [`/compare/${comp.slug}/opengraph-image`],
    },
  };
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-5 h-2 rounded-sm ${i <= score ? "bg-cyan-400" : "bg-white/10"}`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400">{score}/5</span>
    </div>
  );
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comp = comparisons.find((c) => c.slug === slug);
  if (!comp) notFound();

  const winnerName = comp.winner === "A" ? comp.vendorA : comp.winner === "B" ? comp.vendorB : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: comp.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-10">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
        <span>/</span>
        <span className="text-slate-300">{comp.vendorA} vs {comp.vendorB}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-4 py-1.5 mb-4">
          Vendor Comparison
        </div>
        <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">{comp.headline}</h1>
        <p className="text-slate-400 leading-relaxed text-lg">{comp.intro}</p>
      </div>

      {/* Winner callout */}
      {winnerName && (
        <div className="glass p-6 mb-10 glow-cyan border-cyan-400/20">
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Our Verdict</p>
          <p className="text-xl font-bold text-white mb-2">
            Winner: <span className="gradient-brand">{winnerName}</span>
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">{comp.winnerReason}</p>
        </div>
      )}

      {/* Head-to-head hero */}
      <div className="grid grid-cols-2 gap-4 mb-12">
        {[
          { name: comp.vendorA, url: comp.vendorAUrl, commission: comp.vendorACommission, isWinner: comp.winner === "A" },
          { name: comp.vendorB, url: comp.vendorBUrl, commission: comp.vendorBCommission, isWinner: comp.winner === "B" },
        ].map((v) => (
          <div key={v.name} className={`glass p-6 text-center relative ${v.isWinner ? "border-cyan-400/30 glow-cyan" : ""}`}>
            {v.isWinner && (
              <span className="badge absolute -top-3 left-1/2 -translate-x-1/2">Top Pick</span>
            )}
            <p className="font-bold text-white text-lg mb-1">{v.name}</p>
            <p className="text-sm text-emerald-400 font-semibold mb-4">{v.commission} commission</p>
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={v.isWinner ? "btn-primary text-sm py-2 px-5 block" : "btn-outline text-sm py-2 px-5 block"}
            >
              Visit {v.name} →
            </a>
          </div>
        ))}
      </div>

      {/* Scoring table */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Category Breakdown</h2>
        <div className="glass overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b border-white/5 text-xs uppercase tracking-widest text-slate-500 font-semibold">
            <div className="col-span-2">Category</div>
            <div>{comp.vendorA}</div>
            <div>{comp.vendorB}</div>
          </div>
          {comp.scores.map((s, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-white/5 last:border-0 items-center">
              <div className="col-span-2">
                <p className="text-sm font-semibold text-white">{s.category}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.note}</p>
              </div>
              <ScoreBar score={s.vendorA} />
              <ScoreBar score={s.vendorB} />
            </div>
          ))}
        </div>
      </section>

      {/* Vendor deep dives */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {[
          {
            name: comp.vendorA,
            summary: comp.vendorASummary,
            pros: comp.vendorAPros,
            cons: comp.vendorACons,
            url: comp.vendorAUrl,
            commission: comp.vendorACommission,
            isWinner: comp.winner === "A",
          },
          {
            name: comp.vendorB,
            summary: comp.vendorBSummary,
            pros: comp.vendorBPros,
            cons: comp.vendorBCons,
            url: comp.vendorBUrl,
            commission: comp.vendorBCommission,
            isWinner: comp.winner === "B",
          },
        ].map((v) => (
          <div key={v.name} className="glass p-6 flex flex-col gap-4">
            <div>
              {v.isWinner && <span className="badge mb-2 inline-block">Top Pick</span>}
              <h3 className="text-xl font-bold text-white">{v.name}</h3>
              <p className="text-emerald-400 text-sm font-semibold">{v.commission} affiliate commission</p>
            </div>
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
              href={v.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={`mt-auto ${v.isWinner ? "btn-primary" : "btn-outline"} text-sm py-2.5 text-center`}
            >
              Visit {v.name} →
            </a>
          </div>
        ))}
      </section>

      {/* Verdict */}
      <section className="glass p-8 mb-12 glow-violet">
        <h2 className="text-2xl font-bold text-white mb-4">Bottom Line</h2>
        <p className="text-slate-300 leading-relaxed">{comp.verdict}</p>
      </section>

      {/* FAQ */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {comp.faq.map((item, i) => (
            <div key={i} className="glass p-5">
              <p className="font-semibold text-white mb-2">{item.q}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Affiliate disclosure */}
      <p className="text-xs text-slate-600 border-t border-white/5 pt-6 leading-relaxed">
        Affiliate Disclosure: This page contains affiliate links. Aura Protocols earns a commission when you purchase through these links at no additional cost to you. Our editorial assessments are independent and not influenced by commission rates.
      </p>
    </div>
  );
}
