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
// A send that times out after SES accepted it is released and may be
// re-sent on the next run — an accepted trade-off for marketing mail.
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
  let messageId: string | undefined;
  try {
    const result = await sendEmail({
      to: email, ...input.msg, fromName: SENDER_NAME, replyTo: SUPPORT_EMAIL,
      ...(input.unsubscribeUrl ? { unsubscribeUrl: input.unsubscribeUrl } : {}),
    });
    messageId = result.messageId;
  } catch (err) {
    const { error: relErr } = await db().from("email_sends").delete().eq("id", id);
    if (relErr) {
      throw new Error(`send failed AND claim ${id} stuck (delete it to retry): ${String(err)} / ${JSON.stringify(relErr)}`);
    }
    throw err;
  }
  const { error: updErr } = await db().from("email_sends").update({ ses_message_id: messageId ?? null }).eq("id", id);
  if (updErr) console.error(`email_sends update failed for ${id} (send succeeded):`, updErr);
  return "sent";
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

// How many "confirm" emails went to this address since the given instant —
// an anti email-bomb gate (upsertPending), not a user-facing count.
export async function confirmsSentSince(email: string, sinceIso: string): Promise<number> {
  const { data, error } = await db().from("email_sends").select("id")
    .eq("email", normalizeEmail(email)).eq("kind", "confirm").gte("sent_at", sinceIso);
  if (error) throw new Error(`email_sends count failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) ? data.length : 0;
}

const CONFIRM_COOLDOWN_MS = 10 * 60 * 1000;
const CONFIRM_DAILY_WINDOW_MS = 24 * 3600 * 1000;
const CONFIRM_DAILY_LIMIT = 3;

// New or returning subscriber → pending with a fresh confirm token.
// Already confirmed → nothing changes (no second code, no second series).
// Already unsubscribed → the address stays unsubscribed; only a confirmed
// click (confirmSubscriber) undoes that. Too many recent confirm emails →
// cooldown: no new token, nothing sent (anti email-bomb).
export async function upsertPending(input: { email: string; source: "popup" | "signup" | "footer"; partnerRef: string | null }, nowMs: number = Date.now()):
  Promise<{ state: "confirmed" } | { state: "pending"; token: string } | { state: "cooldown" }> {
  const email = normalizeEmail(input.email);
  const existing = await getSubscriber(email);
  if (existing?.status === "confirmed") return { state: "confirmed" };

  const [recent, daily] = await Promise.all([
    confirmsSentSince(email, new Date(nowMs - CONFIRM_COOLDOWN_MS).toISOString()),
    confirmsSentSince(email, new Date(nowMs - CONFIRM_DAILY_WINDOW_MS).toISOString()),
  ]);
  if (recent >= 1 || daily >= CONFIRM_DAILY_LIMIT) return { state: "cooldown" };

  const { token, hash } = newConfirmToken();
  const patch: Record<string, unknown> = {
    email, confirm_token_hash: hash,
    source: existing?.source ?? input.source,
    partner_ref: input.partnerRef ?? existing?.partner_ref ?? null,
  };
  // Leave status/unsubscribed_at alone for an unsubscribed row — a fresh
  // confirm token lets them resubscribe, but only by clicking it.
  if (existing?.status !== "unsubscribed") {
    patch.status = "pending";
    patch.unsubscribed_at = null;
  }
  const { error } = await db().from("subscribers").upsert(patch, { onConflict: "email" });
  if (error) throw new Error(`subscriber upsert failed: ${JSON.stringify(error)}`);
  return { state: "pending", token };
}

export type ConfirmResult = { row: SubscriberRow; already: boolean };

// Confirm link → confirmed; issues the welcome code unless the subscriber
// arrived through a partner link (their partner's code already gives 10%).
// Never nulls confirm_token_hash, so a second click on the same link (a
// double-click, or a mail client/link-scanner prefetching it) is detected
// as `already: true` instead of failing — and never re-sends File 01.
export async function confirmSubscriber(token: string, nowMs: number = Date.now()): Promise<ConfirmResult | null> {
  const hash = hashToken(token);
  const { data, error } = await db().from("subscribers").select("*")
    .eq("confirm_token_hash", hash).in("status", ["pending", "unsubscribed"]).maybeSingle();
  if (error) throw new Error(`subscriber read failed: ${JSON.stringify(error)}`);
  const row = data as SubscriberRow | null;
  if (row) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = row.partner_ref || row.welcome_code ? null : generateWelcomeCode();
      const base = { status: "confirmed", confirmed_at: new Date(nowMs).toISOString(), unsubscribed_at: null };
      const patch = code ? { ...base, welcome_code: code, welcome_code_expires_at: welcomeExpiry(nowMs) } : base;
      const { data: updated, error: upErr } = await db().from("subscribers").update(patch)
        .eq("confirm_token_hash", hash).in("status", ["pending", "unsubscribed"]).select("*").maybeSingle();
      if (!upErr) return { row: updated as SubscriberRow, already: false };
      if ((upErr as { code?: string }).code !== "23505") throw new Error(`subscriber confirm failed: ${JSON.stringify(upErr)}`);
    }
    throw new Error("could not issue a unique welcome code after 5 tries");
  }
  // No pending/unsubscribed row matched — either an invalid token, or one
  // that was already confirmed (and kept its hash) by an earlier click.
  const { data: confirmedData, error: cErr } = await db().from("subscribers").select("*")
    .eq("confirm_token_hash", hash).eq("status", "confirmed").maybeSingle();
  if (cErr) throw new Error(`subscriber read failed: ${JSON.stringify(cErr)}`);
  if (confirmedData) return { row: confirmedData as SubscriberRow, already: true };
  return null;
}

// Works even for an address with no subscribers row yet (cart reminders go
// to non-subscribers too): update it in place, or insert an unsubscribed
// stub if nothing matched, so re-sending to that address is never possible.
export async function unsubscribe(email: string): Promise<void> {
  const e = normalizeEmail(email);
  const now = new Date().toISOString();
  const { data, error } = await db().from("subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: now }).eq("email", e).select("email");
  if (error) throw new Error(`unsubscribe failed: ${JSON.stringify(error)}`);
  if (Array.isArray(data) && data.length > 0) return;
  const { error: insErr } = await db().from("subscribers")
    .insert({ email: e, source: "unsubscribe", status: "unsubscribed", unsubscribed_at: now });
  if (insErr) throw new Error(`unsubscribe insert failed: ${JSON.stringify(insErr)}`);
}

export async function isUnsubscribed(email: string): Promise<boolean> {
  return (await getSubscriber(email))?.status === "unsubscribed";
}

export async function hasPaidOrder(customerId: string): Promise<boolean> {
  const { count, error } = await db().from("orders").select("id", { count: "exact", head: true })
    .eq("customer_id", customerId).in("status", ["paid", "processing", "shipped", "refunded"]);
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

const PAGE_SIZE = 1000;

export async function listWelcomeCandidates(sinceIso: string): Promise<SubscriberRow[]> {
  const out: SubscriberRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db().from("subscribers").select("*")
      .eq("status", "confirmed").gte("confirmed_at", sinceIso)
      .order("email").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`subscriber list failed: ${JSON.stringify(error)}`);
    const rows = (data ?? []) as SubscriberRow[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
}

export async function listConfirmedEmails(): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db().from("subscribers").select("email").eq("status", "confirmed")
      .order("email").range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`subscriber list failed: ${JSON.stringify(error)}`);
    const rows = (data ?? []) as { email: string }[];
    out.push(...rows.map((r) => r.email));
    if (rows.length < PAGE_SIZE) return out;
  }
}
