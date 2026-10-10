// The strengths data/catalog.ts carried on 2026-10-05, before strengths moved
// to Aura Store (catalog_variants, managed in /admin/catalog). The seed in
// supabase/catalog-ops.sql must match this exactly (tests/data/catalog-ops-sql.test.ts);
// test fixtures build the live catalog from it.
export const SEED_STRENGTHS: Record<string, string[]> = {
  "semaglutide": ["10 mg"],
  "tirzepatide": ["10 mg", "20 mg"],
  "retatrutide": ["10 mg", "20 mg"],
  "cagrilintide": ["10 mg"],
  "cagrisema": ["10 mg"],
  "retatrutide-cagrilintide": ["10 mg"],
  "cjc-1295-ipamorelin": ["10 mg"],
  "sermorelin": ["10 mg"],
  "tesamorelin": ["10 mg"],
  "igf-1-lr3": ["1 mg"],
  "bpc-157": ["10 mg"],
  "tb-500": ["10 mg"],
  "kpv": ["10 mg"],
  "aod-9604": ["10 mg"],
  "ss-31": ["10 mg", "50 mg"],
  "mots-c": ["10 mg"],
  "slu-pp-332": ["250 mcg"],
  "epithalon": ["10 mg"],
  "pinealon": ["10 mg"],
  "dsip": ["5 mg"],
  "semax": ["10 mg"],
  "selank": ["10 mg"],
  "pt-141": ["10 mg"],
  "ghk-cu": ["50 mg"],
  "nad-plus": ["500 mg"],
  "glutathione": ["600 mg"],
  "bpc-157-tb-500-blend": ["10 mg"],
  "bpc-157-tb-500-ghk-cu": ["70 mg"],
  "bpc-157-tb-500-ghk-cu-kpv": ["80 mg"],
};

export const strengthId = (strength: string) => strength.replace(/\s+/g, "").toLowerCase();
