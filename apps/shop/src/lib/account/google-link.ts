import "server-only";
import { randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { alertOwner } from "@/lib/notify";

export type GoogleLinkResult = { ok: true; changed: boolean } | { ok: false; error: string };

// Pre-hijack guard. Supabase "Confirm email" is OFF and links identities by
// email, so anyone could make a password account for someone else's address;
// when the real owner later uses Google they'd land in it, with the other
// person still holding the password. Called from /auth/callback for a Google
// sign-in on a user that also has an email (password) identity:
// - the address was confirmed earlier (email_verified_at): the password owner
//   proved it first — nothing changes;
// - otherwise Google just proved the address: the old password is replaced
//   with a random one nobody knows, then the address is marked confirmed.
// Not ok = the password may still be live; the caller must sign the user out.
export async function secureGoogleLink(userId: string): Promise<GoogleLinkResult> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("customers").select("id, email_verified_at").eq("id", userId).maybeSingle();
  if (error) return { ok: false, error: `customer read: ${JSON.stringify(error)}` };
  const row = data as { id: string; email_verified_at: string | null } | null;
  if (row?.email_verified_at) return { ok: true, changed: false };

  const password = randomBytes(36).toString("base64url"); // 48 characters
  const { error: pErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (pErr) return { ok: false, error: `password reset: ${JSON.stringify(pErr)}` };

  if (row) {
    const { error: vErr } = await admin.from("customers").update({ email_verified_at: new Date().toISOString() })
      .eq("id", userId).is("email_verified_at", null);
    // The password is already gone, so the sign-in is safe; the owner can confirm the address by hand.
    if (vErr) await alertOwner("Google sign-in: email not marked confirmed", `${userId}: ${JSON.stringify(vErr)}`);
  }
  return { ok: true, changed: true };
}
