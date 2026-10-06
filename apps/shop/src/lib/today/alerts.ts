import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ALERTS_KEEP_DAYS, ALERTS_LIST_MAX, ALERT_NOTE_MAX } from "@/lib/today/constants";
import { clipDetail, normalizeAlertTitle, sortAlerts, type OwnerAlert } from "@/lib/today/alert-rules";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };
const COLS = "id, title, detail, count, first_at, last_at, resolved_at, note, customers(full_name)";
type Row = Omit<OwnerAlert, "resolved_by_name"> & { customers: { full_name: string } | null };
const toAlert = ({ customers, ...r }: Row): OwnerAlert => ({ ...r, resolved_by_name: customers?.full_name.split(" ")[0] ?? null });

// Called by alertOwner (lib/notify.ts) for every alert: one open row per
// title; the same problem again counts up (record_owner_alert, today.sql).
export async function recordOwnerAlert(title: string, detail: string): Promise<void> {
  const { error } = await db().rpc("record_owner_alert", { p_title: normalizeAlertTitle(title), p_detail: clipDetail(detail) });
  if (error) fail("record owner alert", error);
}

export async function listOpenAlerts(): Promise<OwnerAlert[]> {
  const { data, error } = await db().from("owner_alerts").select(COLS).is("resolved_at", null).order("last_at", { ascending: false });
  if (error) fail("open alerts read", error);
  return ((data ?? []) as unknown as Row[]).map(toAlert);
}

// Past alerts: the last ALERTS_KEEP_DAYS days, plus anything still open.
export async function listPastAlerts(nowMs: number): Promise<OwnerAlert[]> {
  const since = new Date(nowMs - ALERTS_KEEP_DAYS * 86_400_000).toISOString();
  const { data, error } = await db().from("owner_alerts").select(COLS)
    .or(`resolved_at.is.null,last_at.gte.${since}`).order("last_at", { ascending: false }).limit(ALERTS_LIST_MAX);
  if (error) fail("past alerts read", error);
  return sortAlerts(((data ?? []) as unknown as Row[]).map(toAlert));
}

// true = marked done; false = it was already done (a stale page).
export async function resolveAlert(id: string, actor: string, note: string | null): Promise<boolean> {
  const { data, error } = await db().from("owner_alerts")
    .update({ resolved_at: new Date().toISOString(), resolved_by: actor, note: note ? note.slice(0, ALERT_NOTE_MAX) : null })
    .eq("id", id).is("resolved_at", null).select("id");
  if (error) fail("resolve alert", error);
  return Array.isArray(data) && data.length === 1;
}
