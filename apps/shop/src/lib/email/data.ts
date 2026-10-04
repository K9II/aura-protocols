import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/ses";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { assertCompliant } from "@/lib/email/compliance";
import { hashToken, newConfirmToken, normalizeEmail } from "@/lib/email/links";
import { generateWelcomeCode, welcomeExpiry, type WelcomeRow } from "@/lib/email/welcome-code";
import type { Msg } from "@/lib/emails-marketing";

const db = () => getSupabaseAdminClient();
export const SENDER_NAME = "Alvester at Aura Protocols";

export type SendKind = "confirm" | "welcome_1" | "welcome_2" | "welcome_3" | "welcome_4" | "welcome_5" | "cart_1" | "cart_2" | "cart_3" | "lot_alert";
export type SubscriberRow = WelcomeRow & {
  source: string; partner_ref: string | null; confirmed_at: string | null; unsubscribed_at: string | null;
};

// The only way marketing mail goes out. Claims a unique email_sends row
// first (so nothing is sent twice, even across retries and parallel runs),
// then sends. A failed send releases the claim and throws, so the caller
// alerts the owner and the next run retries.
export async function sendTracked(input: {
  email: string; kind: SendKind; ref: string | null; msg: Msg; unsubscribeUrl?: string;
}): Promise<"sent" | "duplicate"> {
  assertCompliant(input.msg.subject, input.msg.html);
  const email = normalizeEmail(input.email);
  const { data, error } = await db().from("email_sends")
    .insert({ email, kind: input.kind, ref: input.ref }).select("id").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") return "duplicate";
    throw new Error(`email_sends claim failed: ${JSON.stringify(error)}`);
  }
  const id = (data as { id: string }).id;
  try {
    const { messageId } = await sendEmail({
      to: email, ...input.msg, fromName: SENDER_NAME, replyTo: SUPPORT_EMAIL,
      ...(input.unsubscribeUrl ? { unsubscribeUrl: input.unsubscribeUrl } : {}),
    });
    await db().from("email_sends").update({ ses_message_id: messageId ?? null }).eq("id", id);
    return "sent";
  } catch (err) {
    await db().from("email_sends").delete().eq("id", id);
    throw err;
  }
}

export async function getSubscriber(email: string): Promise<SubscriberRow | null> {
  const { data, error } = await db().from("subscribers").select("*").eq("email", normalizeEmail(email)).maybeSingle();
  if (error) throw new Error(`subscriber read failed: ${JSON.stringify(error)}`);
  return (data as SubscriberRow | null) ?? null;
}

export async function getSubscriberByCode(code: string): Promise<SubscriberRow | null> {
  const { data, error } = await db().from("subscribers").select("*").eq("welcome_code", code).maybeSingle();
  if (error) throw new Error(`subscriber read failed: ${JSON.stringify(error)}`);
  return (data as SubscriberRow | null) ?? null;
}

// New or returning subscriber → pending with a fresh confirm token.
// Already confirmed → nothing changes (no second code, no second series).
export async function upsertPending(input: { email: string; source: "popup" | "signup" | "footer"; partnerRef: string | null }):
  Promise<{ state: "confirmed" } | { state: "pending"; token: string }> {
  const email = normalizeEmail(input.email);
  const existing = await getSubscriber(email);
  if (existing?.status === "confirmed") return { state: "confirmed" };
  const { token, hash } = newConfirmToken();
  const { error } = await db().from("subscribers").upsert({
    email, source: input.source, status: "pending", confirm_token_hash: hash,
    partner_ref: input.partnerRef, unsubscribed_at: null,
  }, { onConflict: "email" });
  if (error) throw new Error(`subscriber upsert failed: ${JSON.stringify(error)}`);
  return { state: "pending", token };
}

// Confirm link → confirmed; issues the welcome code unless the subscriber
// arrived through a partner link (their partner's code already gives 10%).
export async function confirmSubscriber(token: string, nowMs: number = Date.now()): Promise<SubscriberRow | null> {
  const { data, error } = await db().from("subscribers").select("*")
    .eq("confirm_token_hash", hashToken(token)).eq("status", "pending").maybeSingle();
  if (error) throw new Error(`subscriber read failed: ${JSON.stringify(error)}`);
  const row = data as SubscriberRow | null;
  if (!row) return null;
  const base = { status: "confirmed", confirmed_at: new Date(nowMs).toISOString(), confirm_token_hash: null };
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = row.partner_ref || row.welcome_code ? null : generateWelcomeCode();
    const patch = code ? { ...base, welcome_code: code, welcome_code_expires_at: welcomeExpiry(nowMs) } : base;
    const { data: updated, error: upErr } = await db().from("subscribers").update(patch)
      .eq("email", row.email).eq("status", "pending").select("*").maybeSingle();
    if (!upErr) return (updated as SubscriberRow | null) ?? null;
    if ((upErr as { code?: string }).code !== "23505") throw new Error(`subscriber confirm failed: ${JSON.stringify(upErr)}`);
  }
  throw new Error("could not issue a unique welcome code after 5 tries");
}

export async function unsubscribe(email: string): Promise<void> {
  const { error } = await db().from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() }).eq("email", normalizeEmail(email));
  if (error) throw new Error(`unsubscribe failed: ${JSON.stringify(error)}`);
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  return (await getSubscriber(email))?.status === "unsubscribed";
}

export async function hasPaidOrder(customerId: string): Promise<boolean> {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true })
    .eq("customer_id", customerId).in("status", ["paid", "shipped", "refunded"]);
  if (error) throw new Error(`order count failed: ${JSON.stringify(error)}`);
  return (count ?? 0) > 0;
}

// Marks the code used by this order. Conditional, so two orders racing for
// one code can't both claim it; returns false if it was already used.
export async function markWelcomeCodeUsed(code: string, orderId: string): Promise<boolean> {
  const { data, error } = await db().from("subscribers").update({ welcome_code_used_order_id: orderId })
    .eq("welcome_code", code).is("welcome_code_used_order_id", null).select("email");
  if (error) throw new Error(`welcome code update failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

export async function sentKinds(email: string): Promise<Set<string>> {
  const { data, error } = await db().from("email_sends").select("kind, ref").eq("email", normalizeEmail(email));
  if (error) throw new Error(`email_sends read failed: ${JSON.stringify(error)}`);
  return new Set(((data ?? []) as { kind: string; ref: string | null }[]).map((r) => (r.ref ? `${r.kind}:${r.ref}` : r.kind)));
}

// When the latest welcome file went out (ms), so files stay a day apart.
export async function lastWelcomeSentAt(email: string): Promise<number | null> {
  const { data, error } = await db().from("email_sends").select("sent_at").eq("email", normalizeEmail(email))
    .like("kind", "welcome_%").order("sent_at", { ascending: false }).limit(1);
  if (error) throw new Error(`email_sends read failed: ${JSON.stringify(error)}`);
  const row = ((data ?? []) as { sent_at: string }[])[0];
  return row ? Date.parse(row.sent_at) : null;
}

export async function listWelcomeCandidates(sinceIso: string): Promise<SubscriberRow[]> {
  const { data, error } = await db().from("subscribers").select("*")
    .eq("status", "confirmed").gte("confirmed_at", sinceIso);
  if (error) throw new Error(`subscriber list failed: ${JSON.stringify(error)}`);
  return (data ?? []) as SubscriberRow[];
}

export async function listConfirmedEmails(): Promise<string[]> {
  const { data, error } = await db().from("subscribers").select("email").eq("status", "confirmed");
  if (error) throw new Error(`subscriber list failed: ${JSON.stringify(error)}`);
  return ((data ?? []) as { email: string }[]).map((r) => r.email);
}
