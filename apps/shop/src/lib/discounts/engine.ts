// The one discount engine. Order of operations (shown in admin settings):
//   1. item discounts — per item, the larger of pack price, the automatic
//      percent (partner code 10% or new-account 15%) or an item-% code
//   2. order code — replaces step 1 on its items when that's cheaper, or with
//      "on top" applies after it
//   3. store-wide cap — total discount on goods ≤ capPct of list; never raises
//      a pack price
//   4. shipping — free over the threshold or with a free-shipping code
// Tax and store credit come after, in checkout. Pure — client and server.
import { withCharges, type PricedItem, type PricedOrder } from "@/lib/pricing";
import type { CodeTerms } from "@/lib/discounts/rules";

export type AutoDiscount = { pct: number; newAccount: boolean } | null;
export type CodeOutcome = "applied" | "no_gain" | "below_min" | "no_eligible_items";
export type LineSource = "pack" | "none" | "auto" | "code";
export type EngineLine = { index: number; source: LineSource; savingCents: number }; // saving beyond the pack price
export type EngineInput = { auto: AutoDiscount; code: CodeTerms | null; capPct: number };
export type EngineResult = PricedOrder & {
  lineDiscounts: EngineLine[];
  listCents: number;
  newAccount: boolean;              // the new-account percent priced at least one line
  codeOutcome: CodeOutcome | null;  // null = no code
  codeGrossCents: number;           // what the code took before the cap
  codeDiscountCents: number;        // the code's share after the cap
  cappedCents: number;              // trimmed by the cap
  shortOfMinCents: number;          // below_min only
};

type Stage = { prices: number[]; sources: LineSource[] };
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const lineList = (i: PricedItem) => i.listUnitCents * i.quantity;
// Per-unit rounding, identical to lib/partners/discounts.ts.
const atPct = (i: PricedItem, pct: number) => Math.round((i.listUnitCents * (100 - pct)) / 100) * i.quantity;

export function lineEligible(t: CodeTerms, i: Pick<PricedItem, "compoundSlug" | "chemicalClass">): boolean {
  if (t.excludeSlugs.includes(i.compoundSlug) || t.excludeClasses.includes(i.chemicalClass)) return false;
  if (t.includeSlugs.length + t.includeClasses.length === 0) return true;
  return t.includeSlugs.includes(i.compoundSlug) || t.includeClasses.includes(i.chemicalClass);
}

// Splits `total` across lines in proportion to `weights`, in whole cents
// summing exactly to `total`. Leftover cents go one at a time to the lines
// with the largest remainders, so no line gets more than its weight when
// total ≤ sum(weights).
export function allocate(total: number, weights: number[]): number[] {
  const w = sum(weights);
  if (w <= 0 || total === 0) return weights.map(() => 0);
  const out = weights.map((x) => Math.floor((total * x) / w));
  let rest = total - sum(out);
  const order = weights.map((x, k) => ({ k, r: (total * x) % w })).filter((o) => weights[o.k] > 0).sort((a, b) => b.r - a.r || b.k - a.k);
  for (let n = 0; rest > 0 && order.length; n = (n + 1) % order.length, rest--) out[order[n].k] += 1;
  return out;
}

function itemStage(items: PricedItem[], auto: AutoDiscount, itemCode: CodeTerms | null): Stage {
  const prices: number[] = [];
  const sources: LineSource[] = [];
  for (const i of items) {
    let best = i.lineTotalCents;
    let src: LineSource = i.packPct > 0 ? "pack" : "none";
    if (auto) { const p = atPct(i, auto.pct); if (p < best) { best = p; src = "auto"; } }
    if (itemCode && lineEligible(itemCode, i)) { const p = atPct(i, itemCode.value); if (p < best) { best = p; src = "code"; } }
    prices.push(best); sources.push(src);
  }
  return { prices, sources };
}

// null = the code makes nothing cheaper.
function orderStage(items: PricedItem[], a: Stage, t: CodeTerms): Stage | null {
  const elig = items.map((i) => lineEligible(t, i));
  const idx = items.map((_, k) => k).filter((k) => elig[k]);
  const prices = [...a.prices];
  if (t.stackOnTop) {
    if (t.kind === "order_pct") idx.forEach((k) => { prices[k] = a.prices[k] - Math.round((a.prices[k] * t.value) / 100); });
    else {
      const base = idx.map((k) => a.prices[k]);
      const cut = allocate(Math.min(t.value, sum(base)), base);
      idx.forEach((k, n) => { prices[k] -= cut[n]; });
    }
  } else {
    if (t.kind === "order_pct") idx.forEach((k) => { prices[k] = atPct(items[k], t.value); });
    else {
      const base = idx.map((k) => lineList(items[k]));
      const cut = allocate(Math.min(t.value, sum(base)), base);
      idx.forEach((k, n) => { prices[k] = base[n] - cut[n]; });
    }
  }
  if (sum(idx.map((k) => prices[k])) >= sum(idx.map((k) => a.prices[k]))) return null;
  return { prices, sources: a.sources.map((s, k) => (elig[k] ? "code" : s)) };
}

function capStage(items: PricedItem[], s: Stage, capPct: number): { stage: Stage; cappedCents: number } {
  const list = sum(items.map(lineList));
  const goods = sum(s.prices);
  const excess = list - goods - Math.floor((list * capPct) / 100);
  const beyondPack = sum(items.map((i) => i.lineTotalCents)) - goods;
  const trim = Math.min(excess, beyondPack);
  if (trim <= 0) return { stage: s, cappedCents: 0 };
  const raise = allocate(trim, items.map((i, k) => Math.max(0, i.lineTotalCents - s.prices[k])));
  return { stage: { prices: s.prices.map((p, k) => p + raise[k]), sources: s.sources }, cappedCents: trim };
}

export function applyDiscounts(priced: PricedOrder, input: EngineInput): EngineResult {
  const items = priced.items;
  const listCents = sum(items.map(lineList));
  const base = itemStage(items, input.auto, null);
  const baseCapped = capStage(items, base, input.capPct);

  const finish = (stage: Stage, cappedCents: number, freeShipping: boolean, extra: Partial<EngineResult>): EngineResult => {
    const lineDiscounts = items.map((i, index) => ({ index, source: stage.sources[index], savingCents: i.lineTotalCents - stage.prices[index] }));
    const charged = withCharges({ ...priced, partnerDiscountCents: sum(lineDiscounts.map((d) => d.savingCents)), freeShipping });
    return {
      ...charged, lineDiscounts, listCents,
      newAccount: !!input.auto?.newAccount && stage.sources.includes("auto"),
      codeOutcome: null, codeGrossCents: 0, codeDiscountCents: 0, cappedCents, shortOfMinCents: 0,
      ...extra,
    };
  };
  const withoutCode = (codeOutcome: CodeOutcome | null, shortOfMinCents = 0) =>
    finish(baseCapped.stage, baseCapped.cappedCents, false, { codeOutcome, shortOfMinCents });

  const t = input.code;
  if (!t) return withoutCode(null);
  const baseGoods = sum(base.prices);
  if (t.minOrderCents && baseGoods < t.minOrderCents) return withoutCode("below_min", t.minOrderCents - baseGoods);

  let stage: Stage | null = null;
  if (t.kind !== "ship_only") {
    if (!items.some((i) => lineEligible(t, i))) return withoutCode("no_eligible_items");
    if (t.kind === "item_pct") {
      const s = itemStage(items, input.auto, t);
      stage = s.sources.includes("code") ? s : null;
    } else stage = orderStage(items, base, t);
  }
  const freeShipping = t.kind === "ship_only" || t.freeShipping;
  const shipSaved = freeShipping && withoutCode(null).shippingCents > 0;
  const s = stage ?? base;
  const capped = capStage(items, s, input.capPct);
  const codeDiscountCents = Math.max(0, sum(baseCapped.stage.prices) - sum(capped.stage.prices));
  if (codeDiscountCents === 0 && !shipSaved) return withoutCode("no_gain");
  const result = finish(capped.stage, capped.cappedCents, freeShipping, {
    codeOutcome: "applied", codeGrossCents: baseGoods - sum(s.prices), codeDiscountCents,
    // stacked on top, the automatic percent still priced the lines underneath
    ...(t.stackOnTop && stage ? { newAccount: !!input.auto?.newAccount && base.sources.includes("auto") } : {}),
  });
  // A code that drops goods under the free-shipping threshold can cost more
  // than it saves: it only applies when the customer's total goes down.
  if (result.totalBeforeTaxCents >= withoutCode(null).totalBeforeTaxCents) return withoutCode("no_gain");
  return result;
}
