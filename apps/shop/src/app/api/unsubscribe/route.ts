// Signed links only (HMAC of the email, lib/email/links.ts): nobody can
// unsubscribe someone else by typing an address. GET = link in the email
// footer; POST = RFC 8058 one-click from the mail client.
import { unsubscribe } from "@/lib/email/data";
import { normalizeEmail, verifyUnsubscribe } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";

function signedEmail(request: Request): string | null {
  const q = new URL(request.url).searchParams;
  const e = q.get("e");
  if (!e) return null;
  const email = normalizeEmail(e);
  return verifyUnsubscribe(email, q.get("s")) ? email : null;
}
const to = (path: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}${path}` } });

export async function GET(request: Request): Promise<Response> {
  const email = signedEmail(request);
  if (!email) return to("/unsubscribed?state=invalid");
  try { await unsubscribe(email); } catch { return to("/unsubscribed?state=error"); }
  return to("/unsubscribed");
}

export async function POST(request: Request): Promise<Response> {
  const email = signedEmail(request);
  if (!email) return new Response("Invalid link", { status: 400 });
  try { await unsubscribe(email); } catch { return new Response("Could not unsubscribe", { status: 500 }); }
  return new Response("Unsubscribed", { status: 200 });
}
