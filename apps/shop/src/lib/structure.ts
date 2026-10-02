import { STRUCTURES, STRUCTURE_PANELS, type Structure, type StructureSource } from "../data/catalog-structure";

export type { Structure };

// Element colours on the paper/ink palette (spec §3b).
export const ELEMENT_COLORS: Record<string, string> = {
  C: "#1C1A15", O: "#A32B1F", N: "#6E6656", S: "#B08A2E", P: "#7A5C3E", Cu: "#B87333",
};
export const ELEMENT_NAMES: Record<string, string> = {
  C: "Carbon", O: "Oxygen", N: "Nitrogen", S: "Sulfur", P: "Phosphorus", Cu: "Copper",
};
const LEGEND_ORDER = ["C", "O", "N", "S", "P", "Cu"];

export function structurePanels(slug: string): Structure[] {
  return (STRUCTURE_PANELS[slug] ?? []).map((id) => STRUCTURES[id]).filter(Boolean);
}

export function structureCaption(source: StructureSource): string {
  if (source === "crystal-modeled") return "Modeled from the published crystal structure (1984).";
  if (source === "predicted") return "Predicted structure (ESMFold) — one of many shapes this protein can take.";
  return "Computed model — one of many shapes this molecule can take.";
}

export function legendElements(panels: Structure[]): string[] {
  const present = new Set(panels.flatMap((p) => p.elements));
  return LEGEND_ORDER.filter((e) => present.has(e));
}
