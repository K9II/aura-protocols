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
  if (carry < 0 || available <= 0) {
    // Settle negatives first; nothing is paid while the balance is negative.
    const combined = available + carry;
    if (combined <= 0 || available <= 0) return { cashCents: 0, creditValueCents: 0, newCarryCents: combined };
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
