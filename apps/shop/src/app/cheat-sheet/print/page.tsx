import type { Metadata } from "next";
import AuraMark from "@/components/AuraMark";

export const metadata: Metadata = {
  title: "Peptide Protocol Cheat Sheet — Print",
  description: "Printable one-page peptide research reference.",
  robots: { index: false, follow: false },
};

// Self-contained print deliverable. Content is intentionally hardcoded here so
// the printable sheet is decoupled from the blog renderer and stays a stable,
// one-page artifact. Light/document styling (not the dark site theme) is correct
// for a PDF handed to subscribers.

type Row = [compound: string, dose: string, freq: string, route: string, fda?: boolean];

const RECOVERY: Row[] = [
  ["BPC-157", "250–500 mcg/day", "Daily", "SubQ / oral"],
  ["TB-500", "5–10 mg load · 2–2.5 mg maint", "2×/wk → weekly", "SubQ / IM"],
];
const WEIGHT: Row[] = [
  ["Semaglutide", "0.25 mg → 2.4 mg", "Weekly", "SubQ", true],
  ["Retatrutide", "1 mg → up to 12 mg", "Weekly", "SubQ"],
  ["AOD-9604", "250–300 mcg/day", "Daily (AM fasted)", "SubQ"],
];
const GROWTH: Row[] = [
  ["CJC-1295 (DAC)", "1–2 mg/week", "1–2×/week", "SubQ"],
  ["Ipamorelin", "100–300 mcg/dose", "2–3×/day (fasted)", "SubQ"],
  ["Sermorelin", "200–500 mcg/day", "Daily (pre-sleep)", "SubQ"],
  ["Tesamorelin", "1–2 mg/day", "Daily", "SubQ", true],
];
const WELLNESS: Row[] = [
  ["PT-141", "0.5–2 mg/dose", "As needed (1–4h before)", "SubQ", true],
  ["Epithalon", "5–10 mg/day", "10–20 days, 2×/yr", "SubQ / IV"],
  ["MOTS-c", "5–10 mg/week", "Weekly", "SubQ"],
];

const STACKS: [string, string][] = [
  ["Recovery", "BPC-157 + TB-500 — tissue repair via two non-overlapping mechanisms (angiogenesis + actin)"],
  ["GH Optimization", "CJC-1295 + Ipamorelin — GHRH + GHSR dual-axis, synergistic GH pulse amplification"],
  ["Body Recomposition", "Semaglutide + CJC-1295/Ipamorelin — GLP-1 appetite suppression + GH-driven lipolysis"],
  ["Performance + Recovery", "Tesamorelin + BPC-157 — visceral fat reduction + localized tissue repair"],
];

const TIMING: [string, string][] = [
  ["BPC-157", "Any time; split AM/PM if full dose"],
  ["TB-500", "Flexible; load 4–6 wks then maintain"],
  ["Semaglutide", "Same day weekly; escalate over 4–16 wks"],
  ["AOD-9604", "Fasted AM, 30+ min before food"],
  ["GH peptides", "Fasted, pre-sleep aligns with natural GH"],
  ["PT-141", "1–4 h before; lower nausea at 0.5–1 mg"],
  ["Epithalon", "Before bed; 10–20 day cycle 1–2×/yr"],
];

const MECHANISMS: [string, string][] = [
  ["GLP-1 agonists", "Semaglutide, Retatrutide — appetite + insulin via gut-hormone mimicry"],
  ["GHRH analogues", "CJC-1295, Sermorelin, Tesamorelin — pituitary GH release via GHRH receptors"],
  ["GHSR agonists", "Ipamorelin — GH pulse amplitude via ghrelin receptors"],
  ["Melanocortin", "PT-141 — central arousal via MC3R/MC4R in hypothalamus"],
  ["GH fragment", "AOD-9604 — fat-specific lipolysis, no IGF-1/glucose effect"],
  ["Actin regulator", "TB-500 — cell migration + new vessel formation at injury sites"],
  ["Tetrapeptide", "Epithalon — telomerase activation + pineal melatonin support"],
  ["Mitokine", "MOTS-c — AMPK activation, mitochondrial glucose/lipid regulation"],
];

const RED_FLAGS = [
  "No third-party lab — in-house testing only",
  "COA older than 18 months",
  "Purity not tied to a specific batch/lot number",
  "HPLC purity below 98%",
  "No mass spectrometry (MS) identity confirmation",
  "Lab not ISO 17025 accredited",
  'COA only available "on request" — not posted publicly',
];

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="mb-2">
      <h3 className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-700">{title}</h3>
      <table className="w-full border-collapse text-[8.5px] leading-tight text-slate-700">
        <thead>
          <tr className="border-b border-slate-300 text-[7px] uppercase tracking-wide text-slate-400">
            <th className="py-0.5 text-left font-semibold">Compound</th>
            <th className="py-0.5 text-left font-semibold">Research Dose</th>
            <th className="py-0.5 text-left font-semibold">Frequency</th>
            <th className="py-0.5 text-left font-semibold">Route</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-b border-slate-100">
              <td className="py-0.5 pr-1 font-semibold text-slate-900">
                {r[0]}
                {r[4] && <span className="ml-1 rounded bg-cyan-100 px-1 text-[6px] font-bold text-cyan-700">FDA</span>}
              </td>
              <td className="py-0.5 pr-1">{r[1]}</td>
              <td className="py-0.5 pr-1">{r[2]}</td>
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
        <header className="flex items-end justify-between border-b-2 border-cyan-400 pb-2">
          <div className="flex items-center gap-2.5">
            <AuraMark size={30} mode="static" />
            <span className="font-display text-lg font-bold tracking-tight">
              Aura <span className="text-cyan-600">Protocols</span>
            </span>
          </div>
          <div className="text-right">
            <h1 className="font-display text-base font-bold leading-tight">The Peptide Protocol Cheat Sheet</h1>
            <p className="text-[8px] text-slate-500">Research reference only — not medical advice · All compounds for laboratory use · shop.auraprotocols.com</p>
          </div>
        </header>

        {/* Two-column body */}
        <div className="mt-3 grid grid-cols-2 gap-5">
          {/* Left column */}
          <div>
            <Table title="Recovery & Tissue Repair" rows={RECOVERY} />
            <Table title="Weight Management & Metabolic" rows={WEIGHT} />

            <div className="mb-2 rounded border border-rose-200 bg-rose-50 p-2">
              <h3 className="mb-1 text-[8px] font-bold uppercase tracking-widest text-rose-700">⚠ COA Red Flags — Walk Away</h3>
              <ul className="space-y-0.5 text-[8px] leading-tight text-slate-700">
                {RED_FLAGS.map((f) => (
                  <li key={f}>✗ {f}</li>
                ))}
              </ul>
              <p className="mt-1 text-[8px] font-semibold leading-tight text-emerald-700">
                ✓ Green light: ≥99% HPLC + MS confirmation + accredited lab + batch-specific + dated within 12 months
              </p>
            </div>

            <h3 className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-700">Common Research Stacks</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {STACKS.map(([name, desc]) => (
                <div key={name} className="rounded border border-slate-200 p-1.5">
                  <p className="text-[8px] font-bold text-slate-900">{name}</p>
                  <p className="text-[7.5px] leading-tight text-slate-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div>
            <Table title="Growth & Performance" rows={GROWTH} />
            <Table title="Wellness & Longevity" rows={WELLNESS} />

            <h3 className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-700">Timing Notes</h3>
            <table className="mb-2 w-full border-collapse text-[8px] leading-tight text-slate-700">
              <tbody>
                {TIMING.map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className="w-[78px] py-0.5 pr-1 font-semibold text-slate-900">{k}</td>
                    <td className="py-0.5">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mb-0.5 text-[8px] font-bold uppercase tracking-widest text-cyan-700">Mechanism Quick Reference</h3>
            <ul className="space-y-0.5 text-[8px] leading-tight text-slate-700">
              {MECHANISMS.map(([k, v]) => (
                <li key={k}>
                  <span className="font-semibold text-slate-900">{k}</span> ({v})
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-3 border-t border-slate-200 pt-1.5 text-[7px] leading-tight text-slate-500">
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
