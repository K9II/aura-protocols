import { confirmSubscriber } from "@/lib/email/data";
import { sendWelcomeFile1 } from "@/lib/account/welcome";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

// The Aura letter's confirm link (an address that isn't a verified account email).
const to = (path: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}${path}` } });

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return to("/subscribed?state=invalid");

  let result: Awaited<ReturnType<typeof confirmSubscriber>>;
  try {
    result = await confirmSubscriber(token);
  } catch (err) {
    await alertOwner("Email confirm failed", String(err));
    return to("/subscribed?state=error");
  }
  if (!result) return to("/subscribed?state=invalid");
  // A second click on the same link (double-click, or a link scanner) — never re-send File 01.
  if (result.already) return to("/subscribed?state=returning");

  try {
    if ((await sendWelcomeFile1(result.row.email)) === "duplicate") return to("/subscribed?state=returning");
  } catch (err) {
    await alertOwner("Welcome File 01 failed", `${result.row.email}: ${String(err)} — the hourly email run will retry.`);
  }
  return to("/subscribed");
}
