import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/ses";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { assertCompliant } from "@/lib/email/compliance";
import { normalizeEmail } from "@/lib/email/links";
import type { Msg } from "@/lib/emails-marketing";

const db = () => getSupabaseAdminClient();
export const SENDER_NAME = "Alvester at Aura Protocols";

export type SendKind = "confirm" | "welcome_1" | "welcome_2" | "welcome_3" | "welcome_4" | "welcome_5" | "cart_1" | "cart_2" | "cart_3" | "lot_alert" | "campaign";
export type SubscriberRow = {
  email: string; status: string; source: string; partner_ref: string | null; confirmed_at: string | null; unsubscribed_at: string | null;
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

// The account's email was just verified: a pending sign-up opt-in becomes a
// confirmed subscriber (the checkbox + a verified address is the double
// opt-in). Returns true only when this call confirmed it.
export async function confirmOptIn(email: string, nowMs: number = Date.now()): Promise<boolean> {
  const { data, error } = await db().from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date(nowMs).toISOString(), unsubscribed_at: null })
    .eq("email", normalizeEmail(email)).eq("status", "pending").select("email");
  if (error) throw new Error(`opt-in confirm failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

// Works even for an address with no subscribers row yet (cart reminders go
// to non-subscribers too): update it in place, or insert an unsubscribed
// stub if nothing matched, so re-sending to that address is never possible.
// Also nulls confirm_token_hash. Returns true only when this call changed
// the address to unsubscribed (so an unsubscribe is counted once, even when
// the mail client's one-click POST and the footer link both fire).
export async function unsubscribe(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  const now = new Date().toISOString();
  const patch = { status: "unsubscribed", unsubscribed_at: now, confirm_token_hash: null };
  const { data, error } = await db().from("subscribers").update(patch).eq("email", e).neq("status", "unsubscribed").select("email");
  if (error) throw new Error(`unsubscribe failed: ${JSON.stringify(error)}`);
  if (Array.isArray(data) && data.length > 0) return true;
  if (await getSubscriber(e)) return false; // already unsubscribed
  const { error: insErr } = await db().from("subscribers")
    .insert({ email: e, source: "unsubscribe", status: "unsubscribed", unsubscribed_at: now });
  if (!insErr) return true;
  if ((insErr as { code?: string }).code !== "23505") throw new Error(`unsubscribe insert failed: ${JSON.stringify(insErr)}`);
  // Another request inserted this row between our read and our insert.
  const { data: again, error: retryErr } = await db().from("subscribers").update(patch).eq("email", e).neq("status", "unsubscribed").select("email");
  if (retryErr) throw new Error(`unsubscribe retry failed: ${JSON.stringify(retryErr)}`);
  return Array.isArray(again) && again.length > 0;
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
    .eq("customer_id", customerId).eq("kind", "sale").in("status", ["paid", "processing", "shipped", "refunded"]);
  if (error) throw new Error(`order count failed: ${JSON.stringify(error)}`);
  return (count ?? 0) > 0;
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

// A due cart reminder while reminders are paused: claim it as skipped so the
// sequence moves on and nothing is sent late after resuming. Not counted as sent.
export async function markSkipped(email: string, kind: SendKind, ref: string | null): Promise<boolean> {
  const { error } = await db().from("email_sends").insert({ email: normalizeEmail(email), kind, ref, skipped: true }).select("id").single();
  if (!error) return true;
  if ((error as { code?: string }).code === "23505") return false;
  throw new Error(`skip marker failed: ${JSON.stringify(error)}`);
}

// Current status of each address, in one read (campaign sender).
export async function subscriberStatuses(emails: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!emails.length) return out;
  const { data, error } = await db().from("subscribers").select("email, status").in("email", emails);
  if (error) throw new Error(`subscriber status read failed: ${JSON.stringify(error)}`);
  for (const r of (data ?? []) as { email: string; status: string }[]) out.set(r.email, r.status);
  return out;
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
