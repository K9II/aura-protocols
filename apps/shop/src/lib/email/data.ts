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
  // A "source" of "unsubscribe" is just the stub unsubscribe() creates for
  // an address with no subscribers row — it isn't a real source to keep.
  const keepSource = existing?.source && existing.source !== "unsubscribe";
  const patch: Record<string, unknown> = {
    email, confirm_token_hash: hash,
    source: keepSource ? existing!.source : input.source,
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
    let lostRace = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = row.partner_ref || row.welcome_code ? null : generateWelcomeCode();
      const base = { status: "confirmed", confirmed_at: new Date(nowMs).toISOString(), unsubscribed_at: null };
      const patch = code ? { ...base, welcome_code: code, welcome_code_expires_at: welcomeExpiry(nowMs) } : base;
      const { data: updated, error: upErr } = await db().from("subscribers").update(patch)
        .eq("confirm_token_hash", hash).in("status", ["pending", "unsubscribed"]).select("*").maybeSingle();
      if (!upErr) {
        if (updated) return { row: updated as SubscriberRow, already: false };
        // Matched 0 rows: another request confirmed this row first. Fall
        // through to the already-confirmed lookup below instead of failing.
        lostRace = true;
        break;
      }
      if ((upErr as { code?: string }).code !== "23505") throw new Error(`subscriber confirm failed: ${JSON.stringify(upErr)}`);
    }
    if (!lostRace) throw new Error("could not issue a unique welcome code after 5 tries");
  }
  // No pending/unsubscribed row matched — either an invalid token, one
  // already confirmed (and kept its hash) by an earlier click, or one a
  // concurrent request just confirmed above.
  const { data: confirmedData, error: cErr } = await db().from("subscribers").select("*")
    .eq("confirm_token_hash", hash).eq("status", "confirmed").maybeSingle();
  if (cErr) throw new Error(`subscriber read failed: ${JSON.stringify(cErr)}`);
  if (confirmedData) return { row: confirmedData as SubscriberRow, already: true };
  return null;
}

// Works even for an address with no subscribers row yet (cart reminders go
// to non-subscribers too): update it in place, or insert an unsubscribed
// stub if nothing matched, so re-sending to that address is never possible.
// Also nulls confirm_token_hash — otherwise a confirm link sent before this
// unsubscribe would still match in confirmSubscriber and resubscribe them.
export async function unsubscribe(email: string): Promise<void> {
  const e = normalizeEmail(email);
  const now = new Date().toISOString();
  const patch = { status: "unsubscribed", unsubscribed_at: now, confirm_token_hash: null };
  const { data, error } = await db().from("subscribers").update(patch).eq("email", e).select("email");
  if (error) throw new Error(`unsubscribe failed: ${JSON.stringify(error)}`);
  if (Array.isArray(data) && data.length > 0) return;
  const { error: insErr } = await db().from("subscribers")
    .insert({ email: e, source: "unsubscribe", status: "unsubscribed", unsubscribed_at: now });
  if (!insErr) return;
  if ((insErr as { code?: string }).code !== "23505") throw new Error(`unsubscribe insert failed: ${JSON.stringify(insErr)}`);
  // Another request inserted this row between our update and our insert —
  // it exists now, so update it instead of failing.
  const { error: retryErr } = await db().from("subscribers").update(patch).eq("email", e);
  if (retryErr) throw new Error(`unsubscribe retry failed: ${JSON.stringify(retryErr)}`);
}

// The sign-up box was ticked: the address goes on the list as pending until
// the account's email is verified (confirmOptIn). Ticking the box is a fresh
// request, so an earlier unsubscribe is cleared here — but nothing is sent
// until the address is verified. Already confirmed stays as it is.
export async function recordOptIn(email: string, partnerRef: string | null): Promise<void> {
  const e = normalizeEmail(email);
  const existing = await getSubscriber(e);
  if (existing?.status === "confirmed") return;
  const { error } = await db().from("subscribers").upsert(
    { email: e, source: "signup", status: "pending", unsubscribed_at: null, partner_ref: partnerRef ?? existing?.partner_ref ?? null },
    { onConflict: "email" },
  );
  if (error) throw new Error(`opt-in save failed: ${JSON.stringify(error)}`);
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
// one code can't both claim it; returns false if another order already used
// it. Idempotent: a repeat call for the same order (a retry) returns true.
// orderId is our own orders.id uuid, never user input.
export async function markWelcomeCodeUsed(code: string, orderId: string): Promise<boolean> {
  const { data, error } = await db().from("subscribers").update({ welcome_code_used_order_id: orderId })
    .eq("welcome_code", code).or(`welcome_code_used_order_id.is.null,welcome_code_used_order_id.eq.${orderId}`).select("email");
  if (error) throw new Error(`welcome code update failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

export async function sentKinds(email: string): Promise<Set<string>> {
  const { data, error } = await db().from("email_sends").select("kind, ref").eq("email", normalizeEmail(email));
  if (error) throw new Error(`email_sends read failed: ${JSON.stringify(error)}`);
  return new Set(((data ?? []) as { kind: string; ref: string | null }[]).map((r) => (r.ref ? `${r.kind}:${r.ref}` : r.kind)));
}

const PAGE_SIZE = 1000;

// One query per page of up to 1,000 emails instead of two reads per
// subscriber (sentKinds + a last-sent lookup) — the hourly cron's welcome
// loop used to do both per candidate; this does it once for the whole batch.
export async function welcomeSendsFor(emails: string[]): Promise<Map<string, { kinds: Set<string>; lastSentMs: number | null }>> {
  const out = new Map<string, { kinds: Set<string>; lastSentMs: number | null }>();
  for (let from = 0; from < emails.length; from += PAGE_SIZE) {
    const page = emails.slice(from, from + PAGE_SIZE);
    const { data, error } = await db().from("email_sends").select("email, kind, sent_at")
      .in("email", page).like("kind", "welcome_%");
    if (error) throw new Error(`email_sends read failed: ${JSON.stringify(error)}`);
    for (const r of (data ?? []) as { email: string; kind: string; sent_at: string }[]) {
      const entry = out.get(r.email) ?? { kinds: new Set<string>(), lastSentMs: null };
      entry.kinds.add(r.kind);
      const ms = Date.parse(r.sent_at);
      if (entry.lastSentMs === null || ms > entry.lastSentMs) entry.lastSentMs = ms;
      out.set(r.email, entry);
    }
  }
  return out;
}

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
