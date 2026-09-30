// One partner, one payout run. netCents = payable commission − new deductions.
// carryCents = cash owed from earlier runs (below $100 or W-9 pending), or a
// negative balance from refunds after payout. Pure.
import { CASH_MIN_CENTS, CREDIT_MULTIPLIER } from "@/lib/partners/tiers";

export type PayoutPref = "cash" | "credit" | "split";

export function splitPayout(i: {
  netCents: number; carryCents: number; pref: PayoutPref; splitCashPct: number; w9Checked: boolean;
}): { cashCents: number; creditValueCents: number; newCarryCents: number } {
  let available = i.netCents;
  let carry = i.carryCents;
  if (available <= 0) {
    // This run earned nothing new (or a deduction). Carry is cash-only: pay
    // it now if it's already payable, otherwise just carry the combined balance.
    const combined = carry + available;
    if (combined >= CASH_MIN_CENTS && i.w9Checked) return { cashCents: combined, creditValueCents: 0, newCarryCents: 0 };
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
  if (cashDue >= CASH_MIN_CENTS && i.w9Checked) return { cashCents: cashDue, creditValueCents, newCarryCents: 0 };
  return { cashCents: 0, creditValueCents, newCarryCents: cashDue };
}
