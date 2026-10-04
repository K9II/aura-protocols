import { confirmSubscriber, sendTracked } from "@/lib/email/data";
import { welcomeEmail } from "@/lib/emails-marketing";
import { unsubscribeUrl } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

const to = (path: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}${path}` } });

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return to("/subscribed?state=invalid");
  const row = await confirmSubscriber(token);
  if (!row) return to("/subscribed?state=invalid");
  try {
    const site = siteUrl();
    const unsub = unsubscribeUrl(site, row.email);
    // A returning subscriber keeps their old code; only show it while it can still be used.
    const live = row.welcome_code && row.welcome_code_expires_at && !row.welcome_code_used_order_id && Date.parse(row.welcome_code_expires_at) > Date.now();
    const code = live ? { code: row.welcome_code!, expiresAt: row.welcome_code_expires_at! } : null;
    await sendTracked({ email: row.email, kind: "welcome_1", ref: null, msg: welcomeEmail(1, { site, unsubscribeUrl: unsub }, code), unsubscribeUrl: unsub });
  } catch (err) {
    await alertOwner("Welcome File 01 failed", `${row.email}: ${String(err)} — the hourly email run will retry.`);
  }
  return to("/subscribed");
}
