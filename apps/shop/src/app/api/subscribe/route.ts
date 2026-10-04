import { cookies } from "next/headers";
import { z } from "zod";
import { startSubscription } from "@/lib/email/subscribe";
import { REF_COOKIE, readRef } from "@/lib/partners/ref-cookie";
import { alertOwner } from "@/lib/notify";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.enum(["popup", "footer"]),
  website: z.string().max(200).optional(), // honeypot: real visitors never fill it
});

// No rate limiter exists in this codebase yet (see checkout/actions.ts);
// the honeypot plus confirmed opt-in keeps junk off the list.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (parsed.data.website) return Response.json({ ok: true, state: "pending" });

  let partnerRef: string | null = null;
  try { partnerRef = readRef((await cookies()).get(REF_COOKIE)?.value); } catch { partnerRef = null; }

  try {
    const state = await startSubscription({ email: parsed.data.email, source: parsed.data.source, partnerRef });
    return Response.json({ ok: true, state });
  } catch (err) {
    await alertOwner("Email signup failed", `${parsed.data.email} (${parsed.data.source}): ${String(err)}`);
    return Response.json({ error: "We couldn't sign you up just now. Please try again." }, { status: 500 });
  }
}
