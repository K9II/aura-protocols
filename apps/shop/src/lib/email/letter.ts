import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSubscriber, recordOptIn } from "@/lib/email/data";
import { listVerifiedOptIn } from "@/lib/account/welcome";
import type { Customer } from "@/lib/dal";

// "The Aura letter" box on the home page (2026-10-14). Shoppers are signed
// in, so it subscribes the account's own email through the same opt-in as
// the sign-up box: listed as pending, confirmed once the address is verified
// (at once when it already is — that also sends Welcome File 01). Only the
// account's own email can join (2026-10-23, single opt-in): it already passed
// the sign-up checks, so no fake or someone else's address gets on the list.

export type LetterState = "none" | "pending" | "confirmed" | "unsubscribed";

export async function letterState(email: string): Promise<LetterState> {
  const row = await getSubscriber(email);
  if (!row) return "none";
  return row.status === "confirmed" || row.status === "pending" || row.status === "unsubscribed" ? row.status : "none";
}

// Throws when the opt-in can't be saved; the caller shows the error.
export async function subscribeToLetter(customer: Customer): Promise<"confirmed" | "pending"> {
  if ((await letterState(customer.email)) === "confirmed") return "confirmed";
  await recordOptIn(customer.email, null);
  // The verify step confirms a pending opt-in only for accounts flagged here.
  const { error } = await getSupabaseAdminClient().from("customers").update({ marketing_opt_in: true }).eq("id", customer.id);
  if (error) throw new Error(`marketing_opt_in save failed: ${JSON.stringify(error)}`);
  if (!customer.emailConfirmed) return "pending";
  // listVerifiedOptIn never throws: a failed confirm alerts the owner and leaves it pending.
  return (await listVerifiedOptIn(customer.email)) ? "confirmed" : (await letterState(customer.email)) === "confirmed" ? "confirmed" : "pending";
}
