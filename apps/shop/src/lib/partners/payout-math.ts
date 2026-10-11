// One partner, one payout run. netCents = payable commission − new deductions.
// carryCents = cash owed from earlier runs (below $100, W-9 pending, or not yet
// a cash day), or a negative balance from refunds after payout. Store credit is
// issued on every run; cash only on a cash day (1st/15th), at $100+ with a
// checked W-9. Pure.
import { CASH_MIN_CENTS, CREDIT_MULTIPLIER } from "@/lib/partners/tiers";

export type PayoutPref = "cash" | "credit" | "split";

// Cash is sent only on the 1st and 15th; store credit is issued on any day's run.
// runDate is the run's UTC date string (YYYY-MM-DD).
export function isCashDay(runDate: string): boolean {
  const day = Number(runDate.slice(8, 10));
  return day === 1 || day === 15;
}

export function splitPayout(i: {
  netCents: number; carryCents: number; pref: PayoutPref; splitCashPct: number; w9Checked: boolean; cashDay: boolean;
}): { cashCents: number; creditValueCents: number; newCarryCents: number } {
  let available = i.netCents;
  let carry = i.carryCents;
  if (available <= 0) {
    // This run earned nothing new (or a deduction). Carry is cash-only: pay
    // it now if it's already payable, otherwise just carry the combined balance.
    const combined = carry + available;
    if (i.cashDay && combined >= CASH_MIN_CENTS && i.w9Checked) return { cashCents: combined, creditValueCents: 0, newCarryCents: 0 };
    return { cashCents: 0, creditValueCents: 0, newCarryCents: combined };
  }
  if (carry < 0) {
    // Settle negative carry first; nothing is paid while the balance is negative.
    const combined = available + carry;
    if (combined <= 0) return { cashCents: 0, creditValueCents: 0, newCarryCents: combined };
    available = combined;
    carry = 0;
  }
  const cashShare = i.pref === "cash" ? available : i.pref === "credit" ? 0 : Math.round((available * i.splitCashPct) / 100);
  const creditShare = available - cashShare;
  const creditValueCents = Math.round(creditShare * CREDIT_MULTIPLIER);
  const cashDue = carry + cashShare;
  if (i.cashDay && cashDue >= CASH_MIN_CENTS && i.w9Checked) return { cashCents: cashDue, creditValueCents, newCarryCents: 0 };
  return { cashCents: 0, creditValueCents, newCarryCents: cashDue };
}

// Cash a partner is owed but that a run carried forward instead of sending.
export function heldCash(i: { carryCents: number; w9Checked: boolean }): { cents: number; reason: "w9" | "minimum" } | null {
  if (i.carryCents <= 0) return null;
  return { cents: i.carryCents, reason: i.w9Checked ? "minimum" : "w9" };
}

// What a partner has actually received: store credit is added when the run
// happens; cash counts only once it's marked sent.
export function receivedCents(payouts: { cash_cents: number; credit_cents: number; status: "queued" | "paid" | "credited" }[]): number {
  return payouts.reduce((sum, p) => sum + p.credit_cents + (p.status === "paid" ? p.cash_cents : 0), 0);
}
