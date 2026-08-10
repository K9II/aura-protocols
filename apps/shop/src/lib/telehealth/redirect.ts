export function isAllowedIntakeHost(rawUrl: string): boolean {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  return (
    h === "leguprecovery.com" || h.endsWith(".leguprecovery.com") ||
    h === "telehealthintakeforms.com" || h.endsWith(".telehealthintakeforms.com")
  );
}

/** Append a validated sub-account id (1–250) to an intake URL for attribution.
 *  Returns the URL unchanged if the sub is missing or out of range. */
export function appendSub(intakeUrl: string, sub: number | null): string {
  if (sub == null || !Number.isInteger(sub) || sub < 1 || sub > 250) return intakeUrl;
  try {
    const u = new URL(intakeUrl);
    u.searchParams.set("sub", String(sub));
    return u.toString();
  } catch {
    return intakeUrl;
  }
}
