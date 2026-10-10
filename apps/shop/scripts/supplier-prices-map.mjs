// Pure: AIOS shop-economics products → supplier_prices rows. Kept apart from
// the sync script so it can be tested without a database.

// AIOS cost keys (`<vendor>_kit` = one box of 10 vials, USD) → the supplier
// names Record order shows (lib/wholesale/runs.ts KNOWN_SUPPLIERS).
export const AIOS_VENDORS = { lkz: "LKZ", uther: "Uther", reta: "Reta-Peptide", ehz: "EHZ", bff: "BFF Chem", nana: "Nana" };

// Store → AIOS: the store's retail price per vial for every AIOS product it
// sells, as { aiosProductId: price } (AIOS overlays these on read and won't let
// them be edited there), plus what moved compared with AIOS's own price.
export function storePricesFor(products, variants) {
  const price = new Map(variants.map((v) => [`${v.slug}/${v.variant_id}`, v.price_cents / 100]));
  const prices = {};
  const changes = [];
  for (const p of products) {
    const store = p.shop ? price.get(`${p.shop}/${variantIdOf(p.size)}`) : undefined;
    if (store === undefined) continue;
    prices[p.id] = store;
    if (p.price !== store) changes.push({ id: p.id, from: p.price ?? null, to: store });
  }
  return { prices, changes };
}

// The AIOS default lab's flat fee per lot (rates.labs[defaults.lab].price),
// in cents, or null when it has no flat price (e.g. per-molecule labs).
export function defaultLabFeeCents(sheet) {
  const lab = sheet?.rates?.labs?.[sheet?.defaults?.lab];
  return typeof lab?.price === "number" && lab.price >= 0 ? Math.round(lab.price * 100) : null;
}

// AIOS per-box inbound freight and per-vial label cost, in cents (null if missing).
export function landedDefaultsCents(sheet) {
  const d = sheet?.defaults ?? {};
  const c = (v) => (typeof v === "number" && v >= 0 ? Math.round(v * 100) : null);
  return { inboundPerBoxCents: c(d.china_inbound_per_kit), labelPerVialCents: c(d.label_print_per_vial), kitBoxCents: c(d.kit_box_per_kit) };
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

// AIOS → aios_reference rows for the owner's wholesale margins page (all cents):
//   fulfillment: the default 3PL's per-order fees (AIOS seFulCost), its postage
//     option and which figures AIOS still marks as estimates;
//   processor: the GLP-1 processor's percent (defaults.partner_pct);
//   competitors: competitors' single-vial prices per store strength ("slug/variant");
//   lab: the default lab's test price per store strength (rates.labs[lab].prices), with its flat price.
// A part AIOS doesn't have is left out (the page says it isn't synced).
export function referenceFor(sheet, variants) {
  const d = sheet?.defaults ?? {};
  const c = (v) => (typeof v === "number" && v >= 0 ? Math.round(v * 100) : null);
  const out = [];
  const v = (sheet?.fulfillment?.vendors ?? []).find((x) => x.key === d.threepl);
  const po = v && ((v.postage_options ?? []).find((o) => o.key === d.postage) ?? (v.postage_options ?? []).find((o) => o.key === v.postage_default));
  if (v && po && c(v.pick_first) != null && c(po.postage) != null) {
    const fields = ["pick_first", "pick_additional", "insert_per_order", "label_apply_per_vial", "insurance_per_order", "postage", "packaging"];
    out.push({ kind: "fulfillment", data: {
      vendor: v.short ?? v.name, postageLabel: po.label,
      pickFirstCents: c(v.pick_first), pickAdditionalCents: c(v.pick_additional) ?? 0, insertCents: c(v.insert_per_order) ?? 0,
      packagingCents: c(po.packaging) ?? 0, postageCents: c(po.postage), insuranceCents: c(v.insurance_per_order) ?? 0,
      labelApplyPerVialCents: c(v.label_apply_per_vial) ?? 0,
      estimates: fields.filter((f) => v.status?.[f] && v.status[f] !== "confirmed"),
    } });
  }
  if (typeof d.partner_pct === "number" && d.partner_pct >= 0) out.push({ kind: "processor", data: { glpPct: d.partner_pct } });
  const known = new Set(variants.map((x) => `${x.slug}/${x.variant_id}`));
  const competitors = {};
  for (const p of sheet?.products ?? []) {
    const key = p.shop ? `${p.shop}/${variantIdOf(p.size)}` : null;
    if (!key || !known.has(key) || competitors[key] || !(p.mg > 0)) continue;
    const rows = (p.competitors ?? []).filter((x) => x?.who && x.mg > 0 && x.price > 0)
      .map((x) => ({ who: x.who, mg: x.mg, priceCents: Math.round(x.price * 100), sameStrengthCents: Math.round((x.price * p.mg / x.mg) * 100) }));
    if (rows.length) competitors[key] = rows;
  }
  if (Object.keys(competitors).length) out.push({ kind: "competitors", data: competitors });
  const lab = sheet?.rates?.labs?.[d.lab];
  if (lab) {
    const perStrength = {};
    for (const p of sheet?.products ?? []) {
      const key = p.shop ? `${p.shop}/${variantIdOf(p.size)}` : null;
      const cents = c(lab.prices?.[p.id]);
      if (key && known.has(key) && cents != null && perStrength[key] == null) perStrength[key] = cents;
    }
    out.push({ kind: "lab", data: { name: lab.label ?? d.lab, flatCents: c(lab.price), perStrength } });
  }
  return out;
}
