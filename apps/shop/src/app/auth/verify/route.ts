import { consumeVerifyToken } from "@/lib/account/verify";
import { confirmOptIn, sendTracked } from "@/lib/email/data";
import { welcomeEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { offerForEmail } from "@/lib/account/offer-data";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

const to = (path: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}${path}` } });

// The link in the "Confirm your email" message. Works in any browser — the
// token is the proof, no session needed.
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return to("/verified?state=invalid");
  let result: Awaited<ReturnType<typeof consumeVerifyToken>>;
  try {
    result = await consumeVerifyToken(token);
  } catch (err) {
    await alertOwner("Email verification failed", String(err));
    return to("/verified?state=error");
  }
  if (!result) return to("/verified?state=invalid");
  if (result.already || !result.optIn) return to("/verified");

  // Opted in at sign-up: a verified address completes the double opt-in.
  // Only land on the "listed" state when this call actually confirmed it —
  // false means there was nothing to confirm (unsubscribed since, or
  // already confirmed), so no send is attempted either.
  let listed: boolean;
  try {
    listed = await confirmOptIn(result.email);
  } catch (err) {
    // The row stays pending and nothing will retry this automatically —
    // a different alert than a File 01 send failure, which the hourly run does retry.
    await alertOwner("Opt-in not confirmed at verification", `${result.email}: ${String(err)} — still pending; confirm it manually`);
    return to("/verified");
  }
  if (!listed) return to("/verified");

  // File 01 goes out now (the hourly run retries it if this send fails).
  try {
    const site = siteUrl(), unsub = unsubscribeUrl(site, result.email);
    await sendTracked({ email: result.email, kind: "welcome_1", ref: null, msg: welcomeEmail(1, { site, unsubscribeUrl: unsub }, await offerForEmail(result.email)), unsubscribeUrl: unsub });
  } catch (err) {
    await alertOwner("Welcome File 01 failed at verification", `${result.email}: ${String(err)} — the hourly email run will retry.`);
  }
  return to("/verified?state=listed");
}
