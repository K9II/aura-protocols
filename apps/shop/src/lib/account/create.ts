import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hashIp } from "@/lib/gate";
import { TERMS_VERSION } from "@/lib/gate-shared";
import { checkDeliverable } from "@/lib/account/deliverable";
import { signupsFromIpSince } from "@/lib/account/data";
import { sendVerifyEmail } from "@/lib/account/verify";
import { listVerifiedOptIn } from "@/lib/account/welcome";
import { recordOptIn } from "@/lib/email/data";
import { alertOwner } from "@/lib/notify";

export type CreateAccountInput = {
  fullName: string; email: string; password: string; organization: string | null; optIn: boolean;
  ip: string; userAgent: string | null; deviceFlagged: boolean; partnerRef: string | null;
};
export type CreateAccountResult = { ok: true; customerId: string; verifyRequired: boolean } | { ok: false; error: string };

// A Google user finishing their account (/finish-account). emailVerified:
// Google verified the address (the user has a Google identity).
export type FinishAccountInput = {
  userId: string; email: string; fullName: string; organization: string | null; optIn: boolean;
  ip: string; userAgent: string | null; partnerRef: string | null; emailVerified: boolean;
};
export type FinishAccountResult = { ok: true } | { ok: false; error: string };

const MAX_SIGNUPS_PER_IP_24H = 3;
const EXISTS = "An account with this email already exists — sign in instead.";
const FAILED = "We couldn't create your account — please try again.";
const FINISHED = "This account is already set up — reload the page.";

type DbError = { code?: string; message: string };

function signUpError(error: { code?: string; message: string } | null): string {
  if (!error) return FAILED;
  if (error.code === "user_already_exists" || error.code === "email_exists" || error.message.toLowerCase().includes("registered")) return EXISTS;
  if (error.code === "weak_password") return "Please choose a stronger password.";
  return FAILED;
}

// The customer row and its agreements record — the only place either is
// written. The agreements insert runs only after the customer row is saved.
async function insertAccountRecords(r: {
  id: string; fullName: string; organization: string | null; optIn: boolean;
  verifyRequired: boolean; emailVerifiedAt: string | null; ipHash: string | null; userAgent: string | null;
}): Promise<{ customersError: DbError | null; agreementsError: DbError | null }> {
  const admin = getSupabaseAdminClient();
  const { error: cErr } = await admin.from("customers").insert({
    id: r.id, full_name: r.fullName, organization: r.organization, verify_required: r.verifyRequired, marketing_opt_in: r.optIn,
    ...(r.emailVerifiedAt ? { email_verified_at: r.emailVerifiedAt } : {}),
  });
  if (cErr) return { customersError: cErr as DbError, agreementsError: null };
  const { error: aErr } = await admin.from("account_agreements").insert({
    customer_id: r.id, terms_version: TERMS_VERSION, age_21: true, ruo: true, dispute_policy: true,
    ip_hash: r.ipHash, user_agent: r.userAgent,
  });
  return { customersError: null, agreementsError: (aErr as DbError | null) ?? null };
}

// After the records are saved. Nothing here may undo a created account;
// failures go to the owner. A verified address (Google) completes the opt-in
// at once; otherwise our own verification email goes out.
async function afterCreated(a: { id: string; email: string; optIn: boolean; partnerRef: string | null; emailVerified: boolean }): Promise<void> {
  if (a.optIn) {
    try { await recordOptIn(a.email, a.partnerRef); } catch (err) { await alertOwner("Sign-up email opt-in failed", `${a.email}: ${String(err)}`); }
  }
  if (a.emailVerified) {
    if (a.optIn) await listVerifiedOptIn(a.email); // never throws
    return;
  }
  try { await sendVerifyEmail(a.id, a.email); } catch (err) { await alertOwner("Verification email not sent at sign-up", `${a.email}: ${String(err)}`); }
}

// The one way an account is made by email (gate and /sign-in). Supabase
// "Confirm email" is OFF, so signUp signs the visitor in at once; our own
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

  const saved = await insertAccountRecords({
    id, fullName: input.fullName, organization: input.organization, optIn: input.optIn,
    verifyRequired, emailVerifiedAt: null, ipHash, userAgent: input.userAgent,
  });
  // A customer row for this id already exists: signUp handed back an
  // EXISTING user (Supabase "Confirm email" left ON). Never delete it — the
  // cascade would wipe a real customer.
  if (saved.customersError?.code === "23505") return { ok: false, error: EXISTS };
  if (saved.customersError || saved.agreementsError) {
    // No half-created accounts: an account must carry its agreements record.
    console.error("sign-up record insert failed:", saved.customersError ?? saved.agreementsError);
    const { error: dErr } = await getSupabaseAdminClient().auth.admin.deleteUser(id);
    if (dErr) await alertOwner("Half-created account not removed", `${id} ${input.email}: ${JSON.stringify(dErr)}`);
    // Clear the now-dead session cookies; harmless if it fails (the user is gone).
    try { await supabase.auth.signOut({ scope: "local" }); } catch { /* ignore */ }
    return { ok: false, error: FAILED };
  }

  await afterCreated({ id, email: input.email, optIn: input.optIn, partnerRef: input.partnerRef, emailVerified: false });
  return { ok: true, customerId: id, verifyRequired };
}

// The same records for a Google user who is already signed in (no Supabase
// sign-up). Google verified the address, so no verify email and no
// verify_required; checkout opens at once.
export async function finishGoogleAccount(input: FinishAccountInput): Promise<FinishAccountResult> {
  const saved = await insertAccountRecords({
    id: input.userId, fullName: input.fullName, organization: input.organization, optIn: input.optIn,
    verifyRequired: false, emailVerifiedAt: input.emailVerified ? new Date().toISOString() : null,
    ipHash: input.ip ? hashIp(input.ip) : null, userAgent: input.userAgent,
  });
  if (saved.customersError?.code === "23505") return { ok: false, error: FINISHED };
  if (saved.customersError || saved.agreementsError) {
    console.error("finish-account record insert failed:", saved.customersError ?? saved.agreementsError);
    // The Google sign-in stays (they can try again); a customer row without
    // its agreements record must not.
    if (!saved.customersError) {
      const { error: dErr } = await getSupabaseAdminClient().from("customers").delete().eq("id", input.userId);
      if (dErr) await alertOwner("Half-finished account not removed", `${input.userId} ${input.email}: ${JSON.stringify(dErr)}`);
    }
    return { ok: false, error: FAILED };
  }
  await afterCreated({ id: input.userId, email: input.email, optIn: input.optIn, partnerRef: input.partnerRef, emailVerified: input.emailVerified });
  return { ok: true };
}
