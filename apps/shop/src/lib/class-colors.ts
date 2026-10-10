// One muted colour per chemical class (approved 2026-10-10, "C + B" direction).
// Used for the card's class dash and name, the vial label hairlines, the
// monograph placard's top edge and the category pill squares. Never for
// buttons, prices or body text. Each passes 4.5:1 on paper (#EDE9E0).
import type { ChemicalClass } from "../data/catalog";

export const CLASS_COLOR: Record<ChemicalClass, string> = {
  "Incretin & Amylin Analogs": "#33467A",       // indigo
  "GH-Axis Peptides": "#7E5B1C",                // ochre (darkened from #8A6420 for 4.5:1 on paper)
  "Peptide Fragments": "#A32B1F",               // specimen
  "Mitochondrial & Metabolic": "#2F6656",       // verdigris
  "Short Peptides & Neuropeptides": "#6A3657",  // plum
  "Cofactors & Conjugates": "#8C4A2B",          // umber
  "Blends": "#4B5560",                          // slate
};

// The short name on a monograph placard: "Mitochondrial & Metabolic" → "Mitochondrial".
export function classShortName(cls: ChemicalClass): string {
  if (cls === "Short Peptides & Neuropeptides") return "Neuropeptides";
  return cls.split(" & ")[0];
}
