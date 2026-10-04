import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hashIp } from "@/lib/gate";
import { TERMS_VERSION } from "@/lib/gate-shared";
import { checkDeliverable } from "@/lib/account/deliverable";
import { signupsFromIpSince } from "@/lib/account/data";
import { sendVerifyEmail } from "@/lib/account/verify";
import { recordOptIn } from "@/lib/email/data";
import { alertOwner } from "@/lib/notify";

export type CreateAccountInput = {
  fullName: string; email: string; password: string; organization: string | null; optIn: boolean;
  ip: string; userAgent: string | null; deviceFlagged: boolean; partnerRef: string | null;
};
export type CreateAccountResult = { ok: true; customerId: string; verifyRequired: boolean } | { ok: false; error: string };

const MAX_SIGNUPS_PER_IP_24H = 3;
const EXISTS = "An account with this email already exists — sign in instead.";
const FAILED = "We couldn't create your account — please try again.";

function signUpError(error: { code?: string; message: string } | null): string {
  if (!error) return FAILED;
  if (error.code === "user_already_exists" || error.code === "email_exists" || error.message.toLowerCase().includes("registered")) return EXISTS;
  if (error.code === "weak_password") return "Please choose a stronger password.";
  return FAILED;
}

// The one way an account is made (gate and /sign-in). Supabase "Confirm
// email" is OFF, so signUp signs the visitor in at once; our own
// verification email goes out here and checkout waits for it.
export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const deliverable = await checkDeliverable(input.email);
  if (deliverable === "undeliverable") return { ok: false, error: "Please use an email address you can receive mail at." };
  const ipHash = input.ip ? hashIp(input.ip) : null;
  const busyIp = ipHash ? (await signupsFromIpSince(ipHash, new Date(Date.now() - 24 * 3600 * 1000).toISOString())) >= MAX_SIGNUPS_PER_IP_24H : false;
  const verifyRequired = deliverable === "unknown" || input.deviceFlagged || busyIp;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name: input.fullName } } });
  if (error || !data.user) return { ok: false, error: signUpError(error) };
  const id = data.user.id;

  const admin = getSupabaseAdminClient();
  const { error: cErr } = await admin.from("customers").insert({
    id, full_name: input.fullName, organization: input.organization, verify_required: verifyRequired, marketing_opt_in: input.optIn,
  });
  const { error: aErr } = cErr ? { error: cErr } : await admin.from("account_agreements").insert({
    customer_id: id, terms_version: TERMS_VERSION, age_21: true, ruo: true, dispute_policy: true,
    ip_hash: ipHash, user_agent: input.userAgent,
  });
  // A customer row for this id already exists: signUp handed back an
  // EXISTING user (Supabase "Confirm email" left ON). Never delete it — the
  // cascade would wipe a real customer.
  if ((cErr as { code?: string } | null)?.code === "23505") return { ok: false, error: EXISTS };
  if (cErr || aErr) {
    // No half-created accounts: an account must carry its agreements record.
    console.error("sign-up record insert failed:", cErr ?? aErr);
    const { error: dErr } = await admin.auth.admin.deleteUser(id);
    if (dErr) await alertOwner("Half-created account not removed", `${id} ${input.email}: ${JSON.stringify(dErr)}`);
    // Clear the now-dead session cookies; harmless if it fails (the user is gone).
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
    return { ok: false, error: FAILED };
  }

  // Neither of these may undo a created account; failures go to the owner.
  if (input.optIn) {
    try { await recordOptIn(input.email, input.partnerRef); } catch (err) { await alertOwner("Sign-up email opt-in failed", `${input.email}: ${String(err)}`); }
  }
  try { await sendVerifyEmail(id, input.email); } catch (err) { await alertOwner("Verification email not sent at sign-up", `${input.email}: ${String(err)}`); }
  return { ok: true, customerId: id, verifyRequired };
}
