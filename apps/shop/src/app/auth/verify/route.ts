import { consumeVerifyToken } from "@/lib/account/verify";
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
  return to("/verified");
}
