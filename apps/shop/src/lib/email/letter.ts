import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getSubscriber, recordOptIn, sendTracked, upsertPending } from "@/lib/email/data";
import { confirmEmail } from "@/lib/emails-marketing";
import { hashToken } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { listVerifiedOptIn } from "@/lib/account/welcome";
import type { Customer } from "@/lib/dal";

// "The Aura letter" box on the home page (2026-10-14). Shoppers are signed
// in, so it subscribes the account's own email through the same opt-in as
// the sign-up box: listed as pending, confirmed once the address is verified
// (at once when it already is — that also sends Welcome File 01).

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

// A different address than the account's: it joins only after its confirm
// link is clicked (/api/subscribe/confirm). Already on the list or in a
// cooldown looks the same as a sent confirmation — never reveal whether
// someone else's address is subscribed. Throws if it can't be stored or sent.
export async function subscribeOtherEmail(email: string): Promise<"check_inbox"> {
  const r = await upsertPending({ email, source: "letter", partnerRef: null });
  if (r.state !== "pending") return "check_inbox";
  const url = `${siteUrl()}/api/subscribe/confirm?token=${encodeURIComponent(r.token)}`;
  // ref = token hash: each fresh request gets its own confirmation email.
  await sendTracked({ email, kind: "confirm", ref: hashToken(r.token), msg: confirmEmail(url) });
  return "check_inbox";
}
