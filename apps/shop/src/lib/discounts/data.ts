import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { normalizeAdminCode, type DiscountCodeRow, type StoredStatus } from "@/lib/discounts/rules";
import type { ClaimResult } from "@/lib/discounts/messages";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };

// PostgREST returns at most 1,000 rows per request; a batch can hold 5,000 codes.
const PAGE_ROWS = 1000;
async function allRows<T>(what: string, page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await page(from, from + PAGE_ROWS - 1);
    if (error) fail(what, error);
    const rows = (data as T[] | null) ?? [];
    out.push(...rows);
    if (rows.length < PAGE_ROWS) return out;
  }
}

// ---------- settings ----------
export async function getDiscountCap(): Promise<number> {
  const { data, error } = await db().from("shop_settings").select("max_discount_pct").eq("id", true).single();
  if (error || !data) fail("discount cap read", error ?? "no shop_settings row");
  return (data as { max_discount_pct: number }).max_discount_pct;
}

export async function setDiscountCap(pct: number, actor: string): Promise<void> {
  const before = await getDiscountCap();
  const { error } = await db().from("shop_settings").update({ max_discount_pct: pct, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) fail("discount cap update", error);
  await logEvent({ kind: "cap_changed", detail: `Cap ${before}% → ${pct}%`, actor });
}

// ---------- codes ----------
export async function findCodeByText(typed: string): Promise<DiscountCodeRow | null> {
  const { data, error } = await db().from("discount_codes").select("*").eq("code", normalizeAdminCode(typed)).maybeSingle();
  if (error) fail("discount code lookup", error);
  return (data as DiscountCodeRow | null) ?? null;
}

export async function getCodeById(id: string): Promise<DiscountCodeRow | null> {
  const { data, error } = await db().from("discount_codes").select("*").eq("id", id).maybeSingle();
  if (error) fail("discount code read", error);
  return (data as DiscountCodeRow | null) ?? null;
}

export async function listCodes(): Promise<DiscountCodeRow[]> {
  return allRows<DiscountCodeRow>("discount codes list", (from, to) =>
    db().from("discount_codes").select("*").order("created_at", { ascending: false }).order("id").range(from, to));
}

export type BatchRow = { id: string; prefix: string; size: number; note: string | null; created_at: string };
export async function getBatch(id: string): Promise<BatchRow | null> {
  const { data, error } = await db().from("discount_batches").select("*").eq("id", id).maybeSingle();
  if (error) fail("batch read", error);
  return (data as BatchRow | null) ?? null;
}
export async function listBatches(): Promise<BatchRow[]> {
  const { data, error } = await db().from("discount_batches").select("*");
  if (error) fail("batches list", error);
  return (data as BatchRow[] | null) ?? [];
}

export type CodeStats = { uses: number; held: number; revenueCents: number; discountCents: number; cappedOrders: number };
export async function codeStatsById(): Promise<Map<string, CodeStats>> {
  type Raw = { code_id: string; uses: number; held: number; revenue_cents: number; discount_cents: number; capped_orders: number };
  const rows = await allRows<Raw>("discount code stats", (from, to) => db().from("discount_code_stats").select("*").order("code_id").range(from, to));
  const out = new Map<string, CodeStats>();
  for (const r of rows) {
    out.set(r.code_id, { uses: Number(r.uses), held: Number(r.held), revenueCents: Number(r.revenue_cents), discountCents: Number(r.discount_cents), cappedOrders: Number(r.capped_orders) });
  }
  return out;
}

export type Dashboard = {
  uses_30d: number; uses_prior_30d: number; revenue_30d: number; goods_revenue_30d: number; orders_30d: number;
  discount_30d: number; capped_30d: number; trimmed_30d: number;
};
export async function discountDashboard(): Promise<Dashboard> {
  const { data, error } = await db().rpc("discount_dashboard");
  if (error || !data) fail("discount dashboard", error ?? "empty");
  return data as Dashboard;
}

// Held + used uses of a code, and of this customer (across the batch when the code is in one).
export async function useCounts(code: Pick<DiscountCodeRow, "id" | "batch_id">, customerId: string): Promise<{ total: number; mine: number }> {
  const { data, error } = await db().rpc("discount_code_use_counts", { p_code: code.id, p_customer: customerId });
  if (error || !data) fail("discount_code_use_counts", error ?? "empty");
  const r = data as { total: number; mine: number };
  return { total: Number(r.total), mine: Number(r.mine) };
}

export async function isDiscountCodeTaken(code: string): Promise<boolean> {
  const c = normalizeAdminCode(code);
  const { data, error } = await db().from("discount_codes").select("id").eq("code", c).maybeSingle();
  if (error) fail("code check", error);
  if (data) return true;
  const { data: p, error: pe } = await db().from("partners").select("id").eq("code", c).maybeSingle();
  if (pe) fail("partner code check", pe);
  if (p) return true;
  const { data: a, error: ae } = await db().from("partner_code_aliases").select("code").eq("code", c).maybeSingle();
  if (ae) fail("partner alias check", ae);
  return !!a;
}

export type CodeInput = Omit<DiscountCodeRow, "id" | "status" | "batch_id" | "created_by" | "created_at" | "code"> & { status: StoredStatus };

export async function insertCode(code: string, input: CodeInput, actor: string): Promise<{ id: string } | { error: "taken" }> {
  const { data, error } = await db().from("discount_codes").insert({ ...input, code: normalizeAdminCode(code), created_by: actor }).select("id").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") return { error: "taken" };
    fail("discount code insert", error);
  }
  const id = (data as { id: string }).id;
  await logEvent({ codeId: id, kind: "created", actor });
  return { id };
}

export async function updateCode(id: string, patch: Partial<CodeInput>, detail: string, actor: string): Promise<void> {
  const { error } = await db().from("discount_codes").update(patch).eq("id", id);
  if (error) fail("discount code update", error);
  await logEvent({ codeId: id, kind: "edited", detail, actor });
}

export async function updateBatch(batchId: string, patch: Partial<CodeInput>, detail: string, actor: string): Promise<void> {
  const { error } = await db().from("discount_codes").update(patch).eq("batch_id", batchId);
  if (error) fail("batch update", error);
  if ("note" in patch) {
    const { error: ne } = await db().from("discount_batches").update({ note: patch.note ?? null }).eq("id", batchId);
    if (ne) fail("batch note update", ne);
  }
  await logEvent({ batchId, kind: "edited", detail, actor });
}

// Pause / resume / end. `from` guards against a stale page.
export async function setCodeState(target: { codeId: string } | { batchId: string }, from: StoredStatus, to: StoredStatus, actor: string): Promise<boolean> {
  const update = db().from("discount_codes").update({ status: to });
  // Ending a batch ends every code in it, paused ones too.
  const q = "batchId" in target && to === "ended" ? update.in("status", ["active", "paused"]) : update.eq("status", from);
  const { data, error } = await ("codeId" in target ? q.eq("id", target.codeId) : q.eq("batch_id", target.batchId)).select("id");
  if (error) fail("discount code state", error);
  const n = Array.isArray(data) ? data.length : 0;
  const moved = n > 0;
  if (moved) await logEvent({ ...target, kind: to === "paused" ? "paused" : to === "ended" ? "ended" : "resumed", detail: "batchId" in target ? `${n} codes` : undefined, actor });
  return moved;
}

export async function insertBatch(prefix: string, codes: string[], input: CodeInput, actor: string): Promise<{ id: string } | { error: "taken" }> {
  const { data: b, error: be } = await db().from("discount_batches").insert({ prefix, size: codes.length, note: input.note, created_by: actor }).select("id").single();
  if (be || !b) fail("batch insert", be);
  const batchId = (b as { id: string }).id;
  for (let i = 0; i < codes.length; i += 500) {
    const rows = codes.slice(i, i + 500).map((code) => ({ ...input, code, max_uses: 1, batch_id: batchId, created_by: actor }));
    const { error } = await db().from("discount_codes").insert(rows);
    if (error) {
      // All or nothing: never leave part of a batch live.
      await removeBatch(batchId);
      if ((error as { code?: string }).code === "23505") return { error: "taken" };
      fail("batch codes insert", error);
    }
  }
  await logEvent({ batchId, kind: "created", detail: `${codes.length} codes`, actor });
  return { id: batchId };
}

async function removeBatch(batchId: string): Promise<void> {
  const { error: ce } = await db().from("discount_codes").delete().eq("batch_id", batchId);
  if (ce) fail(`removing half-made batch ${batchId} (its codes may be live - end them in admin)`, ce);
  const { error: be } = await db().from("discount_batches").delete().eq("id", batchId);
  if (be) fail(`removing half-made batch ${batchId}`, be);
}

export type BatchCode = { id: string; code: string; status: StoredStatus; redemption: { state: string; order_number: string | null } | null };
export async function listBatchCodes(batchId: string): Promise<BatchCode[]> {
  type Raw = { id: string; code: string; status: StoredStatus; code_redemptions: Array<{ state: string; orders: { order_number: string } | null }> };
  const rows = await allRows<Raw>("batch codes list", (from, to) => db().from("discount_codes")
    .select("id, code, status, code_redemptions(state, orders(order_number))").eq("batch_id", batchId).order("code").range(from, to));
  return rows.map((r) => {
    const live = r.code_redemptions.find((x) => x.state === "held" || x.state === "used") ?? null;
    return { id: r.id, code: r.code, status: r.status, redemption: live ? { state: live.state, order_number: live.orders?.order_number ?? null } : null };
  });
}

export type Redemption = {
  id: string; code_id: string; discount_cents: number; capped_cents: number; state: "held" | "used" | "released" | "reset"; created_at: string;
  orders: { order_number: string; email: string; status: string; subtotal_cents: number; partner_discount_cents: number } | null;
};
export async function listRedemptions(codeIds: string[]): Promise<Redemption[]> {
  if (!codeIds.length) return [];
  const { data, error } = await db().from("code_redemptions")
    .select("id, code_id, discount_cents, capped_cents, state, created_at, orders(order_number, email, status, subtotal_cents, partner_discount_cents)")
    .in("code_id", codeIds).order("created_at", { ascending: false }).limit(500);
  if (error) fail("redemptions list", error);
  return (data as Redemption[] | null) ?? [];
}

export async function claimCode(i: { codeId: string; orderId: string; customerId: string; discountCents: number; cappedCents: number }): Promise<ClaimResult> {
  const { data, error } = await db().rpc("claim_discount_code", { p_code: i.codeId, p_order: i.orderId, p_customer: i.customerId, p_discount: i.discountCents, p_capped: i.cappedCents });
  if (error) fail("claim_discount_code", error);
  if (!["ok", "missing", "inactive", "used_up", "already_used"].includes(data as string)) fail("claim_discount_code", `unexpected answer ${String(data)}`);
  return data as ClaimResult;
}

// Owner action on a refunded order: the use stops counting toward limits.
export async function resetUse(redemptionId: string, actor: string): Promise<boolean> {
  const { data, error } = await db().from("code_redemptions").select("id, code_id, state, orders(status)").eq("id", redemptionId).maybeSingle();
  if (error) fail("redemption read", error);
  const r = data as { id: string; code_id: string; state: string; orders: { status: string } | null } | null;
  if (!r || r.state !== "used" || r.orders?.status !== "refunded") return false;
  const { data: upd, error: ue } = await db().from("code_redemptions").update({ state: "reset", settled_at: new Date().toISOString() }).eq("id", redemptionId).eq("state", "used").select("id");
  if (ue) fail("redemption reset", ue);
  if (!(Array.isArray(upd) && upd.length === 1)) return false;
  await logEvent({ codeId: r.code_id, kind: "use_reset", detail: redemptionId, actor });
  return true;
}

// ---------- activity ----------
export type CodeEvent = { id: number; kind: string; detail: string | null; at: string; actor: string | null };
async function logEvent(e: { codeId?: string; batchId?: string; kind: string; detail?: string; actor: string }): Promise<void> {
  const { error } = await db().from("discount_code_events").insert({ code_id: e.codeId ?? null, batch_id: e.batchId ?? null, kind: e.kind, detail: e.detail ?? null, actor: e.actor });
  if (error) fail("discount event insert", error);
}
export async function listEvents(target: { codeId: string } | { batchId: string } | { settings: true }): Promise<CodeEvent[]> {
  let q = db().from("discount_code_events").select("id, kind, detail, at, actor");
  q = "codeId" in target ? q.eq("code_id", target.codeId) : "batchId" in target ? q.eq("batch_id", target.batchId) : q.eq("kind", "cap_changed");
  const { data, error } = await q.order("at", { ascending: false }).limit(50);
  if (error) fail("discount events list", error);
  return (data as CodeEvent[] | null) ?? [];
}

// ---------- wrong-code limit ----------
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_MAX = 10;
export async function codeAttemptAllowed(customerId: string, ipHash: string, nowMs: number = Date.now()): Promise<boolean> {
  const since = new Date(nowMs - ATTEMPT_WINDOW_MS).toISOString();
  for (const [col, val] of [["customer_id", customerId], ["ip_hash", ipHash]] as const) {
    const { count, error } = await db().from("code_attempts").select("id", { count: "exact", head: true }).eq(col, val).gte("at", since);
    if (error) fail("code attempt count", error);
    if ((count ?? 0) >= ATTEMPT_MAX) return false;
  }
  return true;
}
export async function recordCodeFailure(customerId: string, ipHash: string): Promise<void> {
  const { error } = await db().from("code_attempts").insert({ customer_id: customerId, ip_hash: ipHash });
  if (error) fail("code attempt record", error);
}
export async function pruneCodeAttempts(nowMs: number = Date.now()): Promise<void> {
  const { error } = await db().from("code_attempts").delete().lt("at", new Date(nowMs - 24 * 3600 * 1000).toISOString());
  if (error) fail("code_attempts prune", error);
}
