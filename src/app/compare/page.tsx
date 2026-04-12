import Link from "next/link";
import { comparisons } from "@/data/comparisons";

export const metadata = {
  title: "Peptide Vendor Comparisons — Aura Protocols",
  description:
    "Side-by-side comparisons of the top research peptide vendors. Find the best source for your research budget.",
};

export default function ComparePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold mb-2">Vendor Comparisons</p>
      <h1 className="text-4xl font-extrabold text-white mb-4">Compare Peptide Vendors</h1>
      <p className="text-slate-400 mb-12 leading-relaxed max-w-2xl">
        We independently compare the top research peptide suppliers across purity, pricing, catalog depth, and affiliate commission — so you can choose with confidence.
      </p>

      <div className="space-y-5">
        {comparisons.map((comp) => {
          const winnerName =
            comp.winner === "A" ? comp.vendorA : comp.winner === "B" ? comp.vendorB : "Tie";
          return (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="glass product-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 block"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-white">{comp.vendorA}</span>
                  <span className="text-xs text-slate-500 font-semibold">vs</span>
                  <span className="text-sm font-bold text-white">{comp.vendorB}</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{comp.intro}</p>
                <p className="text-xs text-cyan-400 font-semibold mt-3">Read comparison →</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Winner</p>
                <span className="badge">{winnerName}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
