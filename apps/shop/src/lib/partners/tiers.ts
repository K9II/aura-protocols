// Partner program rules as numbers. Pure — shared by checkout, the ledger,
// the dashboard and the program-page calculator.

export const CODE_DISCOUNT_PCT = 10;
export const CLEARING_DAYS = 15;
export const CASH_MIN_CENTS = 10_000;
export const CREDIT_MULTIPLIER = 1.3;
export const REF_WINDOW_DAYS = 60;

export type TierPct = 10 | 15 | 20;
export const TIERS: ReadonlyArray<{ fromCents: number; pct: TierPct }> = [
  { fromCents: 0, pct: 10 },
  { fromCents: 1_500_000, pct: 15 },
  { fromCents: 4_000_000, pct: 20 },
];

export function tierFor(lifetimeCents: number): TierPct {
  let pct: TierPct = 10;
  for (const t of TIERS) if (lifetimeCents >= t.fromCents) pct = t.pct;
  return pct;
}

export function nextTier(lifetimeCents: number): { pct: TierPct; fromCents: number; remainingCents: number } | null {
  const t = TIERS.find((x) => x.fromCents > lifetimeCents);
  return t ? { pct: t.pct, fromCents: t.fromCents, remainingCents: t.fromCents - lifetimeCents } : null;
}

export function commissionCents(baseCents: number, pct: number): number {
  return Math.round((baseCents * pct) / 100);
}

export function clearsAt(shippedAtIso: string): string {
  return new Date(new Date(shippedAtIso).getTime() + CLEARING_DAYS * 24 * 3600 * 1000).toISOString();
}

export type Projection = { firstMonthCents: number; totalCents: number; finalTierPct: TierPct; reachedAt: Partial<Record<15 | 20, number>> };

// Illustration for the program page: the same sales every month, each month
// paid at the tier held when it began; tiers never drop.
export function projectEarnings(input: { ordersPerMonth: number; avgOrderCents: number; multiplier: number; months?: number }): Projection {
  const months = input.months ?? 12;
  const sales = input.ordersPerMonth * input.avgOrderCents;
  let lifetime = 0;
  let total = 0;
  let first = 0;
  let tier: TierPct = 10;
  const reachedAt: Projection["reachedAt"] = {};
  for (let m = 1; m <= months; m++) {
    tier = tierFor(lifetime);
    if (tier >= 15 && reachedAt[15] === undefined) reachedAt[15] = m;
    if (tier === 20 && reachedAt[20] === undefined) reachedAt[20] = m;
    const earned = (sales * tier) / 100 * input.multiplier;
    if (m === 1) first = earned;
    total += earned;
    lifetime += sales;
  }
  return { firstMonthCents: Math.round(first), totalCents: Math.round(total), finalTierPct: tier, reachedAt };
}
