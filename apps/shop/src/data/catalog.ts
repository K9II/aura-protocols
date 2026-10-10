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
// 10-pack 15% (was 20%, 2026-10-10): wholesale's first tier (25%) must be the better deal.
export const STD_PACKS: PackDiscount[] = [
  { qty: 2, pct: 5 },
  { qty: 5, pct: 10 },
  { qty: 10, pct: 15 },
];
const LYO = "Lyophilized powder";
const COLD = "−20 °C, desiccated, protected from light";

// Content only. Strengths, prices, visibility, lots and stock live in Aura
// Store (supabase/catalog-ops.sql) and are edited in /admin/catalog.
function entry(
  slug: string, name: string, chemicalClass: ChemicalClass,
  extra: Partial<CatalogEntry<ChemicalClass>> = {},
): CatalogEntry<ChemicalClass> {
  return {
    slug, name, chemicalClass,
    identity: IDENTITY[slug] ?? {},
    description: DESCRIPTIONS[slug]?.text,
    descriptionSource: DESCRIPTIONS[slug]?.source,
    form: LYO, storage: COLD, vialMl: 3,
    packDiscounts: STD_PACKS,
    ...extra,
  };
}

export const catalogContent: CatalogEntry<ChemicalClass>[] = [
  // Incretin & Amylin Analogs — shown in Aura Store since 2026-10-09 (AllayPay,
  // the primary processor, accepts GLP-1s). Stripe's prohibited list covers
  // "research use" semaglutide/tirzepatide/retatrutide, so these must never be
  // charged through Stripe.
  // APro designations lead on these three; the scientific name always shows alongside (2026-10-08).
  entry("semaglutide", "Semaglutide", "Incretin & Amylin Analogs", { designation: "APro-G1SM" }),
  entry("tirzepatide", "Tirzepatide", "Incretin & Amylin Analogs", { designation: "APro-G2TRZ" }),
  entry("retatrutide", "Retatrutide", "Incretin & Amylin Analogs", { designation: "APro-G3RT" }),
  entry("cagrilintide", "Cagrilintide", "Incretin & Amylin Analogs"),
  entry("cagrisema", "Cagrilintide / Semaglutide", "Incretin & Amylin Analogs", { components: ["cagrilintide", "semaglutide"] }),
  entry("retatrutide-cagrilintide", "Retatrutide / Cagrilintide", "Incretin & Amylin Analogs", { components: ["retatrutide", "cagrilintide"] }),
  // GH-Axis Peptides
  entry("cjc-1295-ipamorelin", "CJC-1295 / Ipamorelin", "GH-Axis Peptides", { components: [] }),
  entry("sermorelin", "Sermorelin", "GH-Axis Peptides"),
  entry("tesamorelin", "Tesamorelin", "GH-Axis Peptides"),
  entry("igf-1-lr3", "IGF-1 LR3", "GH-Axis Peptides"),
  // Peptide Fragments
  entry("bpc-157", "BPC-157", "Peptide Fragments", { featured: true }),
  entry("tb-500", "TB-500", "Peptide Fragments"),
  entry("kpv", "KPV", "Peptide Fragments"),
  entry("aod-9604", "AOD-9604", "Peptide Fragments"),
  // Mitochondrial & Metabolic
  entry("ss-31", "SS-31 (Elamipretide)", "Mitochondrial & Metabolic"),
  entry("mots-c", "MOTS-c", "Mitochondrial & Metabolic", { featured: true }),
  entry("slu-pp-332", "SLU-PP-332", "Mitochondrial & Metabolic"),
  // Short Peptides & Neuropeptides
  entry("epithalon", "Epithalon", "Short Peptides & Neuropeptides"),
  entry("pinealon", "Pinealon", "Short Peptides & Neuropeptides"),
  entry("dsip", "DSIP", "Short Peptides & Neuropeptides"),
  entry("pt-141", "PT-141 (Bremelanotide)", "Short Peptides & Neuropeptides"),
  entry("semax", "Semax", "Short Peptides & Neuropeptides"),
  entry("selank", "Selank", "Short Peptides & Neuropeptides"),
  // Cofactors & Conjugates
  entry("ghk-cu", "GHK-Cu", "Cofactors & Conjugates", { featured: true }),
  entry("nad-plus", "NAD+", "Cofactors & Conjugates", { featured: true }),
  entry("glutathione", "Glutathione", "Cofactors & Conjugates"),
  // Blends (renamed by composition; old slugs 301 in lib/redirects.ts)
  entry("bpc-157-tb-500-blend", "BPC-157 / TB-500", "Blends", { components: ["bpc-157", "tb-500"] }),
  entry("bpc-157-tb-500-ghk-cu", "BPC-157 / TB-500 / GHK-Cu", "Blends", { components: ["bpc-157", "tb-500", "ghk-cu"] }),
  entry("bpc-157-tb-500-ghk-cu-kpv", "BPC-157 / TB-500 / GHK-Cu / KPV", "Blends", { components: ["bpc-157", "tb-500", "ghk-cu", "kpv"] }),
];
