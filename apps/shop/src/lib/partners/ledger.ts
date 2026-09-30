import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { clearsAt, commissionCents } from "@/lib/partners/tiers";
import { splitPayout, type PayoutPref } from "@/lib/partners/payout-math";

export type CommissionState = "pending" | "clearing" | "payable" | "paid" | "void";
export type CommissionRow = {
  id: string; partner_id: string; order_id: string; attributed_by: "code" | "link"; base_cents: number; rate_pct: number;
  amount_cents: number; state: CommissionState; clears_at: string | null; created_at: string;
  orders?: { order_number: string; created_at: string } | null;
};
export type PayoutRow = {
  id: string; partner_id: string; run_date: string; cash_cents: number; credit_cents: number;
  status: "queued" | "paid" | "credited"; method: string | null; reference: string | null; paid_at: string | null;
  partners?: { code: string; payout_method: string | null; payout_details_hint: string | null; customer_id: string } | null;
};

const db = () => getSupabaseAdminClient();
const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

async function adjustLifetime(partnerId: string, deltaCents: number): Promise<void> {
  const { error } = await db().rpc("adjust_partner_lifetime", { p_partner: partnerId, p_delta: deltaCents });
  if (error) throw new Error(`adjust_partner_lifetime failed: ${JSON.stringify(error)}`);
}

export async function createCommission(i: {
  partnerId: string; orderId: string; attributedBy: "code" | "link"; baseCents: number; ratePct: number;
}): Promise<boolean> {
  const { error } = await db().from("commissions").insert({
    partner_id: i.partnerId, order_id: i.orderId, attributed_by: i.attributedBy, base_cents: i.baseCents,
    rate_pct: i.ratePct, amount_cents: commissionCents(i.baseCents, i.ratePct), state: "pending",
  });
  if (error) {
    if (isDuplicate(error)) return false;
    throw new Error(`commission insert failed: ${JSON.stringify(error)}`);
  }
  await adjustLifetime(i.partnerId, i.baseCents);
  return true;
}

export async function markCommissionClearing(orderId: string, shippedAtIso: string): Promise<void> {
  await db().from("commissions").update({ state: "clearing", clears_at: clearsAt(shippedAtIso) })
    .eq("order_id", orderId).eq("state", "pending");
}

// Refund or chargeback. Unpaid commission is voided; paid commission becomes
// a deduction on the next payout. Either way the order leaves lifetime sales
// (tiers already reached are kept by the SQL function). Safe to call twice.
export async function reverseCommission(orderId: string, reason: "refund" | "chargeback"): Promise<void> {
  const { data } = await db().from("commissions").select("id, partner_id, state, amount_cents, base_cents").eq("order_id", orderId).maybeSingle();
  const c = data as { id: string; partner_id: string; state: CommissionState; amount_cents: number; base_cents: number } | null;
  if (!c || c.state === "void") return;
  const { data: prior } = await db().from("commission_adjustments").select("id").eq("order_id", orderId);
  if (((prior as unknown[] | null) ?? []).length > 0) return;
  if (c.state === "paid") {
    const { error } = await db().from("commission_adjustments").insert({ partner_id: c.partner_id, order_id: orderId, amount_cents: -c.amount_cents, reason });
    if (error) { if (isDuplicate(error)) return; throw new Error(`adjustment insert failed: ${JSON.stringify(error)}`); }
  } else {
    const { data: moved } = await db().from("commissions").update({ state: "void", voided_at: new Date().toISOString() })
      .eq("id", c.id).eq("state", c.state).select("id");
    if (!Array.isArray(moved) || moved.length !== 1) return;
  }
  await adjustLifetime(c.partner_id, -c.base_cents);
}

export async function clearDueCommissions(nowIso: string = new Date().toISOString()): Promise<number> {
  const { data } = await db().from("commissions").update({ state: "payable", payable_at: nowIso })
    .eq("state", "clearing").lte("clears_at", nowIso).select("id");
  return ((data as unknown[] | null) ?? []).length;
}

// Suspension: everything not yet paid is forfeited; a positive cash carry is dropped.
export async function forfeitUnpaid(partnerId: string): Promise<void> {
  await db().from("commissions").update({ state: "void", voided_at: new Date().toISOString() })
    .eq("partner_id", partnerId).in("state", ["pending", "clearing", "payable"]);
  await db().from("partners").update({ cash_carry_cents: 0 }).eq("id", partnerId).gt("cash_carry_cents", 0);
}

export async function creditBalance(customerId: string): Promise<number> {
  const { data } = await db().from("store_credit_ledger").select("amount_cents").eq("customer_id", customerId);
  return ((data as { amount_cents: number }[] | null) ?? []).reduce((s, r) => s + r.amount_cents, 0);
}

export async function spendCredit(customerId: string, cents: number, orderId: string): Promise<boolean> {
  const { data, error } = await db().rpc("spend_store_credit", { p_customer: customerId, p_cents: cents, p_order: orderId });
  if (error) throw new Error(`spend_store_credit failed: ${JSON.stringify(error)}`);
  return data === true;
}

export async function refundCredit(customerId: string, cents: number, orderId: string): Promise<void> {
  const { error } = await db().from("store_credit_ledger").insert({ customer_id: customerId, amount_cents: cents, reason: "order_refund", ref_id: orderId });
  if (error && !isDuplicate(error)) throw new Error(`credit refund failed: ${JSON.stringify(error)}`);
}

type RunPartner = { id: string; customer_id: string; payout_pref: PayoutPref; split_cash_pct: number; cash_carry_cents: number; w9_checked_at: string | null; payout_method: string | null };
export type RunResult = { partnerId: string; cashCents: number; creditValueCents: number; carryCents: number };

// One payout run per date (1st and 15th). Settles every payable commission and
// unsettled deduction per approved partner: credit is issued immediately at
// 1.3x; cash is queued for the owner at >= $100 with a checked W-9, else carried.
export async function runPayouts(runDate: string): Promise<{ skipped: boolean; results: RunResult[] }> {
  const { error: runError } = await db().from("payout_runs").insert({ run_date: runDate });
  if (runError) {
    if (isDuplicate(runError)) return { skipped: true, results: [] };
    throw new Error(`payout run insert failed: ${JSON.stringify(runError)}`);
  }
  const results: RunResult[] = [];
  try {
    const { data: partners } = await db().from("partners")
      .select("id, customer_id, payout_pref, split_cash_pct, cash_carry_cents, w9_checked_at, payout_method").eq("status", "approved");
    for (const p of (partners as RunPartner[] | null) ?? []) {
      const { data: payable } = await db().from("commissions").select("id, amount_cents").eq("partner_id", p.id).eq("state", "payable");
      const { data: deductions } = await db().from("commission_adjustments").select("id, amount_cents").eq("partner_id", p.id).is("settled_run", null);
      const pay = (payable as { id: string; amount_cents: number }[] | null) ?? [];
      const ded = (deductions as { id: string; amount_cents: number }[] | null) ?? [];
      if (pay.length === 0 && ded.length === 0 && p.cash_carry_cents === 0) continue;
      const net = pay.reduce((s, c) => s + c.amount_cents, 0) + ded.reduce((s, d) => s + d.amount_cents, 0);
      const r = splitPayout({ netCents: net, carryCents: p.cash_carry_cents, pref: p.payout_pref, splitCashPct: p.split_cash_pct, w9Checked: !!p.w9_checked_at });
      const now = new Date().toISOString();
      if (pay.length) await db().from("commissions").update({ state: "paid", paid_at: now, payout_run: runDate }).in("id", pay.map((c) => c.id));
      if (ded.length) await db().from("commission_adjustments").update({ settled_run: runDate }).in("id", ded.map((d) => d.id));
      await db().from("partners").update({ cash_carry_cents: r.newCarryCents }).eq("id", p.id);
      if (r.cashCents > 0 || r.creditValueCents > 0) {
        const { data: payout, error } = await db().from("payouts").insert({
          partner_id: p.id, run_date: runDate, cash_cents: r.cashCents, credit_cents: r.creditValueCents,
          status: r.cashCents > 0 ? "queued" : "credited", method: p.payout_method,
        }).select("id").single();
        if (error || !payout) throw new Error(`payout insert failed: ${JSON.stringify(error)}`);
        if (r.creditValueCents > 0) {
          const { error: ce } = await db().from("store_credit_ledger").insert({
            customer_id: p.customer_id, amount_cents: r.creditValueCents, reason: "payout", ref_id: (payout as { id: string }).id,
          });
          if (ce) throw new Error(`payout credit failed: ${JSON.stringify(ce)}`);
        }
      }
      results.push({ partnerId: p.id, cashCents: r.cashCents, creditValueCents: r.creditValueCents, carryCents: r.newCarryCents });
    }
    await db().from("payout_runs").update({ finished_at: new Date().toISOString() }).eq("run_date", runDate);
    return { skipped: false, results };
  } catch (err) {
    await db().from("payout_runs").update({ error: String(err).slice(0, 1000) }).eq("run_date", runDate);
    throw err;
  }
}

export async function listQueuedPayouts(): Promise<PayoutRow[]> {
  const { data } = await db().from("payouts").select("*, partners(code, payout_method, payout_details_hint, customer_id)")
    .eq("status", "queued").order("run_date");
  return (data as PayoutRow[] | null) ?? [];
}

export async function markPayoutPaid(id: string, reference: string): Promise<PayoutRow | null> {
  const { data } = await db().from("payouts").update({ status: "paid", reference, paid_at: new Date().toISOString() })
    .eq("id", id).eq("status", "queued").select("*, partners(code, payout_method, payout_details_hint, customer_id)").maybeSingle();
  return (data as PayoutRow | null) ?? null;
}

export async function latestRunSummary(): Promise<{ runDate: string; creditCents: number; creditPartners: number } | null> {
  const { data: run } = await db().from("payout_runs").select("run_date").order("run_date", { ascending: false }).limit(1).maybeSingle();
  const runDate = (run as { run_date: string } | null)?.run_date;
  if (!runDate) return null;
  const { data } = await db().from("payouts").select("credit_cents").eq("run_date", runDate).gt("credit_cents", 0);
  const rows = (data as { credit_cents: number }[] | null) ?? [];
  return { runDate, creditCents: rows.reduce((s, r) => s + r.credit_cents, 0), creditPartners: rows.length };
}

export async function partnerLedger(partnerId: string): Promise<{
  byState: Record<CommissionState, number>; recent: CommissionRow[]; payouts: PayoutRow[]; ordersLast30: number;
}> {
  const { data: all } = await db().from("commissions").select("state, amount_cents, created_at").eq("partner_id", partnerId);
  const byState: Record<CommissionState, number> = { pending: 0, clearing: 0, payable: 0, paid: 0, void: 0 };
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  let ordersLast30 = 0;
  for (const c of (all as { state: CommissionState; amount_cents: number; created_at: string }[] | null) ?? []) {
    byState[c.state] += c.amount_cents;
    if (c.state !== "void" && new Date(c.created_at).getTime() >= since) ordersLast30++;
  }
  const { data: recent } = await db().from("commissions").select("*, orders(order_number, created_at)")
    .eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(20);
  const { data: payouts } = await db().from("payouts").select("*").eq("partner_id", partnerId).order("run_date", { ascending: false }).limit(12);
  return { byState, recent: (recent as CommissionRow[] | null) ?? [], payouts: (payouts as PayoutRow[] | null) ?? [], ordersLast30 };
}
