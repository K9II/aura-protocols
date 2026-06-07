// Guards the post-auth `next` redirect target against open-redirect attacks.
// Only same-origin absolute paths are allowed: must start with a single "/"
// and not "//" (protocol-relative → external) or "/\" (backslash trick).
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
