import "server-only";
import { confirmOptIn, sendTracked } from "@/lib/email/data";
import { welcomeEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { offerForEmail } from "@/lib/account/offer-data";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

// A verified address completes a pending sign-up opt-in (double opt-in) and
// gets Welcome File 01 now — after the /auth/verify link, or at once for a
// Google account (Google already verified it). Returns true when this call
// listed the address. Never throws: failures go to the owner (the hourly
// email run retries a failed File 01).
export async function listVerifiedOptIn(email: string): Promise<boolean> {
  let listed: boolean;
  try {
    listed = await confirmOptIn(email);
  } catch (err) {
    // The row stays pending and nothing will retry this automatically.
    await alertOwner("Opt-in not confirmed at verification", `${email}: ${String(err)} — still pending; confirm it manually`);
    return false;
  }
  if (!listed) return false;
  try {
    const site = siteUrl(), unsub = unsubscribeUrl(site, email, "welcome_1");
    await sendTracked({ email, kind: "welcome_1", ref: null, msg: welcomeEmail(1, { site, unsubscribeUrl: unsub }, await offerForEmail(email)), unsubscribeUrl: unsub });
  } catch (err) {
    await alertOwner("Welcome File 01 failed at verification", `${email}: ${String(err)} — the hourly email run will retry.`);
  }
  return true;
}
