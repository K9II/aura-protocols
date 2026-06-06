import type { Metadata } from "next";
import AuraMark from "@/components/AuraMark";
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
  title: "Peptide Protocol Cheat Sheet — Print",
  description: "Printable one-page peptide research reference.",
  robots: { index: false, follow: false },
};

// Self-contained print deliverable. Reference data is shared from
// @/data/cheatSheet so the printable sheet and the on-site /cheat-sheet page
// never drift. Light/document styling (not the dark site theme) is correct for
// a PDF handed to subscribers. Type and spacing are scaled to fill a single
// US-letter page (0.35in margins) — see /cheat-sheet/print measurements.

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mb-2">
      <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">{title}</h3>
      <table className="w-full border-collapse text-[10.5px] leading-tight text-slate-700">
        <thead>
          <tr className="border-b border-slate-300 text-[8.5px] uppercase tracking-wide text-slate-400">
            <th className="py-0.5 text-left font-semibold">Compound</th>
            <th className="py-0.5 text-left font-semibold">Research Dose</th>
            <th className="py-0.5 text-left font-semibold">Frequency</th>
            <th className="py-0.5 text-left font-semibold">Route</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-slate-100">
              <td className="py-0.5 pr-1.5 font-semibold text-slate-900">
                {r[0]}
                {r[4] && <span className="ml-1 rounded bg-cyan-100 px-1 text-[7px] font-bold text-cyan-700">FDA</span>}
              </td>
              <td className="py-0.5 pr-1.5">{r[1]}</td>
              <td className="py-0.5 pr-1.5">{r[2]}</td>
              <td className="py-0.5">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CheatSheetPrintPage() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: letter; margin: 0.35in; }
          body > *:not(main) { display: none !important; }
          html, body { background: #fff !important; }
          main { flex: 0 0 auto !important; }
          .cheat-sheet { margin: 0 !important; box-shadow: none !important; }
        }
        .cheat-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="print:hidden bg-[#0d1117] px-6 py-3 text-center text-sm text-slate-300">
        Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Ctrl/Cmd + P</kbd> → “Save as PDF”. In print options enable
        “Background graphics” for the accent colors.
      </div>

      <div className="cheat-sheet mx-auto my-6 max-w-[1000px] bg-white px-8 py-6 text-slate-900 shadow-xl print:my-0 print:shadow-none">
        {/* Header */}
        <header className="flex items-end justify-between border-b-2 border-cyan-400 pb-3">
          <div className="flex items-center gap-3">
            <AuraMark size={36} mode="static" />
            <span className="font-display text-xl font-bold tracking-tight">
              Aura <span className="text-cyan-600">Protocols</span>
            </span>
          </div>
          <div className="text-right">
            <h1 className="font-display text-lg font-bold leading-tight">The Peptide Protocol Cheat Sheet</h1>
            <p className="text-[9px] text-slate-500">Research reference only — not medical advice · All compounds for laboratory use · shop.auraprotocols.com</p>
          </div>
        </header>

        {/* Two-column body */}
        <div className="mt-3 grid grid-cols-2 gap-6">
          {/* Left column */}
          <div>
            <Table title="Recovery & Tissue Repair" rows={RECOVERY} />
            <Table title="Weight Management & Metabolic" rows={WEIGHT} />

            <div className="mb-2 rounded border border-rose-200 bg-rose-50 p-2.5">
              <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-700">⚠ COA Red Flags — Walk Away</h3>
              <ul className="space-y-1 text-[10px] leading-tight text-slate-700">
                {RED_FLAGS.map((f) => (
                  <li key={f}>✗ {f}</li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] font-semibold leading-tight text-emerald-700">
                ✓ Green light: ≥99% HPLC + MS confirmation + accredited lab + batch-specific + dated within 12 months
              </p>
            </div>

            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">Common Research Stacks</h3>
            <div className="grid grid-cols-2 gap-2">
              {STACKS.map(([name, desc]) => (
                <div key={name} className="rounded border border-slate-200 p-2">
                  <p className="text-[10px] font-bold text-slate-900">{name}</p>
                  <p className="text-[9px] leading-tight text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div>
            <Table title="Growth & Performance" rows={GROWTH} />
            <Table title="Wellness & Longevity" rows={WELLNESS} />

            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">Timing Notes</h3>
            <table className="mb-2 w-full border-collapse text-[10px] leading-tight text-slate-700">
              <tbody>
                {TIMING.map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className="w-[92px] py-0.5 pr-1.5 font-semibold text-slate-900">{k}</td>
                    <td className="py-0.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700">Mechanism Quick Reference</h3>
            <ul className="space-y-1 text-[10px] leading-tight text-slate-700">
              {MECHANISMS.map(([k, v]) => (
                <li key={k}>
                  <span className="font-semibold text-slate-900">{k}</span> ({v})
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-3 border-t border-slate-200 pt-2 text-[8.5px] leading-tight text-slate-500">
          <p>
            <span className="font-semibold">FDA</span> = an approved formulation exists for a specific indication under medical supervision;
            research-grade compounds are not equivalent to pharmaceutical-grade.
          </p>
          <p className="mt-0.5">
            Affiliate Disclosure: Aura Protocols earns commissions from qualifying purchases via affiliate links — this does not affect editorial
            independence. For research purposes only; not intended to diagnose, treat, cure, or prevent any disease.
          </p>
          <p className="mt-0.5 font-semibold text-slate-600">© 2026 Aura Protocols LLC · shop.auraprotocols.com</p>
        </footer>
      </div>
    </>
  );
}
