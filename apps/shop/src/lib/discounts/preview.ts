// What a code does to real baskets, for the admin form (mock screen 2).
// Ignores lot/stock state on purpose: the owner prices codes before lots go live. Pure.
import type { Compound } from "@/data/catalog";
import { FREE_SHIPPING_MIN_CENTS, withCharges, type PricedOrder } from "@/lib/pricing";
import { applyDiscounts, lineEligible, type EngineResult } from "@/lib/discounts/engine";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";
import type { CodeTerms } from "@/lib/discounts/rules";

export function basketOrder(c: Compound, packQty: number): PricedOrder {
  const v = c.variants[0];
  const pack = c.packDiscounts.find((p) => p.qty === packQty) ?? { qty: packQty, pct: 0 };
  const listUnitCents = Math.round(v.priceUsd * 100 * packQty);
  const unitPriceCents = Math.round(listUnitCents * (1 - pack.pct / 100));
  return withCharges({
    items: [{
      compoundSlug: c.slug, compoundName: c.name, chemicalClass: c.chemicalClass, variantId: v.id, strength: v.strength,
      packQty, quantity: 1, listUnitCents, packPct: pack.pct, unitPriceCents, lineTotalCents: unitPriceCents, lotNumber: "",
    }],
    rejected: [], subtotalCents: unitPriceCents, partnerDiscountCents: 0, shippingCents: 0, insuranceCents: 0, totalBeforeTaxCents: 0,
  });
}

const dollars = (cents: number) => (cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`);

export type BasketRow = { label: string; note: string; listCents: number; paysCents: number; offPct: number; capped: boolean; codeUsed: boolean };

const pct = (r: EngineResult) => Math.round(((r.listCents - (r.subtotalCents - r.partnerDiscountCents)) / r.listCents) * 100);

function row(c: Compound, qty: number, terms: CodeTerms, capPct: number): BasketRow {
  const r = applyDiscounts(basketOrder(c, qty), { auto: null, code: terms, capPct });
  const pack = r.items[0].packPct;
  const used = r.codeOutcome === "applied";
  const note = r.codeOutcome === "below_min" ? `under the ${dollars(terms.minOrderCents ?? 0)} minimum`
    : r.codeOutcome === "no_gain" ? "pack price is larger"
    : [pack ? `${qty}-pack ${pack}%` : null, used && terms.kind !== "ship_only" ? `code ${terms.kind === "order_amount" ? "$" + terms.value / 100 : terms.value + "%"}` : null,
       used && (terms.freeShipping || terms.kind === "ship_only") && r.shippingCents === 0 && r.subtotalCents - r.partnerDiscountCents < FREE_SHIPPING_MIN_CENTS ? "free ship" : null].filter(Boolean).join(" + ");
  return { label: `${c.name} × ${qty}`, note, listCents: r.listCents, paysCents: r.subtotalCents - r.partnerDiscountCents, offPct: pct(r), capped: r.cappedCents > 0, codeUsed: used };
}

function eligible(terms: CodeTerms, list: Compound[]): Compound[] {
  return list.filter((c) => terms.kind === "ship_only" || lineEligible(terms, { compoundSlug: c.slug, chemicalClass: c.chemicalClass }));
}

export function typicalBaskets(terms: CodeTerms, list: Compound[], capPct: number): BasketRow[] {
  const ok = eligible(terms, list);
  if (!ok.length) return [];
  const cheapest = [...ok].sort((a, b) => a.variants[0].priceUsd - b.variants[0].priceUsd)[0];
  const sample = ok.find((c) => c.featured) ?? ok[0];
  return [row(cheapest, 2, terms, capPct), ...[2, 5, 10].map((q) => row(sample, q, terms, capPct))];
}

export type WorstCase = {
  label: string; listCents: number; packCents: number; autoCents: number; codeCents: number; cappedCents: number;
  paysCents: number; offPct: number; uncappedOffPct: number; capped: boolean; newAccount: boolean;
};

// The largest % off list this code can produce, over every eligible listed
// compound and pack, with and without the new-account percent.
export function worstCase(terms: CodeTerms, list: Compound[], capPct: number): WorstCase | null {
  let best: WorstCase | null = null;
  for (const c of eligible(terms, list)) for (const p of c.packDiscounts) for (const auto of [null, { pct: NEW_ACCOUNT_PCT, newAccount: true }]) {
    const r = applyDiscounts(basketOrder(c, p.qty), { auto, code: terms, capPct });
    if (r.codeOutcome !== "applied") continue;
    const pays = r.subtotalCents - r.partnerDiscountCents;
    const off = pct(r);
    const noCode = applyDiscounts(basketOrder(c, p.qty), { auto, code: null, capPct });
    const cand: WorstCase = {
      label: `${c.name} ${c.variants[0].strength} × ${p.qty}`, listCents: r.listCents,
      packCents: r.listCents - r.subtotalCents, autoCents: noCode.partnerDiscountCents,
      codeCents: r.codeGrossCents, cappedCents: r.cappedCents, paysCents: pays, offPct: off,
      uncappedOffPct: Math.round(((r.listCents - pays + r.cappedCents) / r.listCents) * 100),
      capped: r.cappedCents > 0, newAccount: !!auto && r.newAccount,
    };
    if (!best || cand.uncappedOffPct > best.uncappedOffPct || (cand.uncappedOffPct === best.uncappedOffPct && cand.listCents - cand.paysCents > best.listCents - best.paysCents)) best = cand;
  }
  return best;
}
