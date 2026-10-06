import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { CustomerEvent } from "@/lib/customers/data";
import type { CatalogEvent } from "@/lib/catalog-ops/data";
import type { CodeEvent } from "@/lib/discounts/data";
import type { EmailAdminEvent } from "@/lib/email/admin-data";
import type { DisputeEventRow } from "@/lib/disputes/rules";
import type { AdminAction } from "@/lib/audit/data";
import { ACTIVITY_AREAS, ACTIVITY_PAGE, type ActivityArea } from "@/lib/audit/constants";
export { ACTIVITY_AREAS, AREA_LABEL, ACTIVITY_PAGE, type ActivityArea } from "@/lib/audit/constants";

// Admin → Activity: every owner action across the command center, newest
// first, read from each module's own log (plus admin_events). Only rows with
// a person — automatic work (webhooks, crons, the 3PL) stays on module pages.

export type AdminEventRow = { id: string; area: string; action: AdminAction; target_id: string | null; label: string | null; detail: string | null };
export type ActivityItem = { key: string; at: string; area: ActivityArea; actorId: string; actorName: string; href: string | null } & (
  | { source: "admin"; e: AdminEventRow }
  | { source: "customer"; e: CustomerEvent; customerName: string }
  | { source: "catalog"; e: CatalogEvent; productName: string }
  | { source: "discount"; e: CodeEvent; codeLabel: string | null }
  | { source: "email"; e: EmailAdminEvent; campaignName: string | null }
  | { source: "inquiry"; e: { id: string; action: string; detail: string | null }; label: string | null }
  | { source: "dispute"; e: DisputeEventRow; orderNumber: string | null }
  | { source: "alert"; e: { id: string; title: string; note: string | null } }
);
export type ActivityFilter = { area?: ActivityArea; actor?: string; before?: string; since?: string; until?: string };
type Raw = ActivityItem extends infer T ? T extends ActivityItem ? Omit<T, "actorName"> : never : never;

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Applies the person and cursor filters to one source query.
type Chain = { not(c: string, o: string, v: null): Chain; eq(c: string, v: string): Chain; lt(c: string, v: string): Chain; gte(c: string, v: string): Chain; order(c: string, o: { ascending: boolean }): Chain; limit(n: number): Chain };
function scoped<Q>(q: Q, actorCol: string, atCol: string, f: ActivityFilter): Q {
  let r = (q as unknown as Chain).not(actorCol, "is", null);
  if (f.actor) r = r.eq(actorCol, f.actor);
  if (f.before) r = r.lt(atCol, f.before);
  if (f.since) r = r.gte(atCol, f.since);
  if (f.until) r = r.lt(atCol, f.until);
  return r.order(atCol, { ascending: false }).limit(ACTIVITY_PAGE) as unknown as Q;
}

async function adminEvents(f: ActivityFilter, areas: ActivityArea[]): Promise<Raw[]> {
  const want = areas.filter((a) => a === "orders" || a === "partners" || a === "payouts" || a === "alerts");
  if (want.length === 0) return [];
  const dbAreas = want.map((a) => (a === "alerts" ? "today" : a));
  const { data, error } = await scoped(db().from("admin_events").select("*").in("area", dbAreas), "actor_id", "at", f);
  if (error) fail("admin events read", error);
  type R = AdminEventRow & { actor_id: string; at: string };
  return ((data ?? []) as R[]).map((r): Raw => {
    const area: ActivityArea = r.area === "today" ? "alerts" : (r.area as ActivityArea);
    const href = area === "orders" && r.label ? `/admin/orders?status=all#${r.label}` : area === "partners" ? "/admin/partners" : area === "payouts" ? "/admin/payouts" : area === "alerts" ? "/admin" : null;
    return { source: "admin", key: `a-${r.id}`, at: r.at, area, actorId: r.actor_id, href, e: r };
  });
}

async function customerEvents(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("customer_events").select("*, subject:customers!customer_events_customer_id_fkey(full_name)"), "actor_id", "created_at", f);
  if (error) fail("customer events read", error);
  type R = Omit<CustomerEvent, "actorName"> & { customer_id: string; subject: { full_name: string } | null };
  return ((data ?? []) as unknown as R[]).map(({ subject, ...e }): Raw => {
    // Early-warning choices are disputes work, logged on the customer.
    const area: ActivityArea = e.kind.startsWith("warning_") ? "disputes" : "customers";
    return { source: "customer", key: `c-${e.id}`, at: e.created_at, area, actorId: e.actor_id!, href: `/admin/customers/${e.customer_id}`, e: { ...e, actorName: null }, customerName: subject?.full_name ?? "a customer" };
  });
}

async function catalogEventsFeed(f: ActivityFilter, productName: (slug: string) => string): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("catalog_events").select("*, lots(lot_number)"), "actor_id", "created_at", f);
  if (error) fail("catalog events read", error);
  type R = Omit<CatalogEvent, "actorName" | "lotNumber"> & { slug: string; lots: { lot_number: string } | null };
  return ((data ?? []) as unknown as R[]).map(({ lots, ...e }): Raw => ({
    source: "catalog", key: `k-${e.id}`, at: e.created_at, area: "catalog", actorId: e.actor_id!, href: `/admin/catalog/${e.slug}`,
    e: { ...e, actorName: null, lotNumber: lots?.lot_number ?? null }, productName: productName(e.slug),
  }));
}

async function discountEvents(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("discount_code_events").select("id, kind, detail, at, actor, code_id, batch_id, discount_codes(code), discount_batches(prefix)"), "actor", "at", f);
  if (error) fail("discount events read", error);
  type R = Omit<CodeEvent, "actorName"> & { code_id: string | null; batch_id: string | null; discount_codes: { code: string } | null; discount_batches: { prefix: string } | null };
  return ((data ?? []) as unknown as R[]).map(({ discount_codes, discount_batches, code_id, batch_id, ...e }): Raw => ({
    source: "discount", key: `d-${e.id}`, at: e.at, area: "discounts", actorId: e.actor!,
    href: code_id ? `/admin/discounts/${code_id}` : batch_id ? `/admin/discounts/batch/${batch_id}` : "/admin/discounts/settings",
    e: { ...e, actorName: null }, codeLabel: discount_codes?.code ?? (discount_batches ? `${discount_batches.prefix.replace(/-$/, "")} batch` : null),
  }));
}

async function emailEvents(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("email_admin_events").select("*"), "actor", "at", f);
  if (error) fail("email events read", error);
  const rows = (data ?? []) as Array<Omit<EmailAdminEvent, "actorName">>;
  const ids = [...new Set(rows.map((r) => r.target).filter((t) => UUID.test(t)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: cs, error: cErr } = await db().from("campaigns").select("id, name").in("id", ids);
    if (cErr) fail("campaign names read", cErr);
    for (const c of (cs ?? []) as Array<{ id: string; name: string }>) names.set(c.id, c.name);
  }
  return rows.map((e): Raw => {
    const campaign = UUID.test(e.target);
    return {
      source: "email", key: `e-${e.id}`, at: e.at, area: "email", actorId: e.actor!, href: campaign ? `/admin/email/campaigns/${e.target}` : "/admin/email",
      e: { ...e, actorName: null }, campaignName: campaign ? names.get(e.target) ?? null : null,
    };
  });
}

async function inquiryEvents(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("inquiry_events").select("id, action, detail, at, actor, inquiry_id, inquiries(ref, name)").neq("action", "opened"), "actor", "at", f);
  if (error) fail("inquiry events read", error);
  type R = { id: string; action: string; detail: string | null; at: string; actor: string; inquiry_id: string | null; inquiries: { ref: number; name: string } | null };
  return ((data ?? []) as unknown as R[]).map((r): Raw => ({
    source: "inquiry", key: `q-${r.id}`, at: r.at, area: "inquiries", actorId: r.actor,
    href: r.inquiries ? `/admin/inquiries/Q-${r.inquiries.ref}` : r.action.startsWith("reply_") ? "/admin/inquiries/replies" : "/admin/inquiries?tab=unmatched",
    e: { id: r.id, action: r.action, detail: r.detail }, label: r.inquiries ? `Q-${r.inquiries.ref} · ${r.inquiries.name}` : null,
  }));
}

async function disputeEvents(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("dispute_events").select("id, action, note, at, actor, dispute_id, disputes(orders(order_number))"), "actor", "at", f);
  if (error) fail("dispute events read", error);
  type R = { id: string; action: DisputeEventRow["action"]; note: string | null; at: string; actor: string; dispute_id: string; disputes: { orders: { order_number: string } | null } | null };
  return ((data ?? []) as unknown as R[]).map((r): Raw => ({
    source: "dispute", key: `p-${r.id}`, at: r.at, area: "disputes", actorId: r.actor, href: `/admin/disputes/${r.dispute_id}`,
    e: { id: r.id, action: r.action, note: r.note, at: r.at, actorName: null }, orderNumber: r.disputes?.orders?.order_number ?? null,
  }));
}

async function alertsDone(f: ActivityFilter): Promise<Raw[]> {
  const { data, error } = await scoped(db().from("owner_alerts").select("id, title, note, resolved_at, resolved_by"), "resolved_by", "resolved_at", f);
  if (error) fail("resolved alerts read", error);
  return ((data ?? []) as Array<{ id: string; title: string; note: string | null; resolved_at: string; resolved_by: string }>).map((r): Raw => ({
    source: "alert", key: `l-${r.id}`, at: r.resolved_at, area: "alerts", actorId: r.resolved_by, href: "/admin/alerts", e: { id: r.id, title: r.title, note: r.note },
  }));
}

// One page of the feed. Each source gives its newest ACTIVITY_PAGE rows after
// the filters; merged and cut to one page, `next` is the cursor for the rest.
export async function activityFeed(f: ActivityFilter, productName: (slug: string) => string): Promise<{ items: ActivityItem[]; next: string | null }> {
  const areas: ActivityArea[] = f.area ? [f.area] : [...ACTIVITY_AREAS];
  const has = (a: ActivityArea) => areas.includes(a);
  const parts = await Promise.all([
    adminEvents(f, areas),
    has("customers") || has("disputes") ? customerEvents(f) : [],
    has("catalog") ? catalogEventsFeed(f, productName) : [],
    has("discounts") ? discountEvents(f) : [],
    has("email") ? emailEvents(f) : [],
    has("inquiries") ? inquiryEvents(f) : [],
    has("disputes") ? disputeEvents(f) : [],
    has("alerts") ? alertsDone(f) : [],
  ]);
  const merged = parts.flat().filter((i) => has(i.area)).sort((a, b) => b.at.localeCompare(a.at) || b.key.localeCompare(a.key));
  const page = merged.slice(0, ACTIVITY_PAGE);
  const names = await personNames(page.map((i) => i.actorId));
  const items = page.map((i) => ({ ...i, actorName: names.get(i.actorId) ?? "Someone" }) as ActivityItem);
  return { items, next: merged.length > ACTIVITY_PAGE ? page[page.length - 1].at : null };
}

async function personNames(ids: string[]): Promise<Map<string, string>> {
  const uniq = [...new Set(ids)];
  const names = new Map<string, string>();
  if (uniq.length === 0) return names;
  const { data, error } = await db().from("customers").select("id, full_name").in("id", uniq);
  if (error) fail("activity names read", error);
  for (const c of (data ?? []) as Array<{ id: string; full_name: string }>) names.set(c.id, c.full_name);
  return names;
}

// The person filter: current owners, plus anyone who has acted (a former owner
// stays findable after their owner flag is removed).
export async function activityPeople(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await db().from("customers").select("id, full_name").eq("is_owner", true);
  if (error) fail("owners read", error);
  const people = new Map<string, string>(((data ?? []) as Array<{ id: string; full_name: string }>).map((c) => [c.id, c.full_name]));
  const { items } = await activityFeed({}, () => "");
  for (const i of items) if (!people.has(i.actorId)) people.set(i.actorId, i.actorName);
  return [...people].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

