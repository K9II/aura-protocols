// Aura's own retail catalog. Replaces the affiliate-era products.ts.
// RELATIVE IMPORTS ONLY — this file is reachable from next.config.ts
// (via lib/redirects.ts) and the config transpile can't resolve "@/".
import { IDENTITY } from "./catalog-identity";
import { DESCRIPTIONS } from "./catalog-descriptions";

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
  description?: string;        // identity-only, from catalog-descriptions.ts (required for listed products — tested)
  descriptionSource?: string;  // primary source for the description's facts
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
  // true = kept in the data but excluded from every storefront surface
  // (listings, product pages, search, sitemap, COA lookup) via `compounds`.
  unlisted?: boolean;
};

// Packs of 2, 5 or 10 vials; no single vial (2026-10-01 decision, spec D8).
const STD_PACKS: PackDiscount[] = [
  { qty: 2, pct: 5 },
  { qty: 5, pct: 10 },
  { qty: 10, pct: 20 },
];
const LYO = "Lyophilized powder";
const COLD = "−20 °C, desiccated, protected from light";

// Pre-sourcing placeholders: one variant per listed strength, flat price,
// pending lot. Replaced by the sourcing/fulfillment spec.
function placeholder(
  slug: string, name: string, chemicalClass: ChemicalClass,
  strengths: string[], priceUsd: number, extra: Partial<Compound> = {},
): Compound {
  return {
    slug, name, chemicalClass,
    identity: IDENTITY[slug] ?? {},
    description: DESCRIPTIONS[slug]?.text,
    descriptionSource: DESCRIPTIONS[slug]?.source,
    form: LYO, storage: COLD, vialMl: 3,
    variants: strengths.map((s, i) => ({
      id: s.replace(/\s+/g, "").toLowerCase(),
      strength: s,
      priceUsd: priceUsd + i * 30,
      stock: "in" as const,
    })),
    packDiscounts: STD_PACKS,
    // No lot is tested yet — never show an invented lot, purity or
    // "COA on file" before a real certificate exists.
    currentLot: { pending: true },
    placeholderData: true,
    ...extra,
  };
}

export const allCompounds: Compound[] = [
  // Incretin & Amylin Analogs — UNLISTED pending written payment-processor
  // approval: FDA treats "research use" semaglutide/tirzepatide/retatrutide as
  // falsely labeled, which Stripe's prohibited list covers (2026-09-28 decision).
  placeholder("semaglutide", "Semaglutide", "Incretin & Amylin Analogs", ["5 mg", "10 mg"], 89, { unlisted: true }),
  placeholder("tirzepatide", "Tirzepatide", "Incretin & Amylin Analogs", ["10 mg", "20 mg"], 119, { unlisted: true }),
  placeholder("retatrutide", "Retatrutide", "Incretin & Amylin Analogs", ["10 mg", "20 mg"], 139, { unlisted: true }),
  placeholder("cagrilintide", "Cagrilintide", "Incretin & Amylin Analogs", ["5 mg", "10 mg"], 99, { unlisted: true }),
  placeholder("cagrisema", "Cagrilintide / Semaglutide", "Incretin & Amylin Analogs", ["10 mg"], 159, { components: ["cagrilintide", "semaglutide"], unlisted: true }),
  placeholder("retatrutide-cagrilintide", "Retatrutide / Cagrilintide", "Incretin & Amylin Analogs", ["10 mg"], 179, { components: ["retatrutide", "cagrilintide"], unlisted: true }),
  // GH-Axis Peptides
  placeholder("cjc-1295-ipamorelin", "CJC-1295 / Ipamorelin", "GH-Axis Peptides", ["10 mg"], 89, { components: [] }),
  placeholder("sermorelin", "Sermorelin", "GH-Axis Peptides", ["5 mg"], 59),
  placeholder("tesamorelin", "Tesamorelin", "GH-Axis Peptides", ["5 mg", "10 mg"], 79),
  placeholder("igf-1-lr3", "IGF-1 LR3", "GH-Axis Peptides", ["1 mg"], 89),
  // Peptide Fragments
  placeholder("bpc-157", "BPC-157", "Peptide Fragments", ["5 mg", "10 mg"], 49, { featured: true }),
  placeholder("tb-500", "TB-500", "Peptide Fragments", ["5 mg", "10 mg"], 59),
  placeholder("kpv", "KPV", "Peptide Fragments", ["10 mg"], 55),
  placeholder("aod-9604", "AOD-9604", "Peptide Fragments", ["5 mg"], 59),
  // Mitochondrial & Metabolic
  placeholder("ss-31", "SS-31 (Elamipretide)", "Mitochondrial & Metabolic", ["10 mg", "50 mg"], 79),
  placeholder("mots-c", "MOTS-c", "Mitochondrial & Metabolic", ["10 mg"], 69, { featured: true }),
  placeholder("slu-pp-332", "SLU-PP-332", "Mitochondrial & Metabolic", ["250 mcg"], 79),
  // Short Peptides & Neuropeptides
  placeholder("epithalon", "Epithalon", "Short Peptides & Neuropeptides", ["10 mg"], 49),
  placeholder("pinealon", "Pinealon", "Short Peptides & Neuropeptides", ["10 mg"], 59),
  placeholder("dsip", "DSIP", "Short Peptides & Neuropeptides", ["5 mg"], 49),
  placeholder("pt-141", "PT-141 (Bremelanotide)", "Short Peptides & Neuropeptides", ["10 mg"], 55),
  // Cofactors & Conjugates
  placeholder("ghk-cu", "GHK-Cu", "Cofactors & Conjugates", ["50 mg"], 59, { featured: true }),
  placeholder("nad-plus", "NAD+", "Cofactors & Conjugates", ["500 mg"], 89, { featured: true }),
  placeholder("glutathione", "Glutathione", "Cofactors & Conjugates", ["600 mg"], 69),
  // Blends (renamed by composition; old slugs 301 in lib/redirects.ts)
  placeholder("bpc-157-tb-500-blend", "BPC-157 / TB-500", "Blends", ["10 mg"], 99, { components: ["bpc-157", "tb-500"] }),
  placeholder("bpc-157-tb-500-ghk-cu", "BPC-157 / TB-500 / GHK-Cu", "Blends", ["70 mg"], 159, { components: ["bpc-157", "tb-500", "ghk-cu"] }),
  placeholder("bpc-157-tb-500-ghk-cu-kpv", "BPC-157 / TB-500 / GHK-Cu / KPV", "Blends", ["80 mg"], 189, { components: ["bpc-157", "tb-500", "ghk-cu", "kpv"] }),
];

// Everything the storefront shows. Use `allCompounds` only for data integrity.
export const compounds: Compound[] = allCompounds.filter((c) => !c.unlisted);
