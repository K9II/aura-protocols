import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ATTRIBUTION_DAYS, CART_RECOVERY_HOURS } from "@/lib/email/constants";
import { statKey, type Attribution, type SendStat } from "@/lib/email/stat-keys";
import type { Audience } from "@/lib/email/campaigns/rules";

const db = () => getSupabaseAdminClient();
async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = args ? await db().rpc(fn, args) : await db().rpc(fn);
  if (error || data == null) throw new Error(`${fn} failed: ${JSON.stringify(error ?? "no data")}`);
  return data as T;
}
const num = (v: unknown) => Number(v ?? 0);

export type Overview = { confirmed: number; pending: number; unsubscribed: number; sent_30d: number; sent_prior_30d: number; bounces_30d: number; complaints_30d: number };
export async function emailOverview(): Promise<Overview> {
  const d = await call<Record<keyof Overview, unknown>>("admin_email_overview");
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, num(v)])) as Overview;
}

export async function sendStats(sinceIso: string): Promise<Map<string, SendStat>> {
  const rows = await call<Array<{ kind: string; ref: string | null; sent: unknown; bounced: unknown; complaints: unknown; unsubscribed: unknown }>>("admin_email_send_stats", { p_since: sinceIso });
  return new Map(rows.map((r) => [statKey(r.kind, r.ref), { sent: num(r.sent), bounced: num(r.bounced), complaints: num(r.complaints), unsubscribed: num(r.unsubscribed) }]));
}

export async function attribution(sinceIso: string): Promise<Map<string, Attribution>> {
  const rows = await call<Array<{ kind: string; ref: string | null; orders: unknown; revenue_cents: unknown }>>("admin_email_attribution", { p_since: sinceIso, p_days: ATTRIBUTION_DAYS });
  return new Map(rows.map((r) => [statKey(r.kind, r.ref), { orders: num(r.orders), revenueCents: num(r.revenue_cents) }]));
}

export async function cartRecovery(sinceIso: string): Promise<{ reminded: number; recovered: number; revenueCents: number }> {
  const d = await call<{ reminded: unknown; recovered: unknown; revenue_cents: unknown }>("admin_cart_recovery", { p_since: sinceIso, p_hours: CART_RECOVERY_HOURS });
  return { reminded: num(d.reminded), recovered: num(d.recovered), revenueCents: num(d.revenue_cents) };
}

export async function audienceCounts(): Promise<Record<Audience, number>> {
  const d = await call<Record<Audience, unknown>>("admin_email_audience_counts");
  return { all: num(d.all), ordered: num(d.ordered), never_ordered: num(d.never_ordered) };
}
