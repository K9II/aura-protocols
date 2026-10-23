import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { confirmSubscriber, getSubscriber, sendTracked } from "@/lib/email/data";
import { normalizeEmail, unsubscribeUrl } from "@/lib/email/links";
import { waitlistInEmail } from "@/lib/emails-marketing";
import { waitlistSignupNotice } from "@/lib/emails";
import { sendEmail } from "@/lib/ses";
import { siteUrl } from "@/lib/supabase/env";
import { alertAddress, alertOwner } from "@/lib/notify";
import { inviteLabel, inviteUrl, newReferralCode } from "./codes";

// The pre-launch waitlist (2026-10-23). Single opt-in since 2026-10-23
// (Alvester: "no barriers to entry"): entering an email puts it on the list
// (subscribers, source 'waitlist', confirmed) and the page shows the person's
// invite link at once; "You're on the list" emails the same link with an
// unsubscribe link. Rows left pending by the old confirm step still confirm
// through /api/waitlist/confirm.

const db = () => getSupabaseAdminClient();

// Invite emails sent in the last hour. Above it the form asks people to try
// again shortly and the owner is alerted: a bot pasting strangers' addresses
// would otherwise make us mail them.
export const WAITLIST_HOURLY_CAP = 120;

export async function invitesLastHour(nowMs: number = Date.now()): Promise<number> {
  const { count, error } = await db().from("email_sends").select("id", { count: "exact", head: true })
    .eq("kind", "waitlist_in").gte("sent_at", new Date(nowMs - 3600 * 1000).toISOString());
  if (error) throw new Error(`invite count failed: ${JSON.stringify(error)}`);
  return count ?? 0;
}

// Returns the person's invite code. Throws when the sign-up can't be saved;
// a failed invite email only alerts the owner (they're on the list either way).
export async function joinWaitlist(input: { email: string; referredBy: string | null }, nowMs: number = Date.now()): Promise<string> {
  const email = normalizeEmail(input.email);
  const existing = await getSubscriber(email);
  if (existing?.status !== "confirmed") {
    // A "source" of "unsubscribe" is just the stub unsubscribe() creates — not a real source to keep.
    const keepSource = existing?.source && existing.source !== "unsubscribe";
    const { error } = await db().from("subscribers").upsert({
      email, source: keepSource ? existing!.source : "waitlist", status: "confirmed",
      confirmed_at: new Date(nowMs).toISOString(), unsubscribed_at: null, confirm_token_hash: null,
    }, { onConflict: "email" });
    if (error) throw new Error(`waitlist save failed: ${JSON.stringify(error)}`);
  }
  const joined = await markJoined(email, input.referredBy, nowMs);
  const code = await ensureReferralCode(email);
  await sendInviteQuietly(email, code);
  if (joined.isNew) await notifyOwnerQuietly({ email, code, referrerEmail: joined.referrerEmail, referredBy: joined.referrerEmail ? input.referredBy : null }, nowMs);
  return code;
}

// First join time and the first invite link used are kept; later ones don't
// overwrite them. A code that isn't on the list, or is the person's own, is ignored.
// isNew: this call put the address on the waitlist (the owner hears about it once).
async function markJoined(email: string, referredBy: string | null, nowMs: number): Promise<{ isNew: boolean; referrerEmail: string | null }> {
  const { data, error } = await db().from("subscribers").update({ waitlist_at: new Date(nowMs).toISOString() })
    .eq("email", email).is("waitlist_at", null).select("email");
  if (error) throw new Error(`waitlist_at save failed: ${JSON.stringify(error)}`);
  const isNew = Array.isArray(data) && data.length > 0;
  if (!referredBy) return { isNew, referrerEmail: null };
  const { data: referrer, error: rErr } = await db().from("subscribers").select("email").eq("referral_code", referredBy).maybeSingle();
  if (rErr) throw new Error(`referrer read failed: ${JSON.stringify(rErr)}`);
  const referrerEmail = (referrer as { email: string } | null)?.email ?? null;
  if (!referrerEmail || referrerEmail === email) return { isNew, referrerEmail: null };
  const { data: set, error: uErr } = await db().from("subscribers").update({ referred_by: referredBy })
    .eq("email", email).is("referred_by", null).is("referral_code", null).select("email");
  if (uErr) throw new Error(`referred_by save failed: ${JSON.stringify(uErr)}`);
  return { isNew, referrerEmail: Array.isArray(set) && set.length > 0 ? referrerEmail : null };
}

// The owner's "Waitlist sign-up" email. Never throws: a missed notice must not
// cost anyone their place on the list (the row is the record).
async function notifyOwnerQuietly(n: { email: string; code: string; referrerEmail: string | null; referredBy: string | null }, nowMs: number): Promise<void> {
  const to = alertAddress();
  if (!to) return;
  try {
    const { count, error } = await db().from("subscribers").select("email", { count: "exact", head: true }).not("waitlist_at", "is", null);
    if (error) throw new Error(`waitlist count failed: ${JSON.stringify(error)}`);
    const at = new Date(nowMs).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " MT";
    await sendEmail({ to, ...waitlistSignupNotice({ ...n, total: count ?? 0, at }) });
  } catch (err) {
    console.error("waitlist sign-up notice not sent:", err);
  }
}

// The person's invite code, made on first need. Retries a code clash.
export async function ensureReferralCode(email: string): Promise<string> {
  const e = normalizeEmail(email);
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await getSubscriber(e);
    if (!row) throw new Error(`no subscriber row for ${e}`);
    if (row.referral_code) return row.referral_code;
    const code = newReferralCode((n) => randomBytes(n));
    const { error } = await db().from("subscribers").update({ referral_code: code }).eq("email", e).is("referral_code", null);
    if (error && (error as { code?: string }).code !== "23505") throw new Error(`referral code save failed: ${JSON.stringify(error)}`);
  }
  throw new Error(`no free referral code for ${e} after 5 tries`);
}

async function sendInviteQuietly(email: string, code: string): Promise<void> {
  try {
    await sendInviteEmail(email, code);
  } catch (err) {
    await alertOwner("Waitlist: invite email failed", `${email} (code ${code}): ${String(err)}`);
  }
}

async function sendInviteEmail(email: string, code: string): Promise<void> {
  const site = siteUrl();
  const unsub = unsubscribeUrl(site, email, "waitlist_in");
  await sendTracked({
    email, kind: "waitlist_in", ref: null, unsubscribeUrl: unsub,
    msg: waitlistInEmail({ site, unsubscribeUrl: unsub }, { url: inviteUrl(site, code), label: inviteLabel(site, code) }),
  });
}

export type WaitlistConfirm = { state: "in"; code: string } | { state: "invalid" };

// The old confirm link (rows pending from before single opt-in). A second click (or a link scanner) lands on the same
// "you're in" screen; the invite email still goes once.
export async function confirmWaitlist(token: string, nowMs: number = Date.now()): Promise<WaitlistConfirm> {
  const result = await confirmSubscriber(token, nowMs);
  if (!result) return { state: "invalid" };
  const code = await ensureReferralCode(result.row.email);
  await sendInviteQuietly(result.row.email, code);
  return { state: "in", code };
}
