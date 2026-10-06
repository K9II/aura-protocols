import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { INQUIRY_PREVIEWS } from "@/lib/today/constants";
import type { SalesSummary } from "@/lib/today/numbers";
import type { Range } from "@/lib/today/periods";
import type { InquiryPreview } from "@/lib/today/todos";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const num = (v: unknown) => Number(v ?? 0);

type RawSummary = Record<string, unknown> & {
  buckets?: Array<{ at: string; cents: unknown }>;
  top?: Array<{ name: string; strength: string; vials: unknown; cents: unknown }>;
};

// One period of the Numbers card (admin_sales_summary in today.sql).
export async function salesSummary(r: Range, bucket: "hour" | "day"): Promise<SalesSummary> {
  const { data, error } = await db().rpc("admin_sales_summary", { p_from: r.from, p_to: r.to, p_bucket: bucket });
  if (error || data == null) fail("admin_sales_summary", error ?? "no data");
  const d = data as RawSummary;
  return {
    salesCents: num(d.sales_cents), orders: num(d.orders), chargedCents: num(d.charged_cents), shippingCents: num(d.shipping_cents),
    taxCents: num(d.tax_cents), refundedCents: num(d.refunded_cents), refundedOrders: num(d.refunded_orders),
    firstTimeOrders: num(d.first_time_orders), repeatOrders: num(d.repeat_orders), newAccounts: num(d.new_accounts),
    buckets: (d.buckets ?? []).map((b) => ({ at: b.at, cents: num(b.cents) })),
    top: (d.top ?? []).map((t) => ({ name: t.name, strength: t.strength, vials: num(t.vials), cents: num(t.cents) })),
  };
}

async function inquiriesSeenAt(): Promise<string | null> {
  const { data, error } = await db().from("shop_settings").select("inquiries_seen_at").eq("id", true).maybeSingle();
  if (error) fail("inquiries seen read", error);
  return (data as { inquiries_seen_at: string | null } | null)?.inquiries_seen_at ?? null;
}

// Inquiries since the owner last chose Mark seen (all of them if never).
export async function newInquiries(): Promise<{ count: number; latest: InquiryPreview[] }> {
  const seen = await inquiriesSeenAt();
  let q = db().from("inquiries").select("id, kind, name, organization, message, created_at", { count: "exact" });
  if (seen) q = q.gt("created_at", seen);
  const { data, error, count } = await q.order("created_at", { ascending: false }).limit(INQUIRY_PREVIEWS);
  if (error) fail("new inquiries read", error);
  return { count: count ?? 0, latest: (data ?? []) as InquiryPreview[] };
}

// upTo is the newest created_at the page showed, passed through untouched
// (microseconds included). The mark never moves backwards, so a stale tab
// can't un-see newer inquiries.
export async function markInquiriesSeen(upTo: string): Promise<void> {
  const { error } = await db().from("shop_settings").update({ inquiries_seen_at: upTo })
    .eq("id", true).or(`inquiries_seen_at.is.null,inquiries_seen_at.lt.${upTo}`);
  if (error) fail("mark inquiries seen", error);
}
