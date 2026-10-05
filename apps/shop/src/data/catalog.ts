// Aura's own retail catalog. Replaces the affiliate-era products.ts.
// RELATIVE IMPORTS ONLY — this file is reachable from next.config.ts
// (via lib/redirects.ts) and the config transpile can't resolve "@/".
import { IDENTITY } from "./catalog-identity";
import { DESCRIPTIONS } from "./catalog-descriptions";
import type { CatalogEntry, LiveCompound, LiveVariant, PackDiscount } from "./catalog-types";
export type { Lot, PendingLot, StockState, PackDiscount, Identity, PublicLot, CatalogEntry } from "./catalog-types";

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

// The storefront renders the LIVE shapes (content + Aura Store, lib/catalog-merge.ts).
export type Compound = LiveCompound<ChemicalClass>;
export type Variant = LiveVariant;

// Packs of 2, 5 or 10 vials; no single vial (2026-10-01 decision, spec D8).
const STD_PACKS: PackDiscount[] = [
  { qty: 2, pct: 5 },
  { qty: 5, pct: 10 },
  { qty: 10, pct: 20 },
];
const LYO = "Lyophilized powder";
const COLD = "−20 °C, desiccated, protected from light";

// Content only. Prices, visibility, lots and stock live in Aura Store
// (supabase/catalog-ops.sql) and are edited in /admin/catalog.
function entry(
  slug: string, name: string, chemicalClass: ChemicalClass,
  strengths: string[], extra: Partial<CatalogEntry<ChemicalClass>> = {},
): CatalogEntry<ChemicalClass> {
  return {
    slug, name, chemicalClass,
    identity: IDENTITY[slug] ?? {},
    description: DESCRIPTIONS[slug]?.text,
    descriptionSource: DESCRIPTIONS[slug]?.source,
    form: LYO, storage: COLD, vialMl: 3,
    variants: strengths.map((s) => ({ id: s.replace(/\s+/g, "").toLowerCase(), strength: s })),
    packDiscounts: STD_PACKS,
    ...extra,
  };
}

export const catalogContent: CatalogEntry<ChemicalClass>[] = [
  // Incretin & Amylin Analogs — hidden in Aura Store (catalog_products.shown =
  // false) pending written payment-processor approval: FDA treats "research
  // use" semaglutide/tirzepatide/retatrutide as falsely labeled, which
  // Stripe's prohibited list covers (2026-09-28 decision).
  entry("semaglutide", "Semaglutide", "Incretin & Amylin Analogs", ["10 mg"]),
  entry("tirzepatide", "Tirzepatide", "Incretin & Amylin Analogs", ["10 mg", "20 mg"]),
  entry("retatrutide", "Retatrutide", "Incretin & Amylin Analogs", ["10 mg", "20 mg"]),
  entry("cagrilintide", "Cagrilintide", "Incretin & Amylin Analogs", ["10 mg"]),
  entry("cagrisema", "Cagrilintide / Semaglutide", "Incretin & Amylin Analogs", ["10 mg"], { components: ["cagrilintide", "semaglutide"] }),
  entry("retatrutide-cagrilintide", "Retatrutide / Cagrilintide", "Incretin & Amylin Analogs", ["10 mg"], { components: ["retatrutide", "cagrilintide"] }),
  // GH-Axis Peptides
  entry("cjc-1295-ipamorelin", "CJC-1295 / Ipamorelin", "GH-Axis Peptides", ["10 mg"], { components: [] }),
  entry("sermorelin", "Sermorelin", "GH-Axis Peptides", ["10 mg"]),
  entry("tesamorelin", "Tesamorelin", "GH-Axis Peptides", ["10 mg"]),
  entry("igf-1-lr3", "IGF-1 LR3", "GH-Axis Peptides", ["1 mg"]),
  // Peptide Fragments
  entry("bpc-157", "BPC-157", "Peptide Fragments", ["10 mg"], { featured: true }),
  entry("tb-500", "TB-500", "Peptide Fragments", ["10 mg"]),
  entry("kpv", "KPV", "Peptide Fragments", ["10 mg"]),
  entry("aod-9604", "AOD-9604", "Peptide Fragments", ["10 mg"]),
  // Mitochondrial & Metabolic
  entry("ss-31", "SS-31 (Elamipretide)", "Mitochondrial & Metabolic", ["10 mg", "50 mg"]),
  entry("mots-c", "MOTS-c", "Mitochondrial & Metabolic", ["10 mg"], { featured: true }),
  entry("slu-pp-332", "SLU-PP-332", "Mitochondrial & Metabolic", ["250 mcg"]),
  // Short Peptides & Neuropeptides
  entry("epithalon", "Epithalon", "Short Peptides & Neuropeptides", ["10 mg"]),
  entry("pinealon", "Pinealon", "Short Peptides & Neuropeptides", ["10 mg"]),
  entry("dsip", "DSIP", "Short Peptides & Neuropeptides", ["5 mg"]),
  entry("pt-141", "PT-141 (Bremelanotide)", "Short Peptides & Neuropeptides", ["10 mg"]),
  // Cofactors & Conjugates
  entry("ghk-cu", "GHK-Cu", "Cofactors & Conjugates", ["50 mg"], { featured: true }),
  entry("nad-plus", "NAD+", "Cofactors & Conjugates", ["500 mg"], { featured: true }),
  entry("glutathione", "Glutathione", "Cofactors & Conjugates", ["600 mg"]),
  // Blends (renamed by composition; old slugs 301 in lib/redirects.ts)
  entry("bpc-157-tb-500-blend", "BPC-157 / TB-500", "Blends", ["10 mg"], { components: ["bpc-157", "tb-500"] }),
  entry("bpc-157-tb-500-ghk-cu", "BPC-157 / TB-500 / GHK-Cu", "Blends", ["70 mg"], { components: ["bpc-157", "tb-500", "ghk-cu"] }),
  entry("bpc-157-tb-500-ghk-cu-kpv", "BPC-157 / TB-500 / GHK-Cu / KPV", "Blends", ["80 mg"], { components: ["bpc-157", "tb-500", "ghk-cu", "kpv"] }),
];
