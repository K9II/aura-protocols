import "server-only";
import { upsertPending, sendTracked } from "@/lib/email/data";
import { confirmEmail } from "@/lib/emails-marketing";
import { hashToken } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";

// Shared by POST /api/subscribe and the account sign-up checkbox. Throws if
// the confirmation can't be stored or sent; callers decide how loud to be.
export async function startSubscription(input: {
  email: string; source: "popup" | "signup" | "footer"; partnerRef: string | null;
}): Promise<"pending" | "confirmed"> {
  const r = await upsertPending(input);
  if (r.state === "confirmed") return "confirmed";
  const url = `${siteUrl()}/api/subscribe/confirm?token=${encodeURIComponent(r.token)}`;
  // ref = token hash: each fresh request gets its own confirmation email.
  await sendTracked({ email: input.email, kind: "confirm", ref: hashToken(r.token), msg: confirmEmail(url) });
  return "pending";
}
