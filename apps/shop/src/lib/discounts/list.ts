// Rows for the admin codes list: singles as-is, a batch folded into one row. Pure.
import { codeStatus, describeRule, termsFromRow, type CodeStatus, type DiscountCodeRow } from "@/lib/discounts/rules";
import type { BatchRow, CodeStats } from "@/lib/discounts/data";

export type ListRow = {
  id: string; batchId: string | null; href: string; code: string; sub: string | null; gives: string; status: CodeStatus;
  uses: number; held: number; max: number | null; revenueCents: number; discountCents: number; cappedOrders: number;
  endsAt: string | null; lockedEmail: string | null; startsAt: string | null;
};

const ORDER: CodeStatus[] = ["active", "scheduled", "paused", "used_up", "ended"];
const ZERO: CodeStats = { uses: 0, held: 0, revenueCents: 0, discountCents: 0, cappedOrders: 0 };

export function buildListRows(codes: DiscountCodeRow[], batches: BatchRow[], stats: Map<string, CodeStats>, nowMs: number = Date.now()): ListRow[] {
  const rows: ListRow[] = [];
  const byBatch = new Map<string, DiscountCodeRow[]>();
  for (const c of codes) {
    if (c.batch_id) { byBatch.set(c.batch_id, [...(byBatch.get(c.batch_id) ?? []), c]); continue; }
    const s = stats.get(c.id) ?? ZERO;
    rows.push({
      id: c.id, batchId: null, href: `/admin/discounts/${c.id}`, code: c.code, sub: c.note, gives: describeRule(termsFromRow(c)),
      status: codeStatus(c, s.uses + s.held, nowMs), uses: s.uses, held: s.held, max: c.max_uses,
      revenueCents: s.revenueCents, discountCents: s.discountCents, cappedOrders: s.cappedOrders, endsAt: c.ends_at, lockedEmail: c.locked_email, startsAt: c.starts_at,
    });
  }
  for (const [batchId, list] of byBatch) {
    const b = batches.find((x) => x.id === batchId);
    const first = list[0];
    const sum = list.reduce((acc, c) => { const s = stats.get(c.id) ?? ZERO; return { uses: acc.uses + s.uses, held: acc.held + s.held, revenueCents: acc.revenueCents + s.revenueCents, discountCents: acc.discountCents + s.discountCents, cappedOrders: acc.cappedOrders + s.cappedOrders }; }, ZERO);
    const size = b?.size ?? list.length;
    // Same precedence as codeStatus: ended beats used-up, so a batch that's
    // fully redeemed AND past its end date (or ended by the owner) reads as
    // "Ended", not "Used up".
    const batchEnded = list.every((c) => c.status === "ended") || (first.ends_at != null && Date.parse(first.ends_at) <= nowMs);
    const anyOpen = list.some((c) => codeStatus(c, (stats.get(c.id)?.uses ?? 0) + (stats.get(c.id)?.held ?? 0), nowMs) === "active");
    const status: CodeStatus = batchEnded ? "ended" : sum.uses + sum.held >= size ? "used_up" : anyOpen ? "active" : codeStatus(first, 0, nowMs);
    rows.push({
      id: batchId, batchId, href: `/admin/discounts/batch/${batchId}`, code: `${b?.prefix ?? ""}·····`, sub: `Batch · ${size} single-use codes`,
      gives: describeRule(termsFromRow(first)), status, uses: sum.uses, held: sum.held, max: size,
      revenueCents: sum.revenueCents, discountCents: sum.discountCents, cappedOrders: sum.cappedOrders, endsAt: first.ends_at, lockedEmail: null, startsAt: first.starts_at,
    });
  }
  const end = (r: ListRow) => (r.endsAt ? Date.parse(r.endsAt) : Number.MAX_SAFE_INTEGER);
  return rows.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || end(a) - end(b));
}
