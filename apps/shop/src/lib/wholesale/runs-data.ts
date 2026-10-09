import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { OrderStatus } from "@/lib/order-status";
import { balanceTiming, daysSince, kitsByStrength, PAST_CUTOFF_ALERT_DAYS, strengthKey, type RunLine, type RunOrder } from "@/lib/wholesale/runs";
import { cutoffFor } from "@/lib/wholesale/rules";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { catalogContent } from "@/data/catalog";
import { compoundTitle } from "@/lib/catalog";
import { addDays, localDate } from "@/lib/today/time";
import type { WholesaleTodoInput } from "@/lib/today/todos";

const db = () => getSupabaseAdminClient();
const fail = (what: string, e: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(e)}`); };
const LINE_COLS = "id, slug, variant_id, kits_ordered, extra_boxes, supplier, cost_cents, supplier_ref, ordered_at, lot_id, result, result_at, fail_note";

export type RunRow = { id: string; number: string; cutoff_on: string; notes: string; created_at: string };
export type RunEventKind = "line_ordered" | "lot_linked" | "line_passed" | "line_failed" | "line_resourced" | "balance_due"
  | "reminder_sent" | "overdue_alerted" | "forfeited" | "order_cancelled" | "lot_failed_emailed" | "past_cutoff_alerted" | "note";
export type RunEvent = { id: string; kind: RunEventKind; detail: string | null; line_id: string | null; order_id: string | null; created_at: string };
export type RunOrderRow = RunOrder & {
  email: string; ship_name: string; customer_id: string; deposit_cents: number; balance_cents: number; total_cents: number;
  balance_due_at: string | null; balance_session_id: string | null; created_at: string;
};
export type DraftLot = { id: string; lot_number: string; counted_qty: number; damaged_qty: number; coa_path: string | null; received_at: string };

export async function ensureRun(cutoff: string): Promise<string> {
  const { data, error } = await db().rpc("ensure_production_run", { p_cutoff: cutoff });
  if (error || !data) fail("ensure run", error);
  return data as string;
}

export async function listRuns(): Promise<RunRow[]> {
  const { data, error } = await db().from("production_runs").select("id, number, cutoff_on, notes, created_at").order("cutoff_on", { ascending: false }).limit(100);
  if (error) fail("runs read", error);
  return (data ?? []) as RunRow[];
}

export async function getRun(id: string): Promise<RunRow | null> {
  const { data, error } = await db().from("production_runs").select("id, number, cutoff_on, notes, created_at").eq("id", id).maybeSingle();
  if (error) fail("run read", error);
  return (data as RunRow | null) ?? null;
}

export async function runLines(runId: string): Promise<RunLine[]> {
  const { data, error } = await db().from("production_run_lines").select(LINE_COLS).eq("run_id", runId).order("slug").order("variant_id");
  if (error) fail("run lines read", error);
  return (data ?? []) as RunLine[];
}

export async function lineById(id: string): Promise<(RunLine & { run_id: string }) | null> {
  const { data, error } = await db().from("production_run_lines").select(`${LINE_COLS}, run_id`).eq("id", id).maybeSingle();
  if (error) fail("run line read", error);
  return (data as (RunLine & { run_id: string }) | null) ?? null;
}

const ORDER_COLS = "id, order_number, status, email, ship_name, customer_id, deposit_cents, balance_cents, total_cents, balance_due_at, balance_session_id, created_at, order_items(compound_slug, variant_id, quantity)";
type RawOrder = Omit<RunOrderRow, "items"> & { order_items: RunOrder["items"] };
const toRunOrder = (o: RawOrder): RunOrderRow => { const { order_items, ...rest } = o; return { ...rest, items: order_items ?? [] }; };

// Every wholesale order that reached its deposit, for one run (cutoff) or for many.
export async function runOrders(cutoffs: string[]): Promise<Array<RunOrderRow & { wholesale_cutoff_on: string }>> {
  if (cutoffs.length === 0) return [];
  const { data, error } = await db().from("orders").select(`${ORDER_COLS}, wholesale_cutoff_on`)
    .eq("channel", "wholesale").in("wholesale_cutoff_on", cutoffs)
    .in("status", ["deposit_paid", "balance_due", "paid", "shipped", "cancelled", "refunded"] satisfies OrderStatus[])
    .not("deposit_paid_at", "is", null).order("created_at");
  if (error) fail("run orders read", error);
  return ((data ?? []) as Array<RawOrder & { wholesale_cutoff_on: string }>).map((o) => ({ ...toRunOrder(o), wholesale_cutoff_on: o.wholesale_cutoff_on }));
}

export async function balanceDueOrders(): Promise<Array<RunOrderRow & { wholesale_cutoff_on: string }>> {
  const { data, error } = await db().from("orders").select(`${ORDER_COLS}, wholesale_cutoff_on`).eq("channel", "wholesale").eq("status", "balance_due");
  if (error) fail("balance due read", error);
  return ((data ?? []) as Array<RawOrder & { wholesale_cutoff_on: string }>).map((o) => ({ ...toRunOrder(o), wholesale_cutoff_on: o.wholesale_cutoff_on }));
}

export async function runEvents(runId: string): Promise<RunEvent[]> {
  const { data, error } = await db().from("production_run_events").select("id, kind, detail, line_id, order_id, created_at")
    .eq("run_id", runId).order("created_at", { ascending: false }).limit(200);
  if (error) fail("run events read", error);
  return (data ?? []) as RunEvent[];
}

export async function logEvent(e: { runId: string; kind: RunEventKind; lineId?: string | null; orderId?: string | null; detail?: string | null; actorId?: string | null }): Promise<void> {
  const { error } = await db().from("production_run_events").insert({
    run_id: e.runId, kind: e.kind, line_id: e.lineId ?? null, order_id: e.orderId ?? null, detail: e.detail ?? null, actor_id: e.actorId ?? null,
  });
  if (error) fail(`run event ${e.kind}`, error);
}

// Once-only entries (cron, emails): false = already recorded, do nothing.
export async function logOnce(e: { runId: string; kind: RunEventKind; key: string; orderId?: string | null; lineId?: string | null; detail?: string | null }): Promise<boolean> {
  const { error } = await db().from("production_run_events").insert({
    run_id: e.runId, kind: e.kind, event_key: e.key, order_id: e.orderId ?? null, line_id: e.lineId ?? null, detail: e.detail ?? null,
  });
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  return fail(`run event ${e.kind}`, error);
}

export async function recordLineOrder(v: { runId: string; slug: string; variantId: string; kits: number; extraBoxes: number; supplier: string; costCents: number; ref: string | null }, actorId: string): Promise<void> {
  const { data, error } = await db().from("production_run_lines").upsert({
    run_id: v.runId, slug: v.slug, variant_id: v.variantId, kits_ordered: v.kits, extra_boxes: v.extraBoxes,
    supplier: v.supplier, cost_cents: v.costCents, supplier_ref: v.ref, ordered_at: new Date().toISOString(),
  }, { onConflict: "run_id,slug,variant_id" }).select("id").single();
  if (error || !data) fail("run line save", error);
  await logEvent({ runId: v.runId, lineId: (data as { id: string }).id, kind: "line_ordered", actorId,
    detail: `${v.kits} kits + ${v.extraBoxes} extra box(es) · ${v.supplier}${v.ref ? ` · ${v.ref}` : ""}` });
}

// Supplier box prices (supplier-prices.sql, synced from AIOS) for the given
// strengths: "slug/variant_id" → { supplier → cents per box of 10 vials }.
export async function supplierPricesFor(keys: string[]): Promise<Record<string, Record<string, number>>> {
  const slugs = [...new Set(keys.map((k) => k.split("/")[0]))];
  if (slugs.length === 0) return {};
  const { data, error } = await db().from("supplier_prices").select("supplier, slug, variant_id, box_cents").in("slug", slugs);
  if (error) fail("supplier prices read", error);
  const out: Record<string, Record<string, number>> = {};
  for (const r of (data ?? []) as Array<{ supplier: string; slug: string; variant_id: string; box_cents: number }>) {
    const k = `${r.slug}/${r.variant_id}`;
    if (keys.includes(k)) (out[k] ??= {})[r.supplier] = r.box_cents;
  }
  return out;
}

// Every supplier named on any run line, newest first (Record order drop-down).
export async function pastSuppliers(): Promise<string[]> {
  const { data, error } = await db().from("production_run_lines").select("supplier").not("supplier", "is", null).order("ordered_at", { ascending: false }).limit(500);
  if (error) fail("past suppliers read", error);
  return [...new Set(((data ?? []) as Array<{ supplier: string }>).map((r) => r.supplier))];
}

// Draft lots of a strength, not linked to another run line yet.
export async function draftLotsFor(slug: string, variantId: string): Promise<DraftLot[]> {
  const { data, error } = await db().from("lots").select("id, lot_number, counted_qty, damaged_qty, coa_path, received_at")
    .eq("slug", slug).eq("variant_id", variantId).eq("status", "draft").order("received_at", { ascending: false });
  if (error) fail("draft lots read", error);
  const { data: used, error: e2 } = await db().from("production_run_lines").select("lot_id").not("lot_id", "is", null);
  if (e2) fail("linked lots read", e2);
  const taken = new Set(((used ?? []) as Array<{ lot_id: string }>).map((u) => u.lot_id));
  return ((data ?? []) as DraftLot[]).filter((l) => !taken.has(l.id));
}

export async function linkLot(lineId: string, lotId: string, actorId: string): Promise<boolean> {
  const { data, error } = await db().from("production_run_lines").update({ lot_id: lotId })
    .eq("id", lineId).eq("result", "pending").is("lot_id", null).not("ordered_at", "is", null).select("run_id");
  if (error) fail("lot link", error);
  const row = (data as Array<{ run_id: string }> | null)?.[0];
  if (!row) return false;
  await logEvent({ runId: row.run_id, lineId, kind: "lot_linked", actorId });
  return true;
}

// The run line's supplier order is what this lot cost: copied onto the lot
// unless a cost was already recorded when it was received (lot-costs.sql).
// Freight and labels not recorded on the lot get the AIOS defaults (per box,
// per counted vial), as Receive lot pre-fills them.
export async function fillLotCostFromLine(lotId: string, line: { supplier: string | null; cost_cents: number | null; kits_ordered?: number | null; extra_boxes?: number },
  defaults?: { inboundPerBoxCents: number; labelPerVialCents: number }): Promise<void> {
  if (line.cost_cents != null) {
    const { error } = await db().from("lots").update({ supplier: line.supplier, cost_cents: line.cost_cents })
      .eq("id", lotId).is("cost_cents", null);
    if (error) fail("lot cost from run line", error);
  }
  if (!defaults) return;
  const boxes = (line.kits_ordered ?? 0) + (line.extra_boxes ?? 0);
  const { data: lot, error: e1 } = await db().from("lots").select("counted_qty").eq("id", lotId).single();
  if (e1 || !lot) fail("lot read for freight", e1);
  const vials = (lot as { counted_qty: number }).counted_qty;
  const fills: Array<["freight_cents" | "label_cents", number]> = [["freight_cents", boxes * defaults.inboundPerBoxCents], ["label_cents", vials * defaults.labelPerVialCents]];
  for (const [col, cents] of fills) {
    const { error } = await db().from("lots").update({ [col]: cents }).eq("id", lotId).is(col, null);
    if (error) fail(`lot ${col} from defaults`, error);
  }
}

export async function passLine(lineId: string, actorId: string): Promise<{ ok: true; held: number; short: string[] } | { ok: false; reason: string }> {
  const { data, error } = await db().rpc("pass_run_line", { p_line: lineId, p_actor: actorId });
  if (error || !data) fail("pass run line", error);
  return data as { ok: true; held: number; short: string[] } | { ok: false; reason: string };
}

export async function failLine(lineId: string, note: string, actorId: string): Promise<string | null> {
  const { data, error } = await db().from("production_run_lines").update({ result: "failed", result_at: new Date().toISOString(), fail_note: note })
    .eq("id", lineId).eq("result", "pending").not("lot_id", "is", null).select("run_id");
  if (error) fail("line fail", error);
  const row = (data as Array<{ run_id: string }> | null)?.[0];
  if (!row) return null;
  await logEvent({ runId: row.run_id, lineId, kind: "line_failed", detail: note, actorId });
  return row.run_id;
}

// Back to "to order" with a new supplier order to record; the failed lot stays a draft (never sold).
export async function resourceLine(lineId: string, actorId: string): Promise<boolean> {
  const { data, error } = await db().from("production_run_lines")
    .update({ result: "pending", result_at: null, lot_id: null, ordered_at: null, fail_note: null })
    .eq("id", lineId).eq("result", "failed").select("run_id");
  if (error) fail("line re-source", error);
  const row = (data as Array<{ run_id: string }> | null)?.[0];
  if (!row) return false;
  await logEvent({ runId: row.run_id, lineId, kind: "line_resourced", actorId });
  return true;
}

export async function saveRunNotes(runId: string, notes: string): Promise<void> {
  const { error } = await db().from("production_runs").update({ notes, updated_at: new Date().toISOString() }).eq("id", runId);
  if (error) fail("run notes save", error);
}

export async function runByCutoff(cutoff: string): Promise<RunRow | null> {
  const { data, error } = await db().from("production_runs").select("id, number, cutoff_on, notes, created_at").eq("cutoff_on", cutoff).maybeSingle();
  if (error) fail("run read", error);
  return (data as RunRow | null) ?? null;
}

// Cutoffs with deposit-paid orders but no run row yet (the cron creates them).
export async function cutoffsWithoutRuns(): Promise<string[]> {
  const { data, error } = await db().from("orders").select("wholesale_cutoff_on").eq("channel", "wholesale").not("deposit_paid_at", "is", null);
  if (error) fail("cutoffs read", error);
  const cutoffs = [...new Set(((data ?? []) as Array<{ wholesale_cutoff_on: string | null }>).map((o) => o.wholesale_cutoff_on).filter((c): c is string => !!c))];
  if (cutoffs.length === 0) return [];
  const { data: runs, error: e2 } = await db().from("production_runs").select("cutoff_on").in("cutoff_on", cutoffs);
  if (e2) fail("runs read", e2);
  const have = new Set(((runs ?? []) as Array<{ cutoff_on: string }>).map((r) => r.cutoff_on));
  return cutoffs.filter((c) => !have.has(c));
}

// ---------- Today (lib/today/today.ts reads this; no second query path) ----------
const strengthLabel = (slug: string, variantId: string): string => {
  const c = catalogContent.find((x) => x.slug === slug);
  const strength = variantId.replace(/^(\d+(?:\.\d+)?)(mg|mcg|iu)$/i, (_, n: string, u: string) => `${n} ${u.toLowerCase() === "iu" ? "IU" : u}`);
  return `${c ? compoundTitle(c) : slug} ${strength}`;
};

export async function wholesaleTodos(nowMs: number): Promise<WholesaleTodoInput> {
  const today = localDate(nowMs);
  const [s, runs, due] = await Promise.all([getWholesaleSettings(), listRuns(), balanceDueOrders()]);
  const cutoff = cutoffFor(today, { runDays: s.runDays, override: s.nextCutoffOverride });
  const recent = runs.filter((r) => r.cutoff_on >= addDays(today, -120));
  const orders = await runOrders(recent.map((r) => r.cutoff_on));
  const out: WholesaleTodoInput = { collecting: null, toOrder: [], failed: [], balances: { due: due.length, overdue: 0 } };
  for (const o of due) if (o.balance_due_at && nowMs >= balanceTiming(o.balance_due_at, s.balanceDays).overdueAt) out.balances.overdue++;
  for (const r of recent) {
    const mine = orders.filter((o) => o.wholesale_cutoff_on === r.cutoff_on);
    if (r.cutoff_on === cutoff) {
      const live = mine.filter((o) => o.status === "deposit_paid");
      out.collecting = { id: r.id, number: r.number, cutoff: r.cutoff_on, orders: live.length, kits: [...kitsByStrength(live).values()].reduce((a, b) => a + b, 0) };
      continue;
    }
    if (today <= r.cutoff_on) continue;
    const lines = await runLines(r.id);
    for (const l of lines) if (l.result === "failed") out.failed.push({ runId: r.id, number: r.number, label: strengthLabel(l.slug, l.variant_id) });
    const days = daysSince(r.cutoff_on, today);
    if (days < PAST_CUTOFF_ALERT_DAYS) continue;
    const missing = [...kitsByStrength(mine.filter((o) => o.status === "deposit_paid")).keys()]
      .filter((k) => !lines.some((l) => strengthKey(l.slug, l.variant_id) === k && (l.ordered_at || l.result === "passed")));
    if (missing.length) out.toOrder.push({ id: r.id, number: r.number, days, strengths: missing.map((k) => { const [slug, v] = k.split("/"); return strengthLabel(slug, v); }) });
  }
  return out;
}
