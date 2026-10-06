import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { decryptDetails, encryptDetails } from "@/lib/partners/crypto";
import { generateCode, normalizeCode, type PartnerApplication, type PartnerTypeId } from "@/lib/partners/codes";
import type { PayoutPref } from "@/lib/partners/payout-math";
import type { TierPct } from "@/lib/partners/tiers";

export type PartnerStatus = "applied" | "approved" | "declined" | "suspended";
export type PartnerRow = {
  id: string; customer_id: string; status: PartnerStatus; partner_type: PartnerTypeId; code: string;
  lifetime_cents: number; tier_pct: TierPct; payout_pref: PayoutPref; split_cash_pct: number; cash_carry_cents: number;
  payout_method: "ach" | "zelle" | null; payout_details_enc: string | null; payout_details_hint: string | null;
  w9_path: string | null; w9_uploaded_at: string | null; w9_checked_at: string | null;
  application: PartnerApplication; approved_at: string | null; declined_at: string | null; suspended_at: string | null;
  created_at: string;
  customers?: { full_name: string; organization: string | null } | null;
};
export type PayoutDetails =
  | { kind: "ach"; routing: string; account: string; bank: string }
  | { kind: "zelle"; handle: string };

const db = () => getSupabaseAdminClient();
const WITH_CUSTOMER = "*, customers(full_name, organization)";

const TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  applied: ["approved", "declined"], approved: ["suspended"], suspended: ["approved"], declined: [],
};
const STAMP: Partial<Record<PartnerStatus, string>> = { approved: "approved_at", declined: "declined_at", suspended: "suspended_at" };

export async function getPartnerForCustomer(customerId: string): Promise<PartnerRow | null> {
  const { data } = await db().from("partners").select(WITH_CUSTOMER).eq("customer_id", customerId).maybeSingle();
  return (data as PartnerRow | null) ?? null;
}

export async function getPartnerById(id: string): Promise<PartnerRow | null> {
  const { data } = await db().from("partners").select(WITH_CUSTOMER).eq("id", id).maybeSingle();
  return (data as PartnerRow | null) ?? null;
}

// Current code first, then a code the partner used before changing it.
export async function getApprovedPartnerByCode(code: string): Promise<PartnerRow | null> {
  const c = normalizeCode(code);
  const { data } = await db().from("partners").select("*").eq("code", c).eq("status", "approved").maybeSingle();
  if (data) return data as PartnerRow;
  const { data: alias } = await db().from("partner_code_aliases").select("partner_id").eq("code", c).maybeSingle();
  if (!alias) return null;
  const { data: p } = await db().from("partners").select("*").eq("id", (alias as { partner_id: string }).partner_id).eq("status", "approved").maybeSingle();
  return (p as PartnerRow | null) ?? null;
}

// Partner codes share one namespace with discount codes (lib/discounts).
export async function isCodeTaken(code: string): Promise<boolean> {
  const c = normalizeCode(code);
  const { data } = await db().from("partners").select("id").eq("code", c).maybeSingle();
  if (data) return true;
  const { data: alias } = await db().from("partner_code_aliases").select("code").eq("code", c).maybeSingle();
  if (alias) return true;
  const { data: discount, error } = await db().from("discount_codes").select("id").eq("code", c).maybeSingle();
  if (error) throw new Error(`discount code check failed: ${JSON.stringify(error)}`);
  return !!discount;
}

// Issues a random code that no partner uses (current or old). 31^8 ≈ 8.5e11
// possibilities, so a clash is rare; 20 attempts is a generous ceiling.
export async function issueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    if (!(await isCodeTaken(code))) return code;
  }
  throw new Error("could not issue a free partner code");
}

// The old code becomes an alias so everything already shared keeps crediting the partner.
export async function changeCode(partnerId: string, oldCode: string, newCode: string): Promise<{ ok: true } | { error: "code_taken" }> {
  const { error: aliasError } = await db().from("partner_code_aliases").insert({ code: oldCode, partner_id: partnerId });
  if (aliasError && (aliasError as { code?: string }).code !== "23505") throw new Error(`alias insert failed: ${JSON.stringify(aliasError)}`);
  const { data, error } = await db().from("partners").update({ code: normalizeCode(newCode) }).eq("id", partnerId).eq("code", oldCode).select("id");
  if (error) {
    if ((error as { code?: string }).code === "23505") return { error: "code_taken" };
    throw new Error(`code change failed: ${JSON.stringify(error)}`);
  }
  return Array.isArray(data) && data.length === 1 ? { ok: true } : { error: "code_taken" };
}

export async function createApplication(input: {
  customerId: string; partnerType: PartnerTypeId; code: string; application: PartnerApplication;
  agreement: { version: string; ipHash: string | null; userAgent: string | null };
}): Promise<{ id: string } | { error: "already_applied" | "code_taken" }> {
  const { data: existing } = await db().from("partners").select("id").eq("customer_id", input.customerId).maybeSingle();
  if (existing) return { error: "already_applied" };
  const { data, error } = await db().from("partners").insert({
    customer_id: input.customerId, status: "applied", partner_type: input.partnerType,
    code: normalizeCode(input.code), application: input.application,
  }).select("id").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // Two constraints share 23505: a second concurrent application from this
      // customer, or the code colliding with another partner's. Re-check which.
      const { data: raced } = await db().from("partners").select("id").eq("customer_id", input.customerId).maybeSingle();
      return raced ? { error: "already_applied" } : { error: "code_taken" };
    }
    throw new Error(`partner insert failed: ${JSON.stringify(error)}`);
  }
  const id = (data as { id: string }).id;
  const { error: agreementError } = await db().from("partner_agreements").insert({
    partner_id: id, version: input.agreement.version, ip_hash: input.agreement.ipHash, user_agent: input.agreement.userAgent,
  });
  if (agreementError) {
    // No application may exist without its recorded agreement.
    await db().from("partners").delete().eq("id", id);
    throw new Error(`partner agreement insert failed: ${JSON.stringify(agreementError)}`);
  }
  return { id };
}

export async function setPartnerStatus(id: string, from: PartnerStatus, to: PartnerStatus): Promise<boolean> {
  if (!TRANSITIONS[from].includes(to)) throw new Error(`Illegal partner transition ${from} → ${to}`);
  const stamp = STAMP[to];
  const { data, error } = await db().from("partners")
    .update({ status: to, ...(stamp ? { [stamp]: new Date().toISOString() } : {}) })
    .eq("id", id).eq("status", from).select("id");
  if (error) throw new Error(`partner status update failed: ${JSON.stringify(error)}`);
  return Array.isArray(data) && data.length === 1;
}

export async function listPartners(status: PartnerStatus): Promise<PartnerRow[]> {
  const { data, error } = await db().from("partners").select(WITH_CUSTOMER).eq("status", status).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`partners select failed: ${JSON.stringify(error)}`);
  return (data as PartnerRow[] | null) ?? [];
}

export async function countPartners(): Promise<Record<PartnerStatus, number>> {
  const { data } = await db().from("partners").select("status");
  const out: Record<PartnerStatus, number> = { applied: 0, approved: 0, declined: 0, suspended: 0 };
  for (const r of (data as { status: PartnerStatus }[] | null) ?? []) out[r.status]++;
  return out;
}

// Email lives in Supabase Auth, not in customers.
export async function partnerEmail(customerId: string): Promise<string | null> {
  const { data } = await db().auth.admin.getUserById(customerId);
  return data?.user?.email ?? null;
}

export async function recordClickByCode(code: string): Promise<void> {
  const partner = await getApprovedPartnerByCode(code);
  if (!partner) return;
  await db().rpc("record_partner_click", { p_partner: partner.id });
}

export async function clicksSince(partnerId: string, sinceDay: string): Promise<number> {
  const { data } = await db().from("partner_clicks_daily").select("clicks").eq("partner_id", partnerId).gte("day", sinceDay);
  return ((data as { clicks: number }[] | null) ?? []).reduce((s, r) => s + r.clicks, 0);
}

export async function setPayoutPref(id: string, pref: PayoutPref, splitCashPct: number): Promise<void> {
  const { error } = await db().from("partners").update({ payout_pref: pref, split_cash_pct: splitCashPct }).eq("id", id);
  if (error) throw new Error(`save payout preference failed: ${JSON.stringify(error)}`);
}

export function payoutHint(d: PayoutDetails): string {
  return d.kind === "ach" ? `ACH · checking ••••${d.account.slice(-4)} · ${d.bank}` : `Zelle · ${d.handle}`;
}

// Returns the masked hint shown to the partner and in the change emails.
export async function setPayoutMethod(id: string, details: PayoutDetails): Promise<string> {
  const hint = payoutHint(details);
  const { error } = await db().from("partners").update({
    payout_method: details.kind, payout_details_enc: encryptDetails(JSON.stringify(details)), payout_details_hint: hint,
  }).eq("id", id);
  if (error) throw new Error(`save payout method failed: ${JSON.stringify(error)}`);
  return hint;
}

export async function getPayoutDetails(id: string): Promise<PayoutDetails | null> {
  const { data } = await db().from("partners").select("payout_details_enc").eq("id", id).maybeSingle();
  const enc = (data as { payout_details_enc: string | null } | null)?.payout_details_enc;
  return enc ? (JSON.parse(decryptDetails(enc)) as PayoutDetails) : null;
}

export async function uploadW9(partnerId: string, pdf: Uint8Array): Promise<string> {
  const path = `${partnerId}/${Date.now()}.pdf`;
  const { error } = await db().storage.from("w9").upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (error) throw new Error(`w9 upload failed: ${error.message}`);
  const { error: saveErr } = await db().from("partners").update({ w9_path: path, w9_uploaded_at: new Date().toISOString(), w9_checked_at: null }).eq("id", partnerId);
  if (saveErr) throw new Error(`w9 uploaded to ${path} but saving it on the partner failed: ${JSON.stringify(saveErr)}`);
  return path;
}

export async function markW9Checked(partnerId: string): Promise<void> {
  const { error } = await db().from("partners").update({ w9_checked_at: new Date().toISOString() }).eq("id", partnerId).not("w9_path", "is", null);
  if (error) throw new Error(`mark W-9 checked failed: ${JSON.stringify(error)}`);
}

export async function w9SignedUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from("w9").createSignedUrl(path, 60);
  if (error || !data) throw new Error(`w9 signed url failed: ${error?.message}`);
  return data.signedUrl;
}

export async function listW9sAwaitingCheck(): Promise<PartnerRow[]> {
  const { data } = await db().from("partners").select(WITH_CUSTOMER).not("w9_path", "is", null).is("w9_checked_at", null).order("w9_uploaded_at");
  return (data as PartnerRow[] | null) ?? [];
}
