// apps/modality/src/lib/site.ts
//
// Single source of truth for the site's public origin and whether it may be
// indexed by search engines. Everything that emits an absolute URL or a robots
// directive (layout metadata, sitemap.ts, robots.ts, JSON-LD) reads from here,
// so locking/changing the domain or flipping the site live is a config change,
// not a code hunt.
//
// LAUNCH TOGGLES (both are env-overridable so go-live needs no code edit):
//   NEXT_PUBLIC_SITE_URL        — final origin once the domain is locked
//   NEXT_PUBLIC_SITE_INDEXABLE  — set to "true" to allow indexing at launch
//
// Until the Modality domain is locked (gated on USPTO Class 44 clearance) and
// the LegUpRx token is live, SITE_INDEXABLE stays false: robots.txt disallows
// all, every page carries a noindex meta tag, and the sitemap is built but not
// advertised. Flip the env var at launch and the whole discovery layer turns on.

/** Public origin, no trailing slash. Defaults to the provisional Modality domain. */
export const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://modalitybio.com"
).replace(/\/$/, "");

/** Whether search engines may index the site. Defaults to false (pre-launch). */
export const SITE_INDEXABLE = process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true";

/** Host portion of BASE_URL (e.g. "modalitybio.com") for display/branding. */
export const SITE_HOST = BASE_URL.replace(/^https?:\/\//, "");

/** Absolute URL for a site-relative path ("/weight-loss" -> "https://.../weight-loss"). */
export function absoluteUrl(path: string): string {
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
