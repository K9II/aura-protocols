import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/email/links";
import type { RunRow } from "@/lib/email/health";

const db = () => getSupabaseAdminClient();
const fail = (what: string, error: unknown): never => { throw new Error(`${what} failed: ${JSON.stringify(error)}`); };

// ---------- events (bounce / complaint / unsubscribe) ----------
export type EmailEventType = "bounce" | "complaint" | "unsubscribe";
export async function recordEmailEvent(i: { type: EmailEventType; email: string; sesMessageId?: string | null; sourceKind: string | null; sourceRef: string | null }): Promise<void> {
  const { error } = await db().from("email_events").insert({
    type: i.type, email: normalizeEmail(i.email), ses_message_id: i.sesMessageId ?? null, source_kind: i.sourceKind, source_ref: i.sourceRef,
  });
  if (error) fail("email event insert", error);
}

// Which marketing email an SES message id belongs to (null for
// transactional mail, which isn't in email_sends).
export async function sourceForMessage(sesMessageId: string): Promise<{ kind: string; ref: string | null } | null> {
  const { data, error } = await db().from("email_sends").select("kind, ref").eq("ses_message_id", sesMessageId).maybeSingle();
  if (error) fail("email source lookup", error);
  const r = data as { kind: string; ref: string | null } | null;
  return r ? { kind: r.kind, ref: r.kind === "campaign" ? r.ref : null } : null;
}

// ---------- pause switches ----------
export type Automation = "welcome" | "cart";
export const AUTOMATION_LABEL: Record<Automation, string> = { welcome: "Welcome series", cart: "Cart reminders" };

export async function getEmailSettings(): Promise<{ welcomePaused: boolean; cartPaused: boolean }> {
  const { data, error } = await db().from("shop_settings").select("welcome_paused, cart_paused").eq("id", true).single();
  if (error || !data) fail("email settings read", error ?? "no shop_settings row");
  const d = data as { welcome_paused: boolean; cart_paused: boolean };
  return { welcomePaused: d.welcome_paused, cartPaused: d.cart_paused };
}

// Returns false when the switch was already in that position (stale click).
export async function setAutomationPaused(a: Automation, paused: boolean, actor: string, note: string | null): Promise<boolean> {
  const col = a === "welcome" ? "welcome_paused" : "cart_paused";
  const { data, error } = await db().from("shop_settings").update({ [col]: paused, updated_at: new Date().toISOString() }).eq(col, !paused).select("id");
  if (error) fail("pause switch update", error);
  if (!Array.isArray(data) || data.length === 0) return false;
  await logEmailAdminEvent({ action: paused ? "paused" : "resumed", target: a, actor, note });
  return true;
}

// ---------- admin log ----------
export type EmailAdminAction = "paused" | "resumed" | "created" | "scheduled" | "unscheduled" | "send_started" | "stopped" | "finished" | "test_sent" | "copied" | "edited";
export type EmailAdminEvent = { id: string; action: EmailAdminAction; target: string; actor: string | null; note: string | null; at: string; actorName: string | null };

export async function logEmailAdminEvent(i: { action: EmailAdminAction; target: string; actor: string | null; note?: string | null }): Promise<void> {
  const { error } = await db().from("email_admin_events").insert({ action: i.action, target: i.target, actor: i.actor, note: i.note ?? null });
  if (error) fail("email admin log", error);
}

export async function listAdminEvents(target: string): Promise<EmailAdminEvent[]> {
  const { data, error } = await db().from("email_admin_events").select("*, customers(full_name)").eq("target", target).order("at", { ascending: false }).limit(100);
  if (error) fail("email admin log read", error);
  return ((data ?? []) as Array<Omit<EmailAdminEvent, "actorName"> & { customers: { full_name: string } | null }>).map(({ customers, ...r }) => ({ ...r, actorName: customers?.full_name ?? null }));
}

// ---------- hourly runs ----------
export async function startRun(): Promise<string> {
  // Both timestamps from the app clock, so a run never "finishes" before it starts.
  const { data, error } = await db().from("email_runs").insert({ started_at: new Date().toISOString() }).select("id").single();
  if (error || !data) fail("email run start", error ?? "no row");
  return (data as { id: string }).id;
}

export async function finishRun(id: string, r: { welcome: number; cart: number; cartSkipped: number; campaign: number; failures: string[] }): Promise<void> {
  const { error } = await db().from("email_runs").update({
    finished_at: new Date().toISOString(), welcome_sent: r.welcome, cart_sent: r.cart, cart_skipped: r.cartSkipped, campaign_sent: r.campaign,
    failures: r.failures.length, error_text: r.failures.length ? r.failures.join("\n").slice(0, 4000) : null,
  }).eq("id", id);
  if (error) fail("email run finish", error);
}

export async function listRuns(limit: number): Promise<Array<RunRow & { id: string }>> {
  const { data, error } = await db().from("email_runs").select("*").order("started_at", { ascending: false }).limit(limit);
  if (error) fail("email runs read", error);
  return (data ?? []) as Array<RunRow & { id: string }>;
}
