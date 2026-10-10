import { NextResponse } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/gate";
import { accountIdByEmail, underLookupLimit, MIN_RESPONSE_MS } from "@/lib/account/data";

// Gate step 1: does this email have an account? Revealing that is accepted
// (spec), so it's rate-limited per IP (10 / 10 min, 30 / day, stored) and
// padded so both answers take about as long. The Vercel firewall rule on this
// path is the outer layer.
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const padTo = (started: number) => new Promise((r) => setTimeout(r, Math.max(0, MIN_RESPONSE_MS - (Date.now() - started))));

export async function POST(request: Request): Promise<Response> {
  const started = Date.now();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  try {
    if (!(await underLookupLimit(hashIp(ip)))) {
      return NextResponse.json({ error: "Too many tries — please wait a few minutes and try again." }, { status: 429 });
    }
    const exists = !!(await accountIdByEmail(parsed.data.email));
    await padTo(started);
    return NextResponse.json({ next: exists ? "sign-in" : "create" });
  } catch (err) {
    console.error("gate lookup failed:", err);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }
}
