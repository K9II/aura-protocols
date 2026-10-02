import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { clearsAt, commissionCents } from "@/lib/partners/tiers";
import { receivedCents, splitPayout, type PayoutPref } from "@/lib/partners/payout-math";

export type CommissionState = "pending" | "clearing" | "payable" | "paid" | "void";
export type CommissionRow = {
  id: string; partner_id: string; order_id: string; attributed_by: "code" | "link"; base_cents: number; rate_pct: number;
  amount_cents: number; state: CommissionState; clears_at: string | null; created_at: string;
  orders?: { order_number: string; created_at: string } | null;
};
export type PayoutRow = {
  id: string; partner_id: string; run_date: string; cash_cents: number; credit_cents: number;
  status: "queued" | "paid" | "credited"; method: string | null; reference: string | null; paid_at: string | null; details_hint?: string | null;
  partners?: { code: string; payout_method: string | null; payout_details_hint: string | null; customer_id: string } | null;
};

const db = () => getSupabaseAdminClient();
const isDuplicate = (e: unknown) => (e as { code?: string } | null)?.code === "23505";
const dbError = (context: string, error: unknown): Error => new Error(`${context} failed: ${JSON.stringify(error)}`);

// Inserts the order's commission and credits the partner's lifetime sales in
// one DB transaction (record_commission in partners.sql). false = the order
// already has a commission (insert was a no-op, lifetime was not touched).
export async function createCommission(i: {
  partnerId: string; orderId: string; attributedBy: "code" | "link"; baseCents: number; ratePct: number;
}): Promise<boolean> {
  const { data, error } = await db().rpc("record_commission", {
    p_order: i.orderId,
    p_partner: i.partnerId,
    p_base_cents: i.baseCents,
    p_pct: i.ratePct,
    p_amount_cents: commissionCents(i.baseCents, i.ratePct),
    p_attributed_by: i.attributedBy,
  });
  if (error) throw dbError("record_commission", error);
  return data === true;
}

export async function markCommissionClearing(orderId: string, shippedAtIso: string): Promise<void> {
  const { error } = await db().from("commissions").update({ state: "clearing", clears_at: clearsAt(shippedAtIso) })
    .eq("order_id", orderId).eq("state", "pending");
  if (error) throw dbError("mark commission clearing", error);
}

// Refund or chargeback (reverse_commission in partners.sql). Unpaid
// commission is voided and leaves lifetime sales in the same transaction;
// already-paid commission becomes a one-time deduction on the next payout
// instead. Safe to call more than once for the same order and reason.
export type ReverseOutcome = "none" | "voided" | "deducted" | "already";

// All outcomes are valid and idempotent; 'none' means no commission exists
// for the order (yet), which a chargeback caller may need to retry on.
export async function reverseCommission(orderId: string, reason: "refund" | "chargeback"): Promise<ReverseOutcome> {
  const { data, error } = await db().rpc("reverse_commission", { p_order: orderId, p_reason: reason });
  if (error) throw dbError("reverse_commission", error);
  return data as ReverseOutcome;
}

export async function clearDueCommissions(nowIso: string = new Date().toISOString()): Promise<number> {
  const { data, error } = await db().from("commissions").update({ state: "payable", payable_at: nowIso })
    .eq("state", "clearing").lte("clears_at", nowIso).select("id");
  if (error) throw dbError("clear due commissions", error);
  return ((data as unknown[] | null) ?? []).length;
}

// Suspension: everything not yet paid is forfeited; a positive cash carry is dropped.
export async function forfeitUnpaid(partnerId: string): Promise<void> {
  const { error: e1 } = await db().from("commissions").update({ state: "void", voided_at: new Date().toISOString() })
    .eq("partner_id", partnerId).in("state", ["pending", "clearing", "payable"]);
  if (e1) throw dbError("forfeit unpaid commissions", e1);
  const { error: e2 } = await db().from("partners").update({ cash_carry_cents: 0 }).eq("id", partnerId).gt("cash_carry_cents", 0);
  if (e2) throw dbError("forfeit cash carry", e2);
}

export async function creditBalance(customerId: string): Promise<number> {
  const { data, error } = await db().from("store_credit_ledger").select("amount_cents").eq("customer_id", customerId);
  if (error) throw dbError("credit balance select", error);
  return ((data as { amount_cents: number }[] | null) ?? []).reduce((s, r) => s + r.amount_cents, 0);
}

export async function spendCredit(customerId: string, cents: number, orderId: string): Promise<boolean> {
  if (cents <= 0) return true;
  const { data, error } = await db().rpc("spend_store_credit", { p_customer: customerId, p_cents: cents, p_order: orderId });
  if (error) throw dbError("spend_store_credit", error);
  return data === true;
}

export async function refundCredit(customerId: string, cents: number, orderId: string): Promise<void> {
  if (cents <= 0) return;
  const { error } = await db().from("store_credit_ledger").insert({ customer_id: customerId, amount_cents: cents, reason: "order_refund", ref_id: orderId });
  if (error && !isDuplicate(error)) throw dbError("credit refund insert", error);
}

type RunPartner = { id: string; customer_id: string; payout_pref: PayoutPref; split_cash_pct: number; cash_carry_cents: number; w9_checked_at: string | null; payout_method: string | null; payout_details_hint?: string | null };
export type RunResult = { partnerId: string; cashCents: number; creditValueCents: number; carryCents: number };
export type RunFailure = { partnerId: string; error: string };

// One payout run per date (1st and 15th). A run that started but never
// finished (finished_at null — e.g. the process died mid-run, or the prior
// attempt had per-partner failures) is resumed rather than skipped; a
// finished run is a true no-op. Each partner's share is settled in its own
// DB transaction (apply_partner_payout in partners.sql, called after
// computing the split here in TS); one partner's failure is recorded and
// does not stop the others. If any partner failed, finished_at is left
// null (only error is written) so a same-day rerun resumes and retries
// just the failed partners — the successful ones are skipped because they
// already have a payouts row for this run_date.
export async function runPayouts(runDate: string): Promise<{ skipped: boolean; results: RunResult[]; failures: RunFailure[] }> {
  const { error: runError } = await db().from("payout_runs").insert({ run_date: runDate });
  if (runError) {
    if (!isDuplicate(runError)) throw dbError("payout run insert", runError);
    const { data: existing, error: selError } = await db().from("payout_runs").select("finished_at").eq("run_date", runDate).maybeSingle();
    if (selError) throw dbError("payout run lookup", selError);
    const finishedAt = (existing as { finished_at: string | null } | null)?.finished_at ?? null;
    if (finishedAt) return { skipped: true, results: [], failures: [] };
    // else: started but never finished — fall through and resume it.
  }

  const { data: partners, error: partnersError } = await db().from("partners")
    .select("id, customer_id, payout_pref, split_cash_pct, cash_carry_cents, w9_checked_at, payout_method, payout_details_hint").eq("status", "approved");
  if (partnersError) throw dbError("partners select", partnersError);

  const { data: already, error: alreadyError } = await db().from("payouts").select("partner_id").eq("run_date", runDate);
  if (alreadyError) throw dbError("existing payouts select", alreadyError);
  const done = new Set(((already as { partner_id: string }[] | null) ?? []).map((r) => r.partner_id));

  const results: RunResult[] = [];
  const failures: RunFailure[] = [];

  for (const p of (partners as RunPartner[] | null) ?? []) {
    if (done.has(p.id)) continue;
    try {
      const { data: payable, error: payErr } = await db().from("commissions").select("id, amount_cents").eq("partner_id", p.id).eq("state", "payable");
      if (payErr) throw dbError("payable commissions select", payErr);
      const { data: deductions, error: dedErr } = await db().from("commission_adjustments").select("id, amount_cents").eq("partner_id", p.id).is("settled_run", null);
      if (dedErr) throw dbError("deductions select", dedErr);
      const pay = (payable as { id: string; amount_cents: number }[] | null) ?? [];
      const ded = (deductions as { id: string; amount_cents: number }[] | null) ?? [];
      if (pay.length === 0 && ded.length === 0 && p.cash_carry_cents === 0) continue;

      const net = pay.reduce((s, c) => s + c.amount_cents, 0) + ded.reduce((s, d) => s + d.amount_cents, 0);
      const r = splitPayout({ netCents: net, carryCents: p.cash_carry_cents, pref: p.payout_pref, splitCashPct: p.split_cash_pct, w9Checked: !!p.w9_checked_at });

      const { error: applyError } = await db().rpc("apply_partner_payout", {
        p_partner: p.id,
        p_run_date: runDate,
        p_commission_ids: pay.map((c) => c.id),
        p_adjustment_ids: ded.map((d) => d.id),
        p_expected_carry: p.cash_carry_cents,
        p_cash_cents: r.cashCents,
        p_credit_value_cents: r.creditValueCents,
        p_new_carry: r.newCarryCents,
        p_method: p.payout_method,
        p_customer: p.customer_id,
      });
      if (applyError) throw dbError("apply_partner_payout", applyError);
      if (r.cashCents > 0) {
        // Remember where this cash is meant to go; the Payouts page flags a later change.
        const { error: snapErr } = await db().from("payouts").update({ details_hint: p.payout_details_hint ?? null })
          .eq("partner_id", p.id).eq("run_date", runDate);
        if (snapErr) throw dbError("payout details snapshot", snapErr);
      }

      results.push({ partnerId: p.id, cashCents: r.cashCents, creditValueCents: r.creditValueCents, carryCents: r.newCarryCents });
    } catch (err) {
      failures.push({ partnerId: p.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const { error: finishError } = await db().from("payout_runs")
    .update(
      failures.length > 0
        ? { error: JSON.stringify(failures).slice(0, 1000) }
        : { finished_at: new Date().toISOString(), error: null },
    )
    .eq("run_date", runDate);
  if (finishError) throw dbError("payout run finish", finishError);

  return { skipped: false, results, failures };
}

// Run dates before `beforeDate` whose payout_runs row never finished — a
// process that died mid-run, or a run left with per-partner failures. The
// daily cron resumes each of these (via runPayouts) on any day, not just
// the 1st/15th, so a stuck run self-heals instead of waiting for the next
// scheduled date.
export async function listUnfinishedPayoutRuns(beforeDate: string): Promise<string[]> {
  const { data, error } = await db().from("payout_runs").select("run_date").is("finished_at", null).lt("run_date", beforeDate);
  if (error) throw dbError("unfinished payout runs select", error);
  return ((data as { run_date: string }[] | null) ?? []).map((r) => r.run_date);
}

type PendingShipped = { order_id: string; orders: { status: string; shipped_at: string | null } };
export type SweepResult = { swept: number; errors: string[] };

// A commission can be left in 'pending' if the shipped-order step that
// should have called markCommissionClearing never ran (an outage, a crash
// between the order transition and this call). The cron sweeps any
// commission whose order has since reached 'shipped', starting its 15-day
// hold from the order's own shipped_at; one order's failure does not stop
// the sweep of the rest.
export async function sweepShippedCommissions(): Promise<SweepResult> {
  const { data, error } = await db().from("commissions")
    .select("order_id, orders!inner(status, shipped_at)").eq("state", "pending").eq("orders.status", "shipped");
  if (error) throw dbError("sweep shipped commissions select", error);
  const rows = (data as unknown as PendingShipped[] | null) ?? [];
  const errors: string[] = [];
  let swept = 0;
  for (const r of rows) {
    try {
      await markCommissionClearing(r.order_id, r.orders.shipped_at ?? new Date().toISOString());
      swept++;
    } catch (err) {
      errors.push(`${r.order_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { swept, errors };
}

export async function listQueuedPayouts(): Promise<PayoutRow[]> {
  const { data, error } = await db().from("payouts").select("*, partners(code, payout_method, payout_details_hint, customer_id)")
    .eq("status", "queued").order("run_date");
  if (error) throw dbError("queued payouts select", error);
  return (data as PayoutRow[] | null) ?? [];
}

export async function markPayoutPaid(id: string, reference: string): Promise<PayoutRow | null> {
  const { data, error } = await db().from("payouts").update({ status: "paid", reference, paid_at: new Date().toISOString() })
    .eq("id", id).eq("status", "queued").select("*, partners(code, payout_method, payout_details_hint, customer_id)").maybeSingle();
  if (error) throw dbError("mark payout paid", error);
  return (data as PayoutRow | null) ?? null;
}

export type RunSummary = { runDate: string; creditCents: number; creditPartners: number; finished: boolean; error: string | null };

export async function latestRunSummary(): Promise<RunSummary | null> {
  const { data: run, error: runErr } = await db().from("payout_runs").select("run_date, error, finished_at").order("run_date", { ascending: false }).limit(1).maybeSingle();
  if (runErr) throw dbError("latest run select", runErr);
  const row = run as { run_date: string; error: string | null; finished_at: string | null } | null;
  if (!row) return null;
  const { data, error } = await db().from("payouts").select("credit_cents").eq("run_date", row.run_date).gt("credit_cents", 0);
  if (error) throw dbError("latest run payouts select", error);
  const rows = (data as { credit_cents: number }[] | null) ?? [];
  return {
    runDate: row.run_date,
    creditCents: rows.reduce((s, r) => s + r.credit_cents, 0),
    creditPartners: rows.length,
    finished: !!row.finished_at,
    error: row.error ?? null,
  };
}

// Shared by the warning below and the owner Payouts page eyebrow — a
// payout_runs.run_date ("2026-10-15") is a date-only ISO string, which the
// spec parses as UTC midnight; formatting with timeZone: "UTC" keeps that
// date from shifting a day in a non-UTC server/browser locale.
export function formatRunDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// Pure — no DB access, safe to unit-test directly. null means the owner
// Payouts page shows nothing; a finished run with no error is the only
// silent case. Otherwise explains why the run is stuck: payout_runs.error
// is JSON of RunFailure[] written by runPayouts (see above); anything else
// (or unparseable JSON) is shown as raw text instead of counted partners.
export function payoutRunWarning(run: Pick<RunSummary, "runDate" | "finished" | "error"> | null): string | null {
  if (!run || (run.finished && !run.error)) return null;
  let failures: RunFailure[] | null = null;
  if (run.error) {
    try {
      const parsed = JSON.parse(run.error);
      if (Array.isArray(parsed)) failures = parsed as RunFailure[];
    } catch {
      failures = null;
    }
  }
  const who = failures ? `${failures.length} partner${failures.length === 1 ? "" : "s"}` : "some partners";
  const detail = failures ? failures.map((f) => f.error).join("; ") : (run.error ?? "no error recorded");
  const short = detail.length > 160 ? `${detail.slice(0, 160)}…` : detail;
  return `The payout run for ${formatRunDate(run.runDate)} didn't finish — ${who} failed. It will retry automatically in tonight's daily run; details: ${short}`;
}

export async function payableByPartner(): Promise<Record<string, number>> {
  const { data } = await db().from("commissions").select("partner_id, amount_cents").eq("state", "payable");
  const out: Record<string, number> = {};
  for (const r of (data as { partner_id: string; amount_cents: number }[] | null) ?? []) out[r.partner_id] = (out[r.partner_id] ?? 0) + r.amount_cents;
  return out;
}

export async function partnerLedger(partnerId: string): Promise<{
  byState: Record<CommissionState, number>; recent: CommissionRow[]; payouts: PayoutRow[]; ordersLast30: number; receivedCents: number;
}> {
  const { data: all, error: allErr } = await db().from("commissions").select("state, amount_cents, created_at").eq("partner_id", partnerId);
  if (allErr) throw dbError("ledger commissions select", allErr);
  const byState: Record<CommissionState, number> = { pending: 0, clearing: 0, payable: 0, paid: 0, void: 0 };
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  let ordersLast30 = 0;
  for (const c of (all as { state: CommissionState; amount_cents: number; created_at: string }[] | null) ?? []) {
    byState[c.state] += c.amount_cents;
    if (c.state !== "void" && new Date(c.created_at).getTime() >= since) ordersLast30++;
  }
  const { data: recent, error: recentErr } = await db().from("commissions").select("*, orders(order_number, created_at)")
    .eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(20);
  if (recentErr) throw dbError("ledger recent commissions select", recentErr);
  const { data: payouts, error: payoutsErr } = await db().from("payouts").select("*").eq("partner_id", partnerId).order("run_date", { ascending: false }).limit(12);
  if (payoutsErr) throw dbError("ledger payouts select", payoutsErr);
  const { data: allPayouts, error: allPayoutsErr } = await db().from("payouts").select("cash_cents, credit_cents, status").eq("partner_id", partnerId);
  if (allPayoutsErr) throw dbError("ledger payout totals select", allPayoutsErr);
  return {
    byState, recent: (recent as CommissionRow[] | null) ?? [], payouts: (payouts as PayoutRow[] | null) ?? [], ordersLast30,
    receivedCents: receivedCents((allPayouts as Pick<PayoutRow, "cash_cents" | "credit_cents" | "status">[] | null) ?? []),
  };
}
