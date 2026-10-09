// Pure: AIOS shop-economics products → supplier_prices rows. Kept apart from
// the sync script so it can be tested without a database.

// AIOS cost keys (`<vendor>_kit` = one box of 10 vials, USD) → the supplier
// names Record order shows (lib/wholesale/runs.ts KNOWN_SUPPLIERS).
export const AIOS_VENDORS = { lkz: "LKZ", uther: "Uther", reta: "Reta-Peptide", ehz: "EHZ", bff: "BFF Chem", nana: "Nana" };

// The AIOS default lab's flat fee per lot (rates.labs[defaults.lab].price),
// in cents, or null when it has no flat price (e.g. per-molecule labs).
export function defaultLabFeeCents(sheet) {
  const lab = sheet?.rates?.labs?.[sheet?.defaults?.lab];
  return typeof lab?.price === "number" && lab.price >= 0 ? Math.round(lab.price * 100) : null;
}

// "10 mg" → "10mg", "250 mcg" → "250mcg" (the store's variant_id rule).
export const variantIdOf = (size) => String(size ?? "").replace(/\s+/g, "").toLowerCase();

// products: AIOS rows ({ shop, size, cost: { lkz_kit: 70, … } }); variants: the
// store's [{ slug, variant_id }]. Only strengths the store has; first AIOS row
// wins when two map to the same strength (reported in `skipped`).
export function mapSupplierPrices(products, variants) {
  const known = new Set(variants.map((v) => `${v.slug}/${v.variant_id}`));
  const rows = new Map();
  const skipped = { notInStore: 0, duplicate: 0 };
  for (const p of products) {
    if (!p.shop) continue;
    const vid = variantIdOf(p.size);
    const key = `${p.shop}/${vid}`;
    if (!known.has(key)) { skipped.notInStore++; continue; }
    for (const [vendor, supplier] of Object.entries(AIOS_VENDORS)) {
      const usd = p.cost?.[`${vendor}_kit`];
      if (typeof usd !== "number" || !(usd > 0)) continue;
      const rk = `${supplier}|${key}`;
      if (rows.has(rk)) { skipped.duplicate++; continue; }
      rows.set(rk, { supplier, slug: p.shop, variant_id: vid, box_cents: Math.round(usd * 100) });
    }
  }
  return { rows: [...rows.values()], skipped };
}
