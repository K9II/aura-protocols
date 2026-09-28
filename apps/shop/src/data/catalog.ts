// Aura's own retail catalog. Replaces the affiliate-era products.ts.
// RELATIVE IMPORTS ONLY — this file is reachable from next.config.ts
// (via lib/redirects.ts) and the config transpile can't resolve "@/".

export const CHEMICAL_CLASSES = [
  "Incretin & Amylin Analogs",
  "GH-Axis Peptides",
  "Peptide Fragments",
  "Mitochondrial & Metabolic",
  "Short Peptides & Neuropeptides",
  "Cofactors & Conjugates",
  "Blends",
] as const;
export type ChemicalClass = (typeof CHEMICAL_CLASSES)[number];

export type StockState = "in" | "low" | "out";

export type Variant = {
  id: string;          // stable, e.g. "10mg"
  strength: string;    // display, e.g. "10 mg"
  priceUsd: number;
  stock: StockState;
};

export type PackDiscount = { qty: number; pct: number };

export type Lot = {
  lot: string;
  purityPct: number;
  method: "HPLC" | "HPLC+MS";
  testedOn: string;    // ISO date
  coaFile: string;     // public path, "" if the certificate file isn't uploaded yet
};
export type PendingLot = { pending: true };

export type Identity = {
  cas?: string;
  formula?: string;
  molecularWeight?: string;   // "1419.5 g/mol"
  sequence?: string;
  source?: string;            // primary-source URL for the values above
};

export type Compound = {
  slug: string;
  name: string;               // scientific / composition name only
  chemicalClass: ChemicalClass;
  identity: Identity;
  components?: string[];      // blends: component slugs
  form: string;
  storage: string;
  vialMl: number;
  variants: Variant[];
  packDiscounts: PackDiscount[];
  currentLot: Lot | PendingLot;
  featured?: boolean;
  // true while prices/strengths/lot are pre-sourcing placeholders.
  // The release check (tests/release) fails if any compound still has it.
  placeholderData?: boolean;
};

export const compounds: Compound[] = [];
