import { NextResponse, type NextRequest } from "next/server";
import { isPrelaunch } from "@/lib/prelaunch";
import { EARLY_COOKIE, EARLY_COOKIE_MAX_AGE_S, signEarlyCookie, verifyEarlyToken } from "@/lib/early/token";
import { earlyAccessOpen } from "@/lib/early/data";

// The link in pre-launch email 3 (/early?t=CODE.sig). A valid token while early access is
// on (or once the store has launched) sets the signed cookie and opens the store; the
// cookie also pre-fills the person's EARLY- code at checkout. Anything else lands on the
// coming-soon page with "Early access isn't open right now."
export async function GET(request: NextRequest) {
  const ref = verifyEarlyToken(request.nextUrl.searchParams.get("t"));
  let open = false;
  try {
    open = !isPrelaunch() || (await earlyAccessOpen());
  } catch (err) {
    console.error("early access switch:", err);
  }
  if (!ref || !open) return NextResponse.redirect(new URL("/?early=closed", request.url), 303);
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(EARLY_COOKIE, signEarlyCookie(ref), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: EARLY_COOKIE_MAX_AGE_S, path: "/",
  });
  return res;
}
