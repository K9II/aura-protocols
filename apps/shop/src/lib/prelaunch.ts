// Pre-launch mode (2026-10-23): with PRELAUNCH=1 the site is the coming-soon
// page and its waitlist only. Every other store page redirects to "/", and
// API routes outside the list below answer 404. The command center and the
// owner's sign-in stay reachable. Launch = remove PRELAUNCH and redeploy.

export function isPrelaunch(): boolean {
  return process.env.PRELAUNCH === "1";
}

// Pages that stay open: the coming-soon page itself, the owner's way into the
// command center, the pages an email link lands on, and the early-access link
// (pre-launch email 3: it sets the cookie that lets that browser through, proxy.ts).
const OPEN_PAGES = ["/", "/early", "/sign-in", "/forgot-password", "/reset-password", "/unsubscribed", "/opengraph-image", "/icon", "/apple-icon"];
const OPEN_PAGE_PREFIXES = ["/admin", "/auth/"];
// The waitlist's confirm link, unsubscribe, email events, crons, and AIOS Send to store.
const OPEN_API_PREFIXES = ["/api/waitlist/", "/api/unsubscribe", "/api/ses/", "/api/cron/", "/api/catalog/refresh"];

const under = (path: string, prefix: string) =>
  path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);

export function prelaunchAllows(pathname: string): boolean {
  if (pathname.startsWith("/api/")) return OPEN_API_PREFIXES.some((p) => under(pathname, p));
  return OPEN_PAGES.includes(pathname) || OPEN_PAGE_PREFIXES.some((p) => under(pathname, p));
}
