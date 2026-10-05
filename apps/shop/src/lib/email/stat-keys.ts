// Keys and sums for the per-email stats maps. Pure.
export type SendStat = { sent: number; bounced: number; complaints: number; unsubscribed: number };
export type Attribution = { orders: number; revenueCents: number };

// welcome_3 / cart_1 → the kind; a campaign → "campaign:<id>".
export const statKey = (kind: string, ref: string | null): string => (kind === "campaign" && ref ? `campaign:${ref}` : kind);

// Sum of per-kind stats for "welcome_1".."welcome_5" (or cart_1..3).
export function sumKinds(m: Map<string, SendStat>, prefix: "welcome_" | "cart_"): SendStat {
  const out = { sent: 0, bounced: 0, complaints: 0, unsubscribed: 0 };
  for (const [k, v] of m) if (k.startsWith(prefix)) { out.sent += v.sent; out.bounced += v.bounced; out.complaints += v.complaints; out.unsubscribed += v.unsubscribed; }
  return out;
}

export function sumAttribution(m: Map<string, Attribution>, prefix: "welcome_"): Attribution {
  const out = { orders: 0, revenueCents: 0 };
  for (const [k, v] of m) if (k.startsWith(prefix)) { out.orders += v.orders; out.revenueCents += v.revenueCents; }
  return out;
}
