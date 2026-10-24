// Early access: the opening date. Pure. There's no early-access code (dropped 2026-10-24,
// Alvester): the new-account percent comes off automatically, so a code added nothing.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcNoon = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12));
};
const shopToday = (nowMs: number) => new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/Denver" });

// "2026-12-01" → "Tuesday, December 1".
export function openingLabel(d: string): string {
  return utcNoon(d).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
}

export function parseOpeningOn(raw: string, nowMs: number): { ok: true; value: string } | { ok: false; error: string } {
  const v = raw.trim();
  if (!DATE_RE.test(v) || utcNoon(v).toISOString().slice(0, 10) !== v) return { ok: false, error: "Pick the opening date." };
  if (v <= shopToday(nowMs)) return { ok: false, error: "The opening date must be after today." };
  return { ok: true, value: v };
}
