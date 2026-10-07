import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getPartnerById, type PartnerRow } from "@/lib/partners/data";
import type { CommissionState, PayoutRow } from "@/lib/partners/ledger";

export const PARTNER_LINES_PAGE = 50;
const LINES_MAX = 1000;  // newest commissions read for one partner page

export type PartnerLine =
  | { kind: "commission"; id: string; orderNumber: string; at: string; baseCents: number; ratePct: number; amountCents: number; state: CommissionState; clearsAt: string | null }
  | { kind: "adjustment"; id: string; orderNumber: string; at: string; amountCents: number; reason: string };
export type PartnerDetail = {
  partner: PartnerRow; clicks30: number; orders: number; payableCents: number; unpaidCents: number; creditIssuedCents: number;
  lines: PartnerLine[]; totalLines: number; capped: boolean; payouts: PayoutRow[];
};

const db = () => getSupabaseAdminClient();
function must<T>(what: string, r: { data: unknown; error: unknown }): T {
  if (r.error) throw new Error(`partner ${what} read failed: ${JSON.stringify(r.error)}`);
  return r.data as T;
}

export async function getPartnerDetail(id: string, page: number, nowMs: number): Promise<PartnerDetail | null> {
  const partner = await getPartnerById(id);
  if (!partner) return null;
  const since = new Date(nowMs - 30 * 86_400_000).toISOString().slice(0, 10);
  const [clicks, coms, adjs, pays] = await Promise.all([
    db().from("partner_clicks_daily").select("clicks").eq("partner_id", id).gte("day", since),
    db().from("commissions").select("id, order_id, base_cents, rate_pct, amount_cents, state, clears_at, created_at, orders(order_number)").eq("partner_id", id).order("created_at", { ascending: false }).limit(LINES_MAX),
    db().from("commission_adjustments").select("id, order_id, amount_cents, reason, created_at, orders(order_number)").eq("partner_id", id),
    db().from("payouts").select("*").eq("partner_id", id).order("run_date", { ascending: false }),
  ]);
  type C = { id: string; base_cents: number; rate_pct: number; amount_cents: number; state: CommissionState; clears_at: string | null; created_at: string; orders: { order_number: string } | null };
  type A = { id: string; amount_cents: number; reason: string; created_at: string; orders: { order_number: string } | null };
  const clickRows = must<Array<{ clicks: number }> | null>("clicks", clicks) ?? [];
  const c = must<C[] | null>("commissions", coms) ?? [];
  const a = must<A[] | null>("adjustments", adjs) ?? [];
  const payouts = must<PayoutRow[] | null>("payouts", pays) ?? [];
  const sum = (states: CommissionState[]) => c.filter((x) => states.includes(x.state)).reduce((s, x) => s + x.amount_cents, 0);
  const all: PartnerLine[] = [
    ...c.map((x): PartnerLine => ({ kind: "commission", id: x.id, orderNumber: x.orders?.order_number ?? "—", at: x.created_at, baseCents: x.base_cents, ratePct: x.rate_pct, amountCents: x.amount_cents, state: x.state, clearsAt: x.clears_at })),
    ...a.map((x): PartnerLine => ({ kind: "adjustment", id: x.id, orderNumber: x.orders?.order_number ?? "—", at: x.created_at, amountCents: x.amount_cents, reason: x.reason })),
  ].sort((p, q) => q.at.localeCompare(p.at));
  const start = (page - 1) * PARTNER_LINES_PAGE;
  return {
    partner,
    clicks30: clickRows.reduce((s, r) => s + r.clicks, 0),
    orders: c.filter((x) => x.state !== "void").length,
    payableCents: sum(["payable"]),
    unpaidCents: sum(["pending", "clearing", "payable"]),
    creditIssuedCents: payouts.reduce((s, p) => s + p.credit_cents, 0),
    lines: all.slice(start, start + PARTNER_LINES_PAGE), totalLines: all.length, capped: c.length >= LINES_MAX,
    payouts,
  };
}
