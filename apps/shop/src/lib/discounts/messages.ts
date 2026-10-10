// Every message a customer sees about a discount code (mock screen 7). Pure.
import { usd } from "@/lib/html";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";
import { customerSummary, type CodeTerms } from "@/lib/discounts/rules";
import type { EngineResult } from "@/lib/discounts/engine";

export const CODE_MESSAGES = {
  ended: (date: string) => `This code ended on ${date}.`,
  notStarted: "This code isn't active yet.",
  usedUp: "This code has reached its limit.",
  alreadyUsed: "You've already used this code.",
  locked: "This code isn't valid for the email on your account.",
  invalid: "This code can't be used.",
  confirmEmail: "Please verify your email first — check your inbox for the link.",
  tooMany: "Too many codes tried. Wait a few minutes and try again.",
  couldntCheck: "We couldn't check that code. Try again — you won't be charged until it works.",
} as const;

export type ClaimResult = "ok" | "missing" | "inactive" | "used_up" | "already_used";
export const CLAIM_MESSAGE: Record<Exclude<ClaimResult, "ok">, string> = {
  missing: CODE_MESSAGES.invalid,
  inactive: CODE_MESSAGES.invalid,
  used_up: CODE_MESSAGES.usedUp,
  already_used: CODE_MESSAGES.alreadyUsed,
};

export type CodeNote = { tone: "good" | "note" | "bad"; text: string };

export function outcomeMessage(
  r: Pick<EngineResult, "codeOutcome" | "cappedCents" | "codeDiscountCents" | "shortOfMinCents" | "newAccount">,
  code: string, terms: CodeTerms, capPct: number,
): CodeNote | null {
  switch (r.codeOutcome) {
    case null: return null;
    case "applied":
      return r.cappedCents > 0 && r.codeDiscountCents > 0
        ? { tone: "note", text: `${code} applied. Your discounts are capped at ${capPct}% of list price, so ${code} saves ${usd(r.codeDiscountCents)} here.` }
        : { tone: "good", text: `${code} applied — ${customerSummary(terms)}.` };
    case "no_gain":
      if (terms.kind === "ship_only") return { tone: "note", text: "Shipping is already free on this order, so this code isn't needed." };
      return r.newAccount
        ? { tone: "note", text: `Your new-account ${OFFER_PCT_TEXT} is already larger than this code on these items, so we kept it.` }
        : { tone: "note", text: "A larger discount already applies to these items, so this code isn't used." };
    case "below_min":
      return { tone: "bad", text: `Add ${usd(r.shortOfMinCents)} more to use this code (minimum ${usd(terms.minOrderCents ?? 0)} after your other discounts).` };
    case "no_eligible_items":
      return { tone: "bad", text: "This code doesn't apply to the items in your cart." };
  }
}
