import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hasPaidOrder } from "@/lib/email/data";
import { accountIdByEmail } from "@/lib/account/data";
import { offerLive, type FirstOrderOffer } from "@/lib/account/offer";

export async function offerForCustomer(c: { id: string; createdAt: string }): Promise<FirstOrderOffer> {
  return offerLive({ createdAt: c.createdAt, hasPaidOrder: await hasPaidOrder(c.id) });
}

// For welcome emails, which only know the address.
export async function offerForEmail(email: string): Promise<FirstOrderOffer> {
  const id = await accountIdByEmail(email);
  if (!id) return null;
  const { data, error } = await getSupabaseAdminClient().from("customers").select("created_at").eq("id", id).maybeSingle();
  if (error) throw new Error(`customer read failed: ${JSON.stringify(error)}`);
  if (!data) return null;
  return offerForCustomer({ id, createdAt: (data as { created_at: string }).created_at });
}
