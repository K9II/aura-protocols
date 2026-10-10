import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { ResearchField } from "@/lib/account/research";

// The first order's research verification. Only written while unset, so a
// second tab can't overwrite the first answer. Throws on failure: checkout
// stops (it's a processor requirement, not bookkeeping).
export async function saveResearchVerification(customerId: string, r: { field: ResearchField; org: string }): Promise<void> {
  const { error } = await getSupabaseAdminClient().from("customers")
    .update({ research_field: r.field, research_org: r.org, research_verified_at: new Date().toISOString() })
    .eq("id", customerId)
    .is("research_verified_at", null);
  if (error) throw new Error(`research verification save failed: ${JSON.stringify(error)}`);
}
