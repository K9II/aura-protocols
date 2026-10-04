import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { normalizeEmail } from "@/lib/email/links";

const db = () => getSupabaseAdminClient();

// Gate step 1 pads both answers (account exists / doesn't) to about the same
// length, so a route.ts file can't export it directly (Next.js route-export
// validation rejects non-handler exports) — it lives here instead.
export const MIN_RESPONSE_MS = 350;

// auth.users isn't exposed through the API — account_id_by_email (account-gate.sql) answers for us.
export async function accountIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await db().rpc("account_id_by_email", { p_email: normalizeEmail(email) });
  if (error) throw new Error(`account lookup failed: ${JSON.stringify(error)}`);
  return (data as string | null) ?? null;
}

export async function signupsFromIpSince(ipHash: string, sinceIso: string): Promise<number> {
  const { count, error } = await db().from("account_agreements").select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash).gte("agreed_at", sinceIso);
  if (error) throw new Error(`sign-up count failed: ${JSON.stringify(error)}`);
  return count ?? 0;
}

// Bounce/complaint or other fake-email signal: the gate asks this account to
// verify before browsing. Already-verified accounts are left alone.
export async function flagVerifyRequired(customerId: string): Promise<void> {
  const { error } = await db().from("customers").update({ verify_required: true }).eq("id", customerId).is("email_verified_at", null);
  if (error) throw new Error(`flag verify_required failed: ${JSON.stringify(error)}`);
}

const LOOKUP_LIMITS = [
  { windowMs: 10 * 60 * 1000, max: 10 },
  { windowMs: 24 * 3600 * 1000, max: 30 },
];

// Stored (not in memory) so it holds across serverless instances. Records the
// lookup only when it's allowed.
export async function underLookupLimit(ipHash: string, nowMs: number = Date.now()): Promise<boolean> {
  for (const l of LOOKUP_LIMITS) {
    const { count, error } = await db().from("gate_lookups").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("at", new Date(nowMs - l.windowMs).toISOString());
    if (error) throw new Error(`lookup count failed: ${JSON.stringify(error)}`);
    if ((count ?? 0) >= l.max) return false;
  }
  const { error } = await db().from("gate_lookups").insert({ ip_hash: ipHash });
  if (error) throw new Error(`lookup record failed: ${JSON.stringify(error)}`);
  return true;
}

// Daily (reconcile cron): lookups older than the longest window are useless.
export async function pruneLookups(nowMs: number = Date.now()): Promise<void> {
  const { error } = await db().from("gate_lookups").delete().lt("at", new Date(nowMs - 2 * 24 * 3600 * 1000).toISOString());
  if (error) throw new Error(`gate_lookups prune failed: ${JSON.stringify(error)}`);
}
