import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The engine is fully built but not yet connected to Terra. Until
// ENGINE_LIVE=true is set (Vercel env var), every route except the
// homepage — and API routes / static assets / SEO files, which must keep
// working regardless — redirects back to "/", which shows the sphere +
// "Under Construction". Flip the env var once Terra is live; no code
// change or redeploy of app logic needed.
export function proxy(request: NextRequest) {
  if (process.env.ENGINE_LIVE === "true") return NextResponse.next();
  if (request.nextUrl.pathname === "/") return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
