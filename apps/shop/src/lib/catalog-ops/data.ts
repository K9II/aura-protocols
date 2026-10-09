import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { CatalogOps, LotStockRow } from "@/lib/catalog-merge";
import type { AdminLotRow, AdminOps, CountReason, LotQty, ReceiveValue } from "@/lib/catalog-ops/rules";
import { coaObjectPath } from "@/lib/catalog-ops/rules";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const num = <T extends { purity_pct: unknown; sellable: unknown; held: unknown; sold: unknown; available: unknown }>(r: T): T =>
  ({ ...r, purity_pct: Number(r.purity_pct), sellable: Number(r.sellable), held: Number(r.held), sold: Number(r.sold), available: Number(r.available) });

const VARIANT_COLS = "slug, variant_id, strength, price_cents, low_at, threepl_sku, shown, archived_at, wholesale";
const LOT_COLS = "id, lot_number, slug, variant_id, purity_pct, method, tested_on, coa_path, status, live_at, sellable, held, sold, available";
const ADMIN_LOT_COLS = `${LOT_COLS}, ordered_qty, counted_qty, damaged_qty, adjust_qty, discrepancy_note, received_by, received_at, retired_at`;

// First names for a batch of customer ids, one query — used for both catalog
// event actors and a lot's received_by (no N+1 per row).
async function actorNames(ids: Array<string | null>): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (!uniq.length) return names;
  const { data: people, error } = await db().from("customers").select("id, full_name").in("id", uniq);
  if (error) fail("actor names read", error);
  for (const c of (people ?? []) as Array<{ id: string; full_name: string }>) names.set(c.id, c.full_name.split(" ")[0]);
  return names;
}

// ---------- storefront ----------
export async function fetchCatalogOps(): Promise<CatalogOps> {
  const [p, v, l] = await Promise.all([
    db().from("catalog_products").select("slug, shown"),
    db().from("catalog_variants").select(VARIANT_COLS),
    db().from("lot_stock").select(LOT_COLS).in("status", ["live", "retired"]),
  ]);
  if (p.error || v.error || l.error) fail("catalog read", p.error ?? v.error ?? l.error);
  return {
    products: (p.data ?? []) as CatalogOps["products"],
    variants: (v.data ?? []) as CatalogOps["variants"],
    lots: ((l.data ?? []) as LotStockRow[]).map(num),
  };
}

// ---------- admin reads ----------
export async function fetchAdminOps(slug?: string): Promise<AdminOps> {
  let lots = db().from("lot_stock").select(ADMIN_LOT_COLS);
  if (slug) lots = lots.eq("slug", slug);
  let variants = db().from("catalog_variants").select(VARIANT_COLS);
  if (slug) variants = variants.eq("slug", slug);
  const [p, v, l] = await Promise.all([db().from("catalog_products").select("slug, shown"), variants, lots]);
  if (p.error || v.error || l.error) fail("admin catalog read", p.error ?? v.error ?? l.error);
  const lotRows = ((l.data ?? []) as AdminLotRow[]).map(num);
  const names = await actorNames(lotRows.map((r) => r.received_by));
  return {
    products: (p.data ?? []) as AdminOps["products"],
    variants: (v.data ?? []) as AdminOps["variants"],
    lots: lotRows.map((r) => ({ ...r, received_by_name: r.received_by ? names.get(r.received_by) ?? null : null })),
  };
}

export type CatalogEvent = {
  id: string; variant_id: string | null; lot_id: string | null; kind: string; before: Record<string, unknown> | null;
  after: Record<string, unknown> | null; reason: string | null; note: string | null; source: string; actor_id: string | null;
  created_at: string; actorName: string | null; lotNumber: string | null;
};
export async function catalogEvents(slug: string, limit = 50): Promise<CatalogEvent[]> {
  const { data, error } = await db().from("catalog_events").select("*, lots(lot_number)").eq("slug", slug).order("created_at", { ascending: false }).limit(limit);
  if (error) fail("catalog events read", error);
  const rows = (data ?? []) as Array<Omit<CatalogEvent, "actorName" | "lotNumber"> & { lots: { lot_number: string } | null }>;
  const names = await actorNames(rows.map((r) => r.actor_id));
  return rows.map(({ lots, ...r }) => ({ ...r, actorName: r.actor_id ? names.get(r.actor_id) ?? null : null, lotNumber: lots?.lot_number ?? null }));
}

export async function lotById(id: string): Promise<AdminLotRow | null> {
  const { data, error } = await db().from("lot_stock").select(ADMIN_LOT_COLS).eq("id", id).maybeSingle();
  if (error) fail("lot read", error);
  return data ? num(data as AdminLotRow) : null;
}

// ---------- admin writes ----------
async function logEvent(e: { slug: string; variant_id?: string | null; lot_id?: string | null; kind: string; before?: unknown; after?: unknown; reason?: string | null; note?: string | null; source?: string; actor_id?: string | null }): Promise<void> {
  const { error } = await db().from("catalog_events").insert({ source: "manual", ...e });
  if (error) fail(`catalog event ${e.kind}`, error);
}

export async function receiveLot(slug: string, variantId: string, v: ReceiveValue, actorId: string): Promise<{ ok: true; id: string } | { ok: false; taken: true }> {
  const { data, error } = await db().from("lots").insert({
    lot_number: v.lotNumber, slug, variant_id: variantId, purity_pct: v.purityPct, method: v.method, tested_on: v.testedOn,
    coa_path: v.coaPath, status: "draft", ordered_qty: v.orderedQty, counted_qty: v.countedQty, damaged_qty: v.damagedQty,
    discrepancy_note: v.discrepancyNote, received_by: actorId,
  }).select("id").single();
  if (error && (error as { code?: string }).code === "23505") return { ok: false, taken: true };
  if (error || !data) fail("lot insert", error);
  const id = (data as { id: string }).id;
  await logEvent({ slug, variant_id: variantId, lot_id: id, kind: "lot_received", actor_id: actorId,
    after: { ordered: v.orderedQty, counted: v.countedQty, damaged: v.damagedQty }, note: v.discrepancyNote });
  return { ok: true, id };
}

// Drafts only; ok:false when the lot is no longer a draft (the caller throws: stale).
export async function updateDraftLot(id: string, v: ReceiveValue, actorId: string): Promise<{ ok: boolean; taken?: true }> {
  const { data, error } = await db().from("lots").update({
    lot_number: v.lotNumber, purity_pct: v.purityPct, method: v.method, tested_on: v.testedOn, coa_path: v.coaPath,
    ordered_qty: v.orderedQty, counted_qty: v.countedQty, damaged_qty: v.damagedQty, discrepancy_note: v.discrepancyNote,
  }).eq("id", id).eq("status", "draft").select("slug, variant_id");
  if (error && (error as { code?: string }).code === "23505") return { ok: false, taken: true };
  if (error) fail("draft lot update", error);
  const row = (data as Array<{ slug: string; variant_id: string }> | null)?.[0];
  if (!row) return { ok: false };
  await logEvent({ slug: row.slug, variant_id: row.variant_id, lot_id: id, kind: "lot_edited", actor_id: actorId });
  return { ok: true };
}

export type LiveResult = "ok" | "missing" | "not_draft" | "no_certificate" | "nothing_sellable";
export async function putLotLive(id: string, actorId: string): Promise<LiveResult> {
  const { data, error } = await db().rpc("admin_lot_live", { p_lot: id, p_actor: actorId });
  if (error) fail("admin_lot_live", error);
  return data as LiveResult;
}

export type CorrectResult = "ok" | "missing" | "draft" | "below_committed";
export async function correctCount(id: string, delta: number, reason: CountReason, note: string | null, actorId: string, source: "manual" | "3pl" = "manual"): Promise<CorrectResult> {
  const { data, error } = await db().rpc("admin_correct_count", { p_lot: id, p_delta: delta, p_reason: reason, p_note: note, p_actor: actorId, p_source: source });
  if (error) fail("admin_correct_count", error);
  return data as CorrectResult;
}

export async function retireLot(id: string, actorId: string): Promise<"ok" | "missing" | "not_live"> {
  const { data, error } = await db().rpc("admin_retire_lot", { p_lot: id, p_actor: actorId });
  if (error) fail("admin_retire_lot", error);
  return data as "ok" | "missing" | "not_live";
}

export async function replaceCertificate(id: string, path: string, actorId: string): Promise<boolean> {
  const before = await lotById(id);
  if (!before || before.status === "draft") return false;   // drafts change it through Edit
  const { error } = await db().from("lots").update({ coa_path: path }).eq("id", id);
  if (error) fail("certificate replace", error);
  await logEvent({ slug: before.slug, variant_id: before.variant_id, lot_id: id, kind: "certificate_replaced", actor_id: actorId,
    before: { coa_path: before.coa_path }, after: { coa_path: path } });
  return true;
}

type VariantField = "price_cents" | "low_at" | "threepl_sku";
const FIELD_EVENT: Record<VariantField, string> = { price_cents: "price_changed", low_at: "low_at_changed", threepl_sku: "threepl_sku_changed" };
export async function setVariantField(slug: string, variantId: string, field: VariantField, value: number | string | null, actorId: string): Promise<{ ok: true } | { ok: false; reason: "missing" | "taken" }> {
  const { data: before, error: e1 } = await db().from("catalog_variants").select(field).eq("slug", slug).eq("variant_id", variantId).maybeSingle();
  if (e1) fail("variant read", e1);
  if (!before) return { ok: false, reason: "missing" };
  const { data, error } = await db().from("catalog_variants").update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("slug", slug).eq("variant_id", variantId).select("slug");
  if (error && (error as { code?: string }).code === "23505") return { ok: false, reason: "taken" };
  if (error) fail("variant update", error);
  if (!(data as unknown[] | null)?.length) return { ok: false, reason: "missing" };
  await logEvent({ slug, variant_id: variantId, kind: FIELD_EVENT[field], actor_id: actorId, before, after: { [field]: value } });
  return { ok: true };
}

// Catalog → strength ⋯ → Sell as a wholesale kit / Stop selling as a kit.
export async function setVariantWholesale(slug: string, variantId: string, on: boolean, actorId: string): Promise<boolean> {
  const { data, error } = await db().from("catalog_variants").update({ wholesale: on, updated_at: new Date().toISOString() })
    .eq("slug", slug).eq("variant_id", variantId).select("slug");
  if (error) fail("wholesale switch", error);
  if (!(data as unknown[] | null)?.length) return false;
  await logEvent({ slug, variant_id: variantId, kind: on ? "wholesale_on" : "wholesale_off", actor_id: actorId });
  return true;
}

export async function setShown(slug: string, shown: boolean, actorId: string): Promise<boolean> {
  const { data, error } = await db().from("catalog_products").update({ shown, updated_at: new Date().toISOString() }).eq("slug", slug).select("slug");
  if (error) fail("visibility update", error);
  if (!(data as unknown[] | null)?.length) return false;
  await logEvent({ slug, kind: shown ? "shown" : "hidden", actor_id: actorId });
  return true;
}

// ---------- strengths ----------
const isUnique = (e: unknown) => (e as { code?: string } | null)?.code === "23505";

// One strength row, for action checks (exists? archived?). null = no row.
export async function variantRow(slug: string, variantId: string): Promise<{ strength: string; shown: boolean; archived_at: string | null } | null> {
  const { data, error } = await db().from("catalog_variants").select("strength, shown, archived_at").eq("slug", slug).eq("variant_id", variantId).maybeSingle();
  if (error) fail("variant read", error);
  return (data as { strength: string; shown: boolean; archived_at: string | null } | null) ?? null;
}

export type AddVariant = { strength: string; variantId: string; priceCents: number; lowAt: number; sku: string | null };
// New strengths start hidden. An archived row with the same key is reported
// (restore it instead), never overwritten.
export async function addVariant(slug: string, v: AddVariant, actorId: string): Promise<{ ok: true } | { ok: false; reason: "taken" | "sku_taken" | "archived" }> {
  const existing = await variantRow(slug, v.variantId);
  if (existing) return { ok: false, reason: existing.archived_at ? "archived" : "taken" };
  const { error } = await db().from("catalog_variants").insert({
    slug, variant_id: v.variantId, strength: v.strength, price_cents: v.priceCents, low_at: v.lowAt, threepl_sku: v.sku, shown: false,
  });
  if (isUnique(error)) return { ok: false, reason: /threepl_sku/.test(JSON.stringify(error)) ? "sku_taken" : "taken" };
  if (error) fail("strength insert", error);
  await logEvent({ slug, variant_id: v.variantId, kind: "strength_added", actor_id: actorId,
    after: { strength: v.strength, price_cents: v.priceCents, shown: false } });
  return { ok: true };
}

// State-checked update of one strength; ok:false when no row matched (the caller throws: stale).
async function updateVariant(slug: string, variantId: string, patch: Record<string, unknown>, archived: boolean, what: string): Promise<{ strength: string } | null> {
  let q = db().from("catalog_variants").update({ ...patch, updated_at: new Date().toISOString() }).eq("slug", slug).eq("variant_id", variantId);
  q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data, error } = await q.select("strength");
  if (error) fail(what, error);
  return (data as Array<{ strength: string }> | null)?.[0] ?? null;
}

// Not archived only. Idempotent: already in that state → ok, no event.
// ok:false only when the strength is missing or archived (stale).
export async function setVariantShown(slug: string, variantId: string, shown: boolean, actorId: string): Promise<{ ok: boolean }> {
  const { data, error } = await db().from("catalog_variants").update({ shown, updated_at: new Date().toISOString() })
    .eq("slug", slug).eq("variant_id", variantId).is("archived_at", null).neq("shown", shown).select("strength");
  if (error) fail("strength visibility update", error);
  const row = (data as Array<{ strength: string }> | null)?.[0];
  if (!row) {
    const now = await variantRow(slug, variantId);
    return { ok: !!now && !now.archived_at && now.shown === shown };
  }
  await logEvent({ slug, variant_id: variantId, kind: shown ? "strength_shown" : "strength_hidden", actor_id: actorId, after: { strength: row.strength } });
  return { ok: true };
}

// Off the store and out of the list; lots, certificates and orders stay.
export async function archiveVariant(slug: string, variantId: string, actorId: string): Promise<{ ok: boolean }> {
  const row = await updateVariant(slug, variantId, { archived_at: new Date().toISOString(), shown: false }, false, "strength archive");
  if (!row) return { ok: false };
  await logEvent({ slug, variant_id: variantId, kind: "strength_archived", actor_id: actorId, after: { strength: row.strength } });
  return { ok: true };
}

// Back in the list, hidden.
export async function restoreVariant(slug: string, variantId: string, actorId: string): Promise<{ ok: boolean }> {
  const row = await updateVariant(slug, variantId, { archived_at: null, shown: false }, true, "strength restore");
  if (!row) return { ok: false };
  await logEvent({ slug, variant_id: variantId, kind: "strength_restored", actor_id: actorId, after: { strength: row.strength, shown: false } });
  return { ok: true };
}

// Only a strength with no lots and no order lines ever (admin_delete_variant logs it).
export async function deleteVariant(slug: string, variantId: string, actorId: string): Promise<"ok" | "missing" | "has_history"> {
  const { data, error } = await db().rpc("admin_delete_variant", { p_slug: slug, p_variant: variantId, p_actor: actorId });
  if (error) fail("admin_delete_variant", error);
  if (data !== "ok" && data !== "missing" && data !== "has_history") fail("admin_delete_variant", `unexpected answer ${String(data)}`);
  return data as "ok" | "missing" | "has_history";
}

// Per strength: lots ever received and distinct orders that included it.
// Counted in SQL (variant_history) — one call, no row cap.
export async function variantHistory(slug: string): Promise<Map<string, { lots: number; orders: number }>> {
  const { data, error } = await db().rpc("variant_history", { p_slug: slug });
  if (error) fail("variant_history", error);
  return new Map(((data ?? []) as Array<{ variant_id: string; lots: number; orders: number }>)
    .map((r) => [r.variant_id, { lots: Number(r.lots), orders: Number(r.orders) }]));
}

// ---------- certificates ----------
export async function createCoaUpload(lotNumber: string, nowMs = Date.now()): Promise<{ path: string; token: string }> {
  const path = coaObjectPath(lotNumber, nowMs);
  const { data, error } = await db().storage.from("coa").createSignedUploadUrl(path);
  if (error || !data) fail("certificate upload link", error);
  return { path, token: (data as { token: string }).token };
}
export async function coaUploaded(path: string): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const { data, error } = await db().storage.from("coa").list(path.slice(0, slash), { search: path.slice(slash + 1) });
  if (error) fail("certificate check", error);
  return ((data ?? []) as Array<{ name: string }>).some((f) => f.name === path.slice(slash + 1));
}

// ---------- checkout / orders ----------
export type HoldResult = { ok: true } | { ok: false; reason: "inactive" } | { ok: false; reason: "sold_out"; short: Array<{ slug: string; variantId: string }> };
export async function holdVials(orderId: string): Promise<HoldResult> {
  const { data, error } = await db().rpc("hold_vials", { p_order: orderId });
  if (error) fail("hold_vials", error);
  const r = data as { ok: boolean; reason?: string; short?: string[] };
  if (r.ok) return { ok: true };
  if (r.reason === "sold_out") return { ok: false, reason: "sold_out", short: (r.short ?? []).map((k) => { const [slug, variantId] = k.split(":"); return { slug, variantId }; }) };
  return { ok: false, reason: "inactive" };
}

export type Shortfall = { order_item_id: string; compound_slug: string; variant_id: string; need: number; covered: number };
export async function orderHoldShortfall(orderId: string): Promise<Shortfall[]> {
  const { data, error } = await db().rpc("order_hold_shortfall", { p_order: orderId });
  if (error) fail("order_hold_shortfall", error);
  return (data ?? []) as Shortfall[];
}

export async function logOversold(slug: string, variantId: string, orderNumber: string, need: number, covered: number): Promise<void> {
  await logEvent({ slug, variant_id: variantId, kind: "oversold", source: "system", note: orderNumber, after: { need, covered } });
}

// `returned` only when some came back to stock (a refund before shipping).
export type ItemLots = { allocated: LotQty[]; shipped: LotQty[]; returned?: LotQty[] };
// Allocated (held or sold holds), shipped and returned lots per order item.
// Ids go in the query string; /admin/orders can pass hundreds, so read in
// chunks to stay well under URL-length limits.
export const ORDER_ITEM_ID_CHUNK = 100;

export async function orderItemLots(orderItemIds: string[]): Promise<Map<string, ItemLots>> {
  const out = new Map<string, ItemLots>(orderItemIds.map((id) => [id, { allocated: [], shipped: [] }]));
  const ids = [...out.keys()];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ORDER_ITEM_ID_CHUNK) chunks.push(ids.slice(i, i + ORDER_ITEM_ID_CHUNK));
  const reads = await Promise.all(chunks.map((chunk) => Promise.all([
    db().from("lot_holds").select("order_item_id, qty, state, lots(lot_number)").in("order_item_id", chunk).in("state", ["held", "sold", "returned"]),
    db().from("shipped_lots").select("order_item_id, lot_number, qty").in("order_item_id", chunk),
  ])));
  for (const [h, s] of reads) {
    if (h.error || s.error) fail("order lots read", h.error ?? s.error);
    for (const r of (h.data ?? []) as unknown as Array<{ order_item_id: string; qty: number; state: string; lots: { lot_number: string } }>) {
      const item = out.get(r.order_item_id);
      if (!item) continue;
      if (r.state === "returned") (item.returned ??= []).push({ lotNumber: r.lots.lot_number, qty: r.qty });
      else item.allocated.push({ lotNumber: r.lots.lot_number, qty: r.qty });
    }
    for (const r of (s.data ?? []) as Array<{ order_item_id: string; lot_number: string; qty: number }>) {
      out.get(r.order_item_id)?.shipped.push({ lotNumber: r.lot_number, qty: r.qty });
    }
  }
  return out;
}

// v1: what we allocated is what shipped (source manual). The 3PL feed later
// calls recordShipped with its own entries and source "3pl".
//
// Contract for callers (markShippedAction, the future 3PL feed handler):
// 'ok' needs no follow-up. 'moved' means the shipped lot(s) differ from what
// was held, so stock moved between lots — call catalogStockChanged() to
// expire the live catalog. 'alert' means the shipped quantity doesn't
// reconcile against what was allocated — alertOwner, naming the order and
// line, so a human looks at it (the SQL still records what it can). Throws
// (bad/empty entries, a DB error) must not be swallowed — alert the owner
// with the order and line so a failed recording is never silent.
export async function recordShipped(orderItemId: string, entries: LotQty[], source: "manual" | "3pl"): Promise<"ok" | "moved" | "alert"> {
  const { data, error } = await db().rpc("record_shipped_lots", {
    p_item: orderItemId, p_entries: entries.map((e) => ({ lot_number: e.lotNumber, qty: e.qty })), p_source: source,
  });
  if (error) fail("record_shipped_lots", error);
  return data as "ok" | "moved" | "alert";
}

export async function lotIntegrity(): Promise<{ negative: string[]; stale_holds: string[] }> {
  const { data, error } = await db().rpc("lot_integrity");
  if (error) fail("lot_integrity", error);
  return data as { negative: string[]; stale_holds: string[] };
}
