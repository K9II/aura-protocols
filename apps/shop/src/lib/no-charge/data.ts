import "server-only";
// No-charge orders (server): recipients, stock to pick from, the month's total,
// and the order insert. Spec Part B. Every money field is 0 (the
// orders_no_charge_zero check in supabase/no-charge.sql enforces it).
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { fetchAdminOps } from "@/lib/catalog-ops/data";
import { catalogContent } from "@/data/catalog";
import { cleanSearch } from "@/lib/customers/rules";
import { zonedToIso } from "@/lib/discounts/time";
import { localStamp } from "@/lib/today/time";
import type { ShipAddress } from "@/lib/ship-address";
import type { BuiltLine, NoChargeReason, StockOption } from "@/lib/no-charge/rules";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
export const RECIPIENT_LIMIT = 8;

// ---------- recipients ----------
export type RecipientHit = { id: string; name: string; email: string; verified: boolean; orders: number };
type RawHit = { id: string; email: string; full_name: string; email_verified_at: string | null; blocked_at: string | null; paid_orders: number | string };

// Name/email search over accounts; blocked accounts can't be sent anything.
export async function searchRecipients(q: string): Promise<RecipientHit[]> {
  const { data, error } = await db().rpc("admin_customer_list", { p_q: cleanSearch(q), p_tab: "all", p_limit: RECIPIENT_LIMIT, p_offset: 0 });
  if (error) fail("recipient search", error);
  return ((data as RawHit[] | null) ?? [])
    .filter((r) => !r.blocked_at)
    .map((r) => ({ id: r.id, name: r.full_name, email: r.email, verified: !!r.email_verified_at, orders: Number(r.paid_orders) }));
}

export type Recipient = { id: string; name: string; email: string; verified: boolean; blocked: boolean; agreedAt: string | null; ship: ShipAddress | null };
type RawCustomer = {
  id: string; full_name: string; email_verified_at: string | null; blocked_at: string | null;
  ship_name: string | null; ship_line1: string | null; ship_line2: string | null; ship_city: string | null; ship_state: string | null; ship_zip: string | null;
};

export async function recipient(id: string): Promise<Recipient | null> {
  const { data, error } = await db().from("customers")
    .select("id, full_name, email_verified_at, blocked_at, ship_name, ship_line1, ship_line2, ship_city, ship_state, ship_zip")
    .eq("id", id).maybeSingle();
  if (error) fail("recipient read", error);
  if (!data) return null;
  const c = data as RawCustomer;
  const [{ data: u, error: ue }, agreement] = await Promise.all([
    db().auth.admin.getUserById(id),
    db().from("account_agreements").select("agreed_at").eq("customer_id", id).order("agreed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (ue || !u?.user?.email) fail("recipient email read", ue ?? "no auth user");
  if (agreement.error) fail("recipient agreement read", agreement.error);
  const ship = c.ship_name && c.ship_line1 && c.ship_city && c.ship_state && c.ship_zip
    ? { name: c.ship_name, line1: c.ship_line1, line2: c.ship_line2 ?? null, city: c.ship_city, state: c.ship_state as ShipAddress["state"], zip: c.ship_zip }
    : null;
  return {
    id: c.id, name: c.full_name, email: u!.user!.email!, verified: !!c.email_verified_at, blocked: !!c.blocked_at,
    agreedAt: (agreement.data as { agreed_at: string } | null)?.agreed_at ?? null, ship,
  };
}

// ---------- stock ----------
// Every strength with live vials, shown or hidden (samples can go out before
// a strength is on the store); archived strengths and products without
// content are left out. Same live-lot rule as hold_vials.
export async function stockOptions(): Promise<StockOption[]> {
  const ops = await fetchAdminOps();
  const names = new Map(catalogContent.map((c) => [c.slug, c.name]));
  const productShown = new Map(ops.products.map((p) => [p.slug, p.shown]));
  const available = new Map<string, number>();
  for (const l of ops.lots) {
    if (l.status !== "live" || l.available <= 0) continue;
    const k = `${l.slug}:${l.variant_id}`;
    available.set(k, (available.get(k) ?? 0) + l.available);
  }
  const out: StockOption[] = [];
  for (const v of ops.variants) {
    const name = names.get(v.slug);
    if (v.archived_at || !name) continue;
    const n = available.get(`${v.slug}:${v.variant_id}`) ?? 0;
    if (n <= 0) continue;
    out.push({
      slug: v.slug, variantId: v.variant_id, name, strength: v.strength, priceCents: v.price_cents, available: n,
      hidden: !(productShown.get(v.slug) === true && v.shown),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.strength.localeCompare(b.strength, undefined, { numeric: true }));
}

// ---------- this month ----------
// Paid or shipped no-charge orders since the 1st of the month, shop time.
export async function monthTotal(nowMs: number): Promise<{ orders: number; retailCents: number }> {
  const monthStart = zonedToIso(`${localStamp(nowMs).slice(0, 7)}-01T00:00`);
  const { data, error } = await db().from("orders").select("retail_value_cents")
    .eq("kind", "no_charge").in("status", ["paid", "shipped"]).gte("paid_at", monthStart);
  if (error) fail("no-charge month total", error);
  const rows = (data as Array<{ retail_value_cents: number | null }> | null) ?? [];
  return { orders: rows.length, retailCents: rows.reduce((s, r) => s + (r.retail_value_cents ?? 0), 0) };
}

// ---------- create ----------
export async function createNoChargeOrder(i: {
  customerId: string; email: string; ship: ShipAddress; lines: BuiltLine[]; retailCents: number;
  reason: NoChargeReason; note: string | null; replacesOrderId: string | null; actorId: string; agreedAt: string;
}): Promise<{ id: string; orderNumber: string }> {
  const now = new Date();
  const { data, error } = await db().from("orders").insert({
    customer_id: i.customerId, email: i.email, status: "awaiting_payment", kind: "no_charge",
    ship_name: i.ship.name, ship_line1: i.ship.line1, ship_line2: i.ship.line2, ship_city: i.ship.city, ship_state: i.ship.state, ship_zip: i.ship.zip,
    subtotal_cents: 0, shipping_cents: 0, insurance_cents: 0, tax_cents: 0, total_cents: 0,
    store_credit_cents: 0, partner_discount_cents: 0, code_discount_cents: 0,
    retail_value_cents: i.retailCents, no_charge_reason: i.reason, no_charge_note: i.note,
    replaces_order_id: i.replacesOrderId, created_by: i.actorId,
    ruo_confirmed_at: i.agreedAt,
    expires_at: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
  }).select("id, order_number").single();
  if (error || !data) fail("no-charge order insert", error ?? "no row");
  const order = data as { id: string; order_number: string };
  // lot_number is NOT NULL; hold_vials fills it with the real allocation (same as checkout).
  const { error: itemsError } = await db().from("order_items").insert(i.lines.map((l) => ({
    order_id: order.id, compound_slug: l.compoundSlug, compound_name: l.compoundName, variant_id: l.variantId,
    strength: l.strength, pack_qty: l.packQty, quantity: l.quantity, unit_price_cents: l.unitPriceCents,
    line_total_cents: l.lineTotalCents, retail_unit_cents: l.retailUnitCents, lot_number: "",
  })));
  if (itemsError) {
    await db().from("orders").delete().eq("id", order.id);
    fail("order_items insert", itemsError);
  }
  return { id: order.id, orderNumber: order.order_number };
}

// For Replacement: the original order must belong to the same customer.
export async function orderIdByNumber(n: string, customerId: string): Promise<string | null> {
  const { data, error } = await db().from("orders").select("id")
    .eq("order_number", n.trim().toUpperCase()).eq("customer_id", customerId).maybeSingle();
  if (error) fail("original order read", error);
  return (data as { id: string } | null)?.id ?? null;
}

// The customer's paid/shipped sale orders, newest first — the Original order
// choices for a Replacement, and the order count on the recipient card.
export async function saleOrders(customerId: string): Promise<Array<{ number: string; createdAt: string }>> {
  const { data, error } = await db().from("orders").select("order_number, created_at")
    .eq("customer_id", customerId).eq("kind", "sale").in("status", ["paid", "shipped"]).order("created_at", { ascending: false });
  if (error) fail("customer orders read", error);
  return ((data as Array<{ order_number: string; created_at: string }> | null) ?? []).map((r) => ({ number: r.order_number, createdAt: r.created_at }));
}
