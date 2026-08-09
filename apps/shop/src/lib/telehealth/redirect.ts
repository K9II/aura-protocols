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
