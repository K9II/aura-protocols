// Canonical channel registry: subId (1–250) ↔ channel label ↔ utm_source matches.
// The label side is mirrored in aura-aios business.py SUB_CHANNELS for the dashboard.
// Actual sub-accounts must be created in LegUpRx before a subId "counts" (post-token).
export type Channel = { sub: number; label: string; utm: string[] };

export const DIRECT_SUB = 2; // "Direct / Other" — default bucket for unmatched traffic

export const CHANNELS: Channel[] = [
  { sub: 1, label: "Newsletter / Email", utm: ["newsletter", "email", "ses"] },
  { sub: DIRECT_SUB, label: "Direct / Other", utm: [] },
  { sub: 3, label: "Blog / SEO", utm: ["blog", "seo", "organic", "google"] },
  { sub: 4, label: "Instagram", utm: ["instagram", "ig"] },
  { sub: 5, label: "TikTok", utm: ["tiktok"] },
  { sub: 6, label: "YouTube", utm: ["youtube", "yt"] },
  { sub: 7, label: "Engine match", utm: ["engine"] },
  { sub: 8, label: "X / Twitter", utm: ["x", "twitter"] },
  { sub: 9, label: "Reddit", utm: ["reddit"] },
  { sub: 10, label: "Facebook", utm: ["facebook", "fb"] },
];

const UTM_TO_SUB = new Map<string, number>();
for (const c of CHANNELS) for (const u of c.utm) UTM_TO_SUB.set(u, c.sub);

/** Map a utm_source value to a subId, defaulting to Direct/Other (2). */
export function subForUtm(utmSource: string | null | undefined): number {
  if (!utmSource) return DIRECT_SUB;
  return UTM_TO_SUB.get(utmSource.trim().toLowerCase()) ?? DIRECT_SUB;
}

/** Human channel label for a subId (falls back to "sub N"). */
export function channelLabel(sub: number): string {
  return CHANNELS.find((c) => c.sub === sub)?.label ?? `sub ${sub}`;
}
