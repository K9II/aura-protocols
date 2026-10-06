import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { CustomerTab, CreditCategory } from "@/lib/customers/rules";
import type { OrderStatus } from "@/lib/order-status";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
export const PAGE_SIZE = 50;

// ---------- list ----------
export type CustomerListRow = {
  id: string; email: string; fullName: string; organization: string | null; isOwner: boolean; isPartner: boolean;
  createdAt: string; verified: boolean; blocked: boolean;
  paidOrders: number; spentCents: number; lastOrderAt: string | null; creditCents: number;
};
type RawListRow = {
  id: string; email: string; full_name: string; organization: string | null; is_owner: boolean; created_at: string;
  email_verified_at: string | null; blocked_at: string | null; is_partner: boolean;
  paid_orders: number; spent_cents: number | string; last_order_at: string | null; credit_cents: number | string; total_count: number | string;
};

export async function listCustomers(o: { q: string; tab: CustomerTab; page: number }): Promise<{ rows: CustomerListRow[]; total: number }> {
  const { data, error } = await db().rpc("admin_customer_list", { p_q: o.q, p_tab: o.tab, p_limit: PAGE_SIZE, p_offset: (o.page - 1) * PAGE_SIZE });
  if (error) fail("customer list", error);
  const raw = (data as RawListRow[] | null) ?? [];
  return {
    total: raw.length ? Number(raw[0].total_count) : 0,
    rows: raw.map((r) => ({
      id: r.id, email: r.email, fullName: r.full_name, organization: r.organization, isOwner: r.is_owner, isPartner: r.is_partner,
      createdAt: r.created_at, verified: !!r.email_verified_at, blocked: !!r.blocked_at,
      paidOrders: Number(r.paid_orders), spentCents: Number(r.spent_cents), lastOrderAt: r.last_order_at, creditCents: Number(r.credit_cents),
    })),
  };
}

export type CustomerStats = {
  total: number; new_30d: number; new_prior_30d: number; ordered: number; repeat: number;
  unverified: number; blocked: number; credit_cents: number; credit_accounts: number;
};
export async function customerStats(): Promise<CustomerStats> {
  const { data, error } = await db().rpc("admin_customer_stats");
  if (error || !data) fail("customer stats", error ?? "no data");
  const d = data as Record<keyof CustomerStats, number | string>;
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, Number(v)])) as CustomerStats;
}

// ---------- detail ----------
export type DetailOrder = { id: string; order_number: string; status: OrderStatus; created_at: string; total_cents: number; store_credit_cents: number; new_account_discount: boolean; partner_id: string | null; attributed_by: "code" | "link" | null; order_items: { quantity: number }[] };
export type Agreement = { id: string; terms_version: string; age_21: boolean; ruo: boolean; dispute_policy: boolean; ip_hash: string | null; user_agent: string | null; agreed_at: string };
export type Attestation = { id: string; terms_version: string; attested_at: string; age_21: boolean; ruo: boolean; dispute_policy: boolean; ip_hash: string | null; user_agent: string | null };
export type LedgerRow = { id: string; amount_cents: number; reason: string; ref_id: string | null; note: string | null; created_at: string };
export type CustomerEvent = { id: string; kind: EventKind; amount_cents: number | null; reason: string | null; note: string | null; actor_id: string | null; created_at: string; actorName: string | null };
export type EventKind = "blocked" | "unblocked" | "credit_added" | "credit_removed" | "verify_resent"
  | "warning_refunded" | "warning_watched" | "warning_closed"; // early fraud warnings (Disputes); reason = order number
export type CustomerDetail = {
  id: string; email: string; fullName: string; organization: string | null; isOwner: boolean; createdAt: string;
  verifiedAt: string | null; verifySentAt: string | null; marketingOptIn: boolean; blockedAt: string | null; blockedReason: string | null;
  ship: { name: string; line1: string; line2: string | null; city: string; state: string; zip: string } | null;
  orders: DetailOrder[]; agreements: Agreement[]; attestations: Attestation[]; ledger: LedgerRow[]; events: CustomerEvent[];
  isPartner: boolean; referrer: { name: string; via: "code" | "link" | null; at: string } | null;
  blockedBy: string | null;
};

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const { data: c, error } = await db().from("customers").select("*").eq("id", id).maybeSingle();
  if (error) fail("customer read", error);
  if (!c) return null;
  const r = c as Record<string, string | boolean | null>;
  const { data: u, error: ue } = await db().auth.admin.getUserById(id);
  if (ue || !u?.user?.email) fail("customer email read", ue ?? "no auth user");
  const email = u!.user!.email!;
  const [orders, agreements, attestations, ledger, events, partner] = await Promise.all([
    db().from("orders").select("id, order_number, status, created_at, total_cents, store_credit_cents, new_account_discount, partner_id, attributed_by, order_items(quantity)").eq("customer_id", id).order("created_at", { ascending: false }),
    db().from("account_agreements").select("*").eq("customer_id", id).order("agreed_at", { ascending: false }),
    db().from("gate_attestations").select("*").eq("email", email.toLowerCase()).order("attested_at", { ascending: false }),
    db().from("store_credit_ledger").select("id, amount_cents, reason, ref_id, note, created_at").eq("customer_id", id).order("created_at", { ascending: false }),
    db().from("customer_events").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    db().from("partners").select("id").eq("customer_id", id).maybeSingle(),
  ]);
  for (const [what, res] of [["orders", orders], ["agreements", agreements], ["attestations", attestations], ["ledger", ledger], ["events", events], ["partner", partner]] as const) {
    if (res.error) fail(`customer ${what} read`, res.error);
  }
  const orderRows = (orders.data as DetailOrder[] | null) ?? [];
  const eventRows = (events.data as Omit<CustomerEvent, "actorName">[] | null) ?? [];
  // Names for the activity log and the partner who referred them.
  const firstReferred = [...orderRows].reverse().find((o) => o.partner_id && (o.status === "paid" || o.status === "shipped"));
  const partnerCustomer = firstReferred ? await partnerCustomerName(firstReferred.partner_id!) : null;
  const actorIds = [...new Set(eventRows.map((e) => e.actor_id).filter((x): x is string => !!x))];
  const names = await namesById(actorIds);
  const lastBlock = eventRows.find((e) => e.kind === "blocked");
  return {
    id, email, fullName: r.full_name as string, organization: (r.organization as string | null) ?? null, isOwner: !!r.is_owner, createdAt: r.created_at as string,
    verifiedAt: (r.email_verified_at as string | null) ?? null, verifySentAt: (r.verify_sent_at as string | null) ?? null, marketingOptIn: !!r.marketing_opt_in,
    blockedAt: (r.blocked_at as string | null) ?? null, blockedReason: (r.blocked_reason as string | null) ?? null,
    ship: r.ship_name && r.ship_line1 && r.ship_city && r.ship_state && r.ship_zip
      ? { name: r.ship_name as string, line1: r.ship_line1 as string, line2: (r.ship_line2 as string | null) ?? null, city: r.ship_city as string, state: r.ship_state as string, zip: r.ship_zip as string }
      : null,
    orders: orderRows,
    agreements: (agreements.data as Agreement[] | null) ?? [],
    attestations: (attestations.data as Attestation[] | null) ?? [],
    ledger: (ledger.data as LedgerRow[] | null) ?? [],
    events: eventRows.map((e) => ({ ...e, actorName: e.actor_id ? names.get(e.actor_id) ?? null : null })),
    isPartner: !!partner.data,
    referrer: firstReferred && partnerCustomer ? { name: partnerCustomer, via: firstReferred.attributed_by, at: firstReferred.created_at } : null,
    blockedBy: lastBlock?.actor_id ? names.get(lastBlock.actor_id) ?? null : null,
  };
}

async function partnerCustomerName(partnerId: string): Promise<string | null> {
  const { data, error } = await db().from("partners").select("customers(full_name)").eq("id", partnerId).maybeSingle();
  if (error) fail("partner name read", error);
  return (data as { customers: { full_name: string } | null } | null)?.customers?.full_name ?? null;
}

async function namesById(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data, error } = await db().from("customers").select("id, full_name").in("id", ids);
  if (error) fail("actor names read", error);
  return new Map(((data as { id: string; full_name: string }[] | null) ?? []).map((x) => [x.id, x.full_name.split(" ")[0] || x.full_name]));
}

// ---------- writes ----------
export async function adjustCredit(customerId: string, amountCents: number, category: CreditCategory, note: string | null, actorId: string): Promise<{ ok: true; eventId: string } | { ok: false; reason: "insufficient" }> {
  const { data, error } = await db().rpc("admin_adjust_credit", { p_customer: customerId, p_amount: amountCents, p_category: category, p_note: note, p_actor: actorId });
  if (error) {
    if (JSON.stringify(error).includes("insufficient_credit")) return { ok: false, reason: "insufficient" };
    fail("credit adjustment", error);
  }
  return { ok: true, eventId: data as string };
}

export async function setBlockedFields(customerId: string, v: { at: string; reason: string } | null): Promise<void> {
  const { error } = await db().from("customers").update({ blocked_at: v?.at ?? null, blocked_reason: v?.reason ?? null }).eq("id", customerId);
  if (error) fail("customer block flag update", error);
}

export async function logCustomerEvent(e: { customerId: string; kind: EventKind; reason?: string | null; note?: string | null; actorId: string }): Promise<void> {
  const { error } = await db().from("customer_events").insert({ customer_id: e.customerId, kind: e.kind, reason: e.reason ?? null, note: e.note ?? null, actor_id: e.actorId });
  if (error) fail("customer event insert", error);
}

// Minimal row for actions (owner check, block state, email for resend).
export async function getCustomerBasics(id: string): Promise<{ id: string; email: string; fullName: string; isOwner: boolean; blockedAt: string | null; verifiedAt: string | null } | null> {
  const { data, error } = await db().from("customers").select("id, full_name, is_owner, blocked_at, email_verified_at").eq("id", id).maybeSingle();
  if (error) fail("customer read", error);
  if (!data) return null;
  const d = data as { id: string; full_name: string; is_owner: boolean; blocked_at: string | null; email_verified_at: string | null };
  const { data: u, error: ue } = await db().auth.admin.getUserById(id);
  if (ue || !u?.user?.email) fail("customer email read", ue ?? "no auth user");
  return { id: d.id, email: u!.user!.email!, fullName: d.full_name, isOwner: d.is_owner, blockedAt: d.blocked_at, verifiedAt: d.email_verified_at };
}
