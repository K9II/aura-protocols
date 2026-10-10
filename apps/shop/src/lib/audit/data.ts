import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { alertOwner } from "@/lib/notify";

// Who did what, when, for owner actions without a log of their own
// (Orders, Partners, Payouts, Today). Table: admin_events (supabase/audit.sql).
export type AdminArea = "orders" | "partners" | "payouts" | "today" | "staff";
export type AdminAction =
  | "order_shipped" | "order_refunded"
  | "partner_approved" | "partner_declined" | "partner_suspended" | "partner_reinstated"
  | "payout_paid" | "w9_opened" | "w9_checked"
  | "inquiries_seen"
  | "staff_disabled" | "staff_enabled" | "staff_signed_out"
  | "no_charge_created" | "no_charge_cancelled";
export type AdminEventInput = { area: AdminArea; action: AdminAction; targetId?: string | null; label?: string | null; detail?: string | null; actorId: string };

const db = () => getSupabaseAdminClient();

// Throws on failure. Use it before an action that must not happen untracked
// (opening a W-9).
export async function logAdminEvent(e: AdminEventInput): Promise<void> {
  const { error } = await db().from("admin_events").insert({
    area: e.area, action: e.action, target_id: e.targetId ?? null, label: e.label ?? null, detail: e.detail ?? null, actor_id: e.actorId,
  });
  if (error) throw new Error(`admin event insert failed: ${JSON.stringify(error)}`);
}

// After the action already happened (shipped, refunded, paid): a failed log
// must not undo or hide it, so it alerts the owner instead of throwing.
export async function recordAdminEvent(e: AdminEventInput): Promise<void> {
  try { await logAdminEvent(e); }
  catch (err) { await alertOwner("Owner action not logged", `${e.label ?? e.targetId ?? ""} · ${e.action}: ${String(err)}`); }
}
