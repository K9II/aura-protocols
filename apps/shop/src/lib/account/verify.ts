import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/ses";
import { verifyEmail } from "@/lib/emails";
import { hashToken, newConfirmToken } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";

const db = () => getSupabaseAdminClient();
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

// A fresh link replaces any earlier one (only the newest hash is stored).
// Throws if the token can't be stored or the email can't be sent.
export async function sendVerifyEmail(customerId: string, email: string): Promise<void> {
  const { token, hash } = newConfirmToken();
  const { error } = await db().from("customers").update({ verify_token_hash: hash, verify_sent_at: new Date().toISOString() }).eq("id", customerId);
  if (error) throw new Error(`verify token save failed: ${JSON.stringify(error)}`);
  await sendEmail({ to: email, ...verifyEmail(`${siteUrl()}/auth/verify?token=${encodeURIComponent(token)}`) });
}

export async function lastVerifySentAt(customerId: string): Promise<string | null> {
  const { data, error } = await db().from("customers").select("verify_sent_at").eq("id", customerId).maybeSingle();
  if (error) throw new Error(`customer read failed: ${JSON.stringify(error)}`);
  return (data as { verify_sent_at: string | null } | null)?.verify_sent_at ?? null;
}

export type VerifyResult = { customerId: string; email: string; optIn: boolean; already: boolean };

// The hash is kept after use, so a second click (or a mail scanner
// prefetching the link) reads as `already` instead of "invalid".
export async function consumeVerifyToken(token: string, nowMs: number = Date.now()): Promise<VerifyResult | null> {
  const { data, error } = await db().from("customers").select("id, email_verified_at, verify_sent_at, marketing_opt_in")
    .eq("verify_token_hash", hashToken(token)).maybeSingle();
  if (error) throw new Error(`verify lookup failed: ${JSON.stringify(error)}`);
  const row = data as { id: string; email_verified_at: string | null; verify_sent_at: string | null; marketing_opt_in: boolean } | null;
  if (!row) return null;
  let already = !!row.email_verified_at;
  if (!already) {
    if (!row.verify_sent_at || nowMs - Date.parse(row.verify_sent_at) > TOKEN_TTL_MS) return null;
    const { data: upd, error: uErr } = await db().from("customers")
      .update({ email_verified_at: new Date(nowMs).toISOString(), verify_required: false })
      .eq("id", row.id).is("email_verified_at", null).select("id");
    if (uErr) throw new Error(`verify update failed: ${JSON.stringify(uErr)}`);
    already = !Array.isArray(upd) || upd.length === 0; // a concurrent click won
  }
  const { data: u, error: aErr } = await db().auth.admin.getUserById(row.id);
  if (aErr || !u.user?.email) throw new Error(`auth user read failed: ${JSON.stringify(aErr)}`);
  return { customerId: row.id, email: u.user.email, optIn: row.marketing_opt_in, already };
}
