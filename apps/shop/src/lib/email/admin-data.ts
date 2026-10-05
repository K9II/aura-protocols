import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/email/links";

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
