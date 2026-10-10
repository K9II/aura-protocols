// The admin enters and reads code dates in Mountain time. Pure.
export const SHOP_TZ = "America/Denver";

function parts(utcMs: number, tz: string): Record<string, number> {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return Object.fromEntries(f.formatToParts(new Date(utcMs)).filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
}

function offsetMs(utcMs: number, tz: string): number {
  const p = parts(utcMs, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - utcMs;
}

// "2026-10-31T23:59" (datetime-local, Mountain time) → ISO UTC.
export function zonedToIso(local: string, tz: string = SHOP_TZ): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error(`bad local time: ${local}`);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ts = guess - offsetMs(guess, tz);
  const second = offsetMs(ts, tz);
  if (guess - second !== ts) ts = guess - second;
  return new Date(ts).toISOString();
}

export function isoToZonedLocal(iso: string, tz: string = SHOP_TZ): string {
  const p = parts(Date.parse(iso), tz);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}

export function shortDate(iso: string, tz: string = SHOP_TZ): string {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
}

export function dateTime(iso: string, tz: string = SHOP_TZ): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).replace(" AM", " am").replace(" PM", " pm");
  return `${date}, ${time}`;
}

// Whole Mountain calendar days from now until `iso` (0 on the day itself or once past).
export function mountainDaysUntil(iso: string, nowMs: number = Date.now(), tz: string = SHOP_TZ): number {
  const day = (ms: number) => { const p = parts(ms, tz); return Date.UTC(p.year, p.month - 1, p.day); };
  return Math.max(0, Math.round((day(Date.parse(iso)) - day(nowMs)) / 86400000));
}
