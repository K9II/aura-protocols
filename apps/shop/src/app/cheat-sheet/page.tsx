import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import {
  type Row,
  RECOVERY,
  WEIGHT,
  GROWTH,
  WELLNESS,
  STACKS,
  TIMING,
  MECHANISMS,
  RED_FLAGS,
} from "@/data/cheatSheet";

export const metadata: Metadata = {
  title: "Peptide Protocol Cheat Sheet | Aura Protocols",
  description:
    "Quick-reference table for all 14 research peptides on Aura Protocols — dose, frequency, route, mechanism, and research status in one scannable page.",
  robots: { index: false, follow: false },
};

function QuickTable({ title, accent, rows }: { title: string; accent: string; rows: Row[] }) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <h3 className={`px-4 py-3 text-xs font-bold uppercase tracking-widest ${accent}`}>{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-white/5 text-[10px] uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 text-left font-semibold">Compound</th>
            <th className="px-4 py-2 text-left font-semibold">Research Dose</th>
            <th className="hidden px-4 py-2 text-left font-semibold sm:table-cell">Frequency</th>
            <th className="hidden px-4 py-2 text-left font-semibold sm:table-cell">Route</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-2.5 font-semibold text-white">
                {r[0]}
                {r[4] && (
                  <span className="ml-1.5 rounded bg-cyan-400/15 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                    FDA
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-300">{r[1]}</td>
              <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">{r[2]}</td>
              <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CheatSheetPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* Hero */}
      <p className="text-sm font-semibold uppercase tracking-widest text-cyan-300">
        Quick-reference guide
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        Peptide Protocol Cheat Sheet
      </h1>
      <p className="mt-4 text-lg text-slate-300">
        All 14 research compounds on Aura Protocols — dose, frequency, route, mechanism, and research
        status — in one scannable reference.
      </p>
      <p className="mt-4 text-xs text-slate-500">Research reference only. Not medical advice.</p>

      <div className="mt-6">
        <Link
          href="/cheat-sheet/print"
          className="btn-outline inline-flex text-sm"
        >
          Printable one-page PDF →
        </Link>
      </div>

      {/* Quick-reference tables */}
      <section className="mt-12 space-y-6">
        <QuickTable title="Recovery & Tissue Repair" accent="text-emerald-300" rows={RECOVERY} />
        <QuickTable title="Weight Management & Metabolic" accent="text-rose-300" rows={WEIGHT} />
        <QuickTable title="Growth & Performance" accent="text-violet-300" rows={GROWTH} />
        <QuickTable title="Wellness & Longevity" accent="text-cyan-300" rows={WELLNESS} />
      </section>

      {/* Mechanism quick reference */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-white">Mechanism Quick Reference</h2>
        <ul className="mt-4 space-y-2">
          {MECHANISMS.map(([k, v]) => (
            <li key={k} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
              <span>
                <span className="font-semibold text-white">{k}</span> — {v}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Common stacks */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-white">Common Research Stacks</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STACKS.map(([name, desc]) => (
            <div key={name} className="glass rounded-xl p-4">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timing notes */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-white">Timing Notes</h2>
        <div className="glass mt-4 overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <tbody>
              {TIMING.map(([k, v]) => (
                <tr key={k} className="border-b border-white/5 last:border-0">
                  <td className="w-32 px-4 py-2.5 font-semibold text-white">{k}</td>
                  <td className="px-4 py-2.5 text-slate-300">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* COA red flags */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-white">COA Red Flags — Walk Away</h2>
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-5">
          <ul className="space-y-1.5 text-sm text-slate-300">
            {RED_FLAGS.map((f) => (
              <li key={f}>
                <span className="text-rose-400">✗</span> {f}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-emerald-300">
            ✓ Green light: ≥99% HPLC + MS confirmation + accredited lab + batch-specific + dated
            within 12 months
          </p>
        </div>
      </section>

      {/* Email capture */}
      <section className="mt-16 border-t border-white/5 pt-10">
        <h2 className="font-display text-2xl font-bold text-white">
          Get the printable PDF + your starting protocol
        </h2>
        <p className="mt-3 text-slate-300">
          Tell us your #1 goal and we&apos;ll send a research-backed starting point — doses, timing,
          and COA-verified sources — straight to your inbox.
        </p>
        <div className="mt-8">
          <EmailCapture />
        </div>
      </section>
    </main>
  );
}
