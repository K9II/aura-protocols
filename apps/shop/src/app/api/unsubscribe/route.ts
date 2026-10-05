// Signed links only (HMAC of the email and its optional source tag,
// lib/email/links.ts): nobody can unsubscribe someone else by typing an
// address. GET = link in the email footer; POST = RFC 8058 one-click from
// the mail client. The tag (c=) records which email it came from.
import { unsubscribe } from "@/lib/email/data";
import { recordEmailEvent } from "@/lib/email/admin-data";
import { normalizeEmail, parseUnsubTag, verifyUnsubscribe } from "@/lib/email/links";
import { siteUrl } from "@/lib/supabase/env";

function signed(request: Request): { email: string; tag: string | null } | null {
  const q = new URL(request.url).searchParams;
  const e = q.get("e");
  if (!e) return null;
  const email = normalizeEmail(e), tag = q.get("c");
  return verifyUnsubscribe(email, q.get("s"), tag) ? { email, tag } : null;
}
const to = (path: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}${path}` } });

async function run(s: { email: string; tag: string | null }): Promise<void> {
  const changed = await unsubscribe(s.email);
  if (!changed) return;
  const src = parseUnsubTag(s.tag);
  // The count is secondary: the unsubscribe already happened, so a failed
  // event write is logged, not shown to the person as an error.
  try { await recordEmailEvent({ type: "unsubscribe", email: s.email, sourceKind: src?.kind ?? null, sourceRef: src?.ref ?? null }); }
  catch (err) { console.error("unsubscribe event not recorded:", err); }
}

export async function GET(request: Request): Promise<Response> {
  const s = signed(request);
  if (!s) return to("/unsubscribed?state=invalid");
  try { await run(s); } catch { return to("/unsubscribed?state=error"); }
  return to("/unsubscribed");
}

export async function POST(request: Request): Promise<Response> {
  const s = signed(request);
  if (!s) return new Response("Invalid link", { status: 400 });
  try { await run(s); } catch { return new Response("Could not unsubscribe", { status: 500 }); }
  return new Response("Unsubscribed", { status: 200 });
}
