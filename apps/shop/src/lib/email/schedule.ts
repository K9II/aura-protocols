// Which automated email is due. Pure — the hourly cron feeds it times and
// the set of kinds already sent (from email_sends).
export const WELCOME_DAYS = [0, 2, 5, 8, 10] as const;
export const CART_HOURS = [1, 12, 23] as const;
export type WelcomeKind = "welcome_1" | "welcome_2" | "welcome_3" | "welcome_4" | "welcome_5";
export type CartKind = "cart_1" | "cart_2" | "cart_3";

const H = 3600 * 1000, D = 24 * H;
const WELCOME_GIVE_UP_DAYS = 21;

// Earliest unsent file whose day has come. One per run, so a missed day
// never lands two files in the inbox at once; files also go out at least a
// day apart, so an outage doesn't bunch two sends within hours of each other.
export function dueWelcome(confirmedAtMs: number, nowMs: number, sent: Set<string>, lastSentMs: number | null): WelcomeKind | null {
  const elapsed = nowMs - confirmedAtMs;
  if (elapsed > WELCOME_GIVE_UP_DAYS * D) return null;
  if (lastSentMs !== null && nowMs - lastSentMs < 24 * H) return null;
  for (let i = 0; i < WELCOME_DAYS.length; i++) {
    const kind = `welcome_${i + 1}` as WelcomeKind;
    if (sent.has(kind)) continue;
    return elapsed >= WELCOME_DAYS[i] * D ? kind : null;
  }
  return null;
}

// Latest reminder whose hour has come and that hasn't gone out. Reminders
// are only useful while the Stripe page is alive (24 h).
export function dueCart(createdAtMs: number, nowMs: number, sent: Set<string>): CartKind | null {
  const elapsed = nowMs - createdAtMs;
  if (elapsed > 24 * H) return null;
  for (let i = CART_HOURS.length - 1; i >= 0; i--) {
    if (elapsed >= CART_HOURS[i] * H) {
      const kind = `cart_${i + 1}` as CartKind;
      return sent.has(kind) ? null : kind;
    }
  }
  return null;
}
