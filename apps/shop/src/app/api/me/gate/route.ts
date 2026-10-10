import { NextResponse } from "next/server";
import { getAccountState } from "@/lib/dal";
import { DEVICE_FLAG_COOKIE, DEVICE_FLAG_MAX_AGE_S, signDeviceFlag } from "@/lib/gate";

const headers = { "Cache-Control": "private, no-store" };

// Tells AccountGate whether to show itself. Display only — checkout and every
// account page still authorize through lib/dal.ts.
export async function GET(): Promise<Response> {
  const { customer, blocked, unfinished } = await getAccountState();
  if (blocked) return NextResponse.json({ state: "closed" }, { headers });
  // Signed in with Google but never finished: the gate sends them to /finish-account.
  if (unfinished) return NextResponse.json({ state: "finish" }, { headers });
  if (!customer) return NextResponse.json({ state: "anon" }, { headers });
  if (customer.verifyRequired && !customer.emailConfirmed) {
    const res = NextResponse.json({ state: "verify", email: customer.email }, { headers });
    res.cookies.set(DEVICE_FLAG_COOKIE, signDeviceFlag(), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: DEVICE_FLAG_MAX_AGE_S, path: "/",
    });
    return res;
  }
  return NextResponse.json({ state: "ok" }, { headers });
}
