import { confirmWaitlist } from "@/lib/waitlist/data";
import { siteUrl } from "@/lib/supabase/env";
import { alertOwner } from "@/lib/notify";

// The waitlist's confirm link → the coming-soon page's "You're on the list" screen.
const to = (query: string) => new Response(null, { status: 303, headers: { location: `${siteUrl()}/?${query}` } });

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return to("wl=invalid");
  try {
    const r = await confirmWaitlist(token);
    return r.state === "in" ? to(`in=${r.code}`) : to("wl=invalid");
  } catch (err) {
    await alertOwner("Waitlist: confirm failed", String(err));
    return to("wl=error");
  }
}
