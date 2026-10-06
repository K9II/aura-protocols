// Which thread an inbound email belongs to. The secret token in the reply
// address decides; otherwise "[Q-1047]" in the subject — accepted by the
// caller only when the sender is the inquiry's own email. Pure.
import { REPLY_PREFIX } from "@/lib/inquiries/constants";

export const replyAddress = (token: string, domain: string) => `${REPLY_PREFIX}${token}@${domain}`;

const bare = (addr: string) => (/<([^>]+)>/.exec(addr)?.[1] ?? addr).trim().toLowerCase();

export function tokenFromAddress(addr: string, domain: string): string | null {
  const m = /^r-([0-9a-f]{32})@(.+)$/.exec(bare(addr));
  return m && m[2] === domain.toLowerCase() ? m[1] : null;
}

export function refFromSubject(subject: string): number | null {
  const m = /\[Q-(\d{1,9})\]/i.exec(subject);
  return m ? Number(m[1]) : null;
}

export type MatchPlan = { kind: "token"; token: string } | { kind: "ref"; ref: number } | { kind: "none" };
export function matchPlan(i: { recipients: string[]; subject: string }, domain: string): MatchPlan {
  for (const r of i.recipients) {
    const token = tokenFromAddress(r, domain);
    if (token) return { kind: "token", token };
  }
  const ref = refFromSubject(i.subject);
  return ref ? { kind: "ref", ref } : { kind: "none" };
}

export const sameEmail = (a: string, b: string) => bare(a) === bare(b);
