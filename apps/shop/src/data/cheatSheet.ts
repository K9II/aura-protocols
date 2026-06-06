// Shared cheat-sheet reference data — single source of truth for both the
// on-site reference page (/cheat-sheet) and the printable PDF (/cheat-sheet/print).
// Keep this in sync with the per-compound detail in posts.ts
// ("peptide-protocol-cheat-sheet").

export type Row = [compound: string, dose: string, freq: string, route: string, fda?: boolean];

export const RECOVERY: Row[] = [
  ["BPC-157", "250–500 mcg/day", "Daily", "SubQ / oral"],
  ["TB-500", "5–10 mg load · 2–2.5 mg maint", "2×/wk → weekly", "SubQ / IM"],
  ["GHK-Cu", "1–2 mg/day", "Daily", "SubQ / topical"],
];

export const WEIGHT: Row[] = [
  ["Semaglutide", "0.25 mg → 2.4 mg", "Weekly", "SubQ", true],
  ["Retatrutide", "1 mg → up to 12 mg", "Weekly", "SubQ"],
  ["AOD-9604", "250–300 mcg/day", "Daily (AM fasted)", "SubQ"],
];

export const GROWTH: Row[] = [
  ["CJC-1295 (DAC)", "1–2 mg/week", "1–2×/week", "SubQ"],
  ["Ipamorelin", "100–300 mcg/dose", "2–3×/day (fasted)", "SubQ"],
  ["Sermorelin", "200–500 mcg/day", "Daily (pre-sleep)", "SubQ"],
  ["Tesamorelin", "1–2 mg/day", "Daily", "SubQ", true],
  ["IGF-1 LR3", "20–50 mcg/day", "Daily (post-train)", "SubQ / IM"],
];

export const WELLNESS: Row[] = [
  ["PT-141", "0.5–2 mg/dose", "As needed (1–4h before)", "SubQ", true],
  ["Epithalon", "5–10 mg/day", "10–20 days, 2×/yr", "SubQ / IV"],
  ["MOTS-c", "5–10 mg/week", "Weekly", "SubQ"],
  ["NAD+", "100–500 mg/dose", "2–3×/week", "SubQ / IV"],
];

export const STACKS: [string, string][] = [
  ["Recovery", "BPC-157 + TB-500 — tissue repair via two non-overlapping mechanisms (angiogenesis + actin)"],
  ["GH Optimization", "CJC-1295 + Ipamorelin — GHRH + GHSR dual-axis, synergistic GH pulse amplification"],
  ["Body Recomposition", "Semaglutide + CJC-1295/Ipamorelin — GLP-1 appetite suppression + GH-driven lipolysis"],
  ["Performance + Recovery", "Tesamorelin + BPC-157 — visceral fat reduction + localized tissue repair"],
];

export const TIMING: [string, string][] = [
  ["BPC-157", "Any time; split AM/PM if full dose"],
  ["TB-500", "Flexible; load 4–6 wks then maintain"],
  ["Semaglutide", "Same day weekly; escalate over 4–16 wks"],
  ["AOD-9604", "Fasted AM, 30+ min before food"],
  ["GH peptides", "Fasted, pre-sleep aligns with natural GH"],
  ["PT-141", "1–4 h before; lower nausea at 0.5–1 mg"],
  ["Epithalon", "Before bed; 10–20 day cycle 1–2×/yr"],
];

export const MECHANISMS: [string, string][] = [
  ["GLP-1 agonists", "Semaglutide, Retatrutide — appetite + insulin via gut-hormone mimicry"],
  ["GHRH analogues", "CJC-1295, Sermorelin, Tesamorelin — pituitary GH release via GHRH receptors"],
  ["GHSR agonists", "Ipamorelin — GH pulse amplitude via ghrelin receptors"],
  ["Melanocortin", "PT-141 — central arousal via MC3R/MC4R in hypothalamus"],
  ["GH fragment", "AOD-9604 — fat-specific lipolysis, no IGF-1/glucose effect"],
  ["Actin regulator", "TB-500 — cell migration + new vessel formation at injury sites"],
  ["Tetrapeptide", "Epithalon — telomerase activation + pineal melatonin support"],
  ["Mitokine", "MOTS-c — AMPK activation, mitochondrial glucose/lipid regulation"],
  ["Copper peptide", "GHK-Cu — copper delivery, collagen/elastin synthesis, tissue remodeling"],
  ["IGF-1 analogue", "IGF-1 LR3 — IGF-1R activation, muscle protein synthesis, extended half-life"],
  ["Coenzyme", "NAD+ — mitochondrial energy, sirtuin/PARP DNA repair (cofactor, not a peptide)"],
];

export const RED_FLAGS = [
  "No third-party lab — in-house testing only",
  "COA older than 18 months",
  "Purity not tied to a specific batch/lot number",
  "HPLC purity below 98%",
  "No mass spectrometry (MS) identity confirmation",
  "Lab not ISO 17025 accredited",
  'COA only available "on request" — not posted publicly',
];
