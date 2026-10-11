// Partner dashboard wording. Pure — the page passes the time in.
import type { CommissionState } from "@/lib/partners/ledger";
import { CASH_MIN_CENTS } from "@/lib/partners/tiers";

export type ChipTone = "pending" | "clearing" | "cleared" | "removed";

const md = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Store credit is added the day commission clears and cash joins the partner's
// balance, so a paid commission reads "Cleared"; "payable" only lasts until
// that day's payout run.
export function commissionChip(c: { state: CommissionState; clears_at: string | null }): { tone: ChipTone; label: string } {
  switch (c.state) {
    case "pending": return { tone: "pending", label: "Not shipped" };
    case "clearing": return { tone: "clearing", label: c.clears_at ? `Clears ${md(new Date(c.clears_at))}` : "Clearing" };
    case "payable": return { tone: "cleared", label: "Clearing today" };
    case "paid": return { tone: "cleared", label: "Cleared" };
    case "void": return { tone: "removed", label: "Refunded" };
  }
}

export function cashOwedNote(i: { carryCents: number; w9Checked: boolean; next: string }): string {
  if (i.carryCents <= 0) return `next cash payout ${i.next}`;
  return i.w9Checked ? `paid once it reaches $${CASH_MIN_CENTS / 100}` : "paid once your W-9 is checked";
}

// The coming 1st or 15th (UTC); today counts if it is one.
export function nextCashPayout(now: Date): string {
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  if (d === 1) return md(new Date(Date.UTC(y, m, 1)));
  if (d <= 15) return md(new Date(Date.UTC(y, m, 15)));
  return md(new Date(Date.UTC(y, m + 1, 1)));
}
