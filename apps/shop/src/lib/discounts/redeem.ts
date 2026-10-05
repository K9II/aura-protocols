// Pre-checks a typed discount code for a signed-in customer. The SQL claim at
// checkout is the authority on limits; this gives the customer the right
// message early.
import "server-only";
import { findCodeByText, countUses } from "@/lib/discounts/data";
import { CODE_MESSAGES } from "@/lib/discounts/messages";
import { codeStatus, termsFromRow, type CodeTerms } from "@/lib/discounts/rules";
import { shortDate } from "@/lib/discounts/time";

export type CodeLookup =
  | { kind: "discount"; id: string; code: string; terms: CodeTerms }
  | { kind: "none" }
  | { kind: "error"; message: string };

export async function lookupDiscountCode(typed: string, customer: { id: string; email: string }, nowMs: number = Date.now()): Promise<CodeLookup> {
  const row = await findCodeByText(typed);
  if (!row) return { kind: "none" };
  const counts = await countUses(row, customer.id);
  const status = codeStatus(row, counts.total, nowMs);
  if (status === "ended") return { kind: "error", message: row.ends_at && row.status !== "ended" ? CODE_MESSAGES.ended(shortDate(row.ends_at)) : CODE_MESSAGES.invalid };
  if (status === "used_up") return { kind: "error", message: CODE_MESSAGES.usedUp };
  if (status === "paused") return { kind: "error", message: CODE_MESSAGES.invalid };
  if (status === "scheduled") return { kind: "error", message: CODE_MESSAGES.notStarted };
  if (row.locked_email && row.locked_email.toLowerCase() !== customer.email.toLowerCase()) return { kind: "error", message: CODE_MESSAGES.locked };
  if (row.once_per_customer && counts.mine > 0) return { kind: "error", message: CODE_MESSAGES.alreadyUsed };
  return { kind: "discount", id: row.id, code: row.code, terms: termsFromRow(row) };
}
