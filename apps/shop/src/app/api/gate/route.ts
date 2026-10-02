import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { hashIp, signGateToken } from "@/lib/gate";
import { GATE_COOKIE, GATE_HINT_COOKIE, GATE_MAX_AGE_S, TERMS_VERSION } from "@/lib/gate-shared";

// The gate asks no email: who a buyer is gets recorded (and verified) at
// account sign-up, which stores the same three agreements again.
const schema = z.object({
  age21: z.literal(true),
  ruo: z.literal(true),
  disputePolicy: z.literal(true),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please confirm all three to enter." }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gate_attestations")
    .insert({
      terms_version: TERMS_VERSION,
      age_21: true,
      ruo: true,
      dispute_policy: true,
      ip_hash: ip ? hashIp(ip) : null,
      user_agent: request.headers.get("user-agent"),
    })
    .select("id")
    .single();

  // Fail closed: an entry without an attestation record defeats the gate.
  if (error || !data) {
    console.error("gate attestation insert failed:", error);
    return NextResponse.json({ error: "Something went wrong — please try again." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(GATE_COOKIE, signGateToken(TERMS_VERSION, data.id), {
    httpOnly: true, secure, sameSite: "lax", maxAge: GATE_MAX_AGE_S, path: "/",
  });
  res.cookies.set(GATE_HINT_COOKIE, TERMS_VERSION, {
    httpOnly: false, secure, sameSite: "lax", maxAge: GATE_MAX_AGE_S, path: "/",
  });
  return res;
}
