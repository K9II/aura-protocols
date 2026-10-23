import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { confirmSubscriber, getSubscriber, sendTracked, upsertPending } from "@/lib/email/data";
import { hashToken, normalizeEmail, unsubscribeUrl } from "@/lib/email/links";
import { waitlistConfirmEmail, waitlistInEmail } from "@/lib/emails-marketing";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";
import { inviteLabel, inviteUrl, newReferralCode } from "./codes";

// The pre-launch waitlist (2026-10-23). Joining = the Aura letter's double
// opt-in with source 'waitlist': a confirm link first, then "You're on the
// list" with the person's invite link. The page answers the same for a new,
// pending, confirmed or cooling-down address — it never reveals whether
// someone else's address is on the list.

const db = () => getSupabaseAdminClient();

// Confirm emails sent to anyone in the last hour. Above it the form asks
// people to try again shortly and the owner is alerted: a bot pasting
// strangers' addresses would otherwise make us mail them.
export const WAITLIST_HOURLY_CAP = 120;

export async function confirmsLastHour(nowMs: number = Date.now()): Promise<number> {
  const { count, error } = await db().from("email_sends").select("id", { count: "exact", head: true })
    .eq("kind", "confirm").gte("sent_at", new Date(nowMs - 3600 * 1000).toISOString());
  if (error) throw new Error(`confirm count failed: ${JSON.stringify(error)}`);
  return count ?? 0;
}

// Throws when the sign-up can't be saved or the email can't be sent.
export async function joinWaitlist(input: { email: string; referredBy: string | null }, nowMs: number = Date.now()): Promise<void> {
  const email = normalizeEmail(input.email);
  const r = await upsertPending({ email, source: "waitlist", partnerRef: null }, nowMs);
  await markJoined(email, input.referredBy, nowMs);
  if (r.state === "pending") {
    const url = `${siteUrl()}/api/waitlist/confirm?token=${encodeURIComponent(r.token)}`;
    await sendTracked({ email, kind: "confirm", ref: hashToken(r.token), msg: waitlistConfirmEmail(url) });
  } else if (r.state === "confirmed") {
    // Already confirmed (e.g. on the Aura letter): no second opt-in needed —
    // they get their invite link (once; sendTracked dedupes waitlist_in).
    await sendInvite(email);
  }
}

// First join time and the first invite link used are kept; later ones don't
// overwrite them. A code that isn't on the list, or is the person's own, is ignored.
async function markJoined(email: string, referredBy: string | null, nowMs: number): Promise<void> {
  const { error } = await db().from("subscribers").update({ waitlist_at: new Date(nowMs).toISOString() })
    .eq("email", email).is("waitlist_at", null);
  if (error) throw new Error(`waitlist_at save failed: ${JSON.stringify(error)}`);
  if (!referredBy) return;
  const { data: referrer, error: rErr } = await db().from("subscribers").select("email").eq("referral_code", referredBy).maybeSingle();
  if (rErr) throw new Error(`referrer read failed: ${JSON.stringify(rErr)}`);
  if (!referrer || (referrer as { email: string }).email === email) return;
  const { error: uErr } = await db().from("subscribers").update({ referred_by: referredBy })
    .eq("email", email).is("referred_by", null).is("referral_code", null);
  if (uErr) throw new Error(`referred_by save failed: ${JSON.stringify(uErr)}`);
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

async function sendInvite(email: string): Promise<string> {
  const code = await ensureReferralCode(email);
  await sendInviteEmail(email, code);
  return code;
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

// The confirm link. A second click (or a link scanner) lands on the same
// "you're in" screen; the invite email still goes once.
export async function confirmWaitlist(token: string, nowMs: number = Date.now()): Promise<WaitlistConfirm> {
  const result = await confirmSubscriber(token, nowMs);
  if (!result) return { state: "invalid" };
  const code = await ensureReferralCode(result.row.email);
  // They're on the list either way; a failed email is the owner's to resend.
  try {
    await sendInviteEmail(result.row.email, code);
  } catch (err) {
    await alertOwner("Waitlist: invite email failed", `${result.row.email} (code ${code}): ${String(err)}`);
  }
  return { state: "in", code };
}
