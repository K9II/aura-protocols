// Customers module rules (spec 2026-10-04-admin-customers-design.md). Pure.
import { usd } from "@/lib/html";
import { NEW_ACCOUNT_DAYS } from "@/lib/account/offer";

export const TABS = ["all", "ordered", "none", "unverified", "blocked"] as const;
export type CustomerTab = (typeof TABS)[number];
export const TAB_LABEL: Record<CustomerTab, string> = { all: "All", ordered: "Ordered", none: "No order yet", unverified: "Unverified", blocked: "Blocked" };
export const parseTab = (v: string | undefined): CustomerTab => (TABS as readonly string[]).includes(v ?? "") ? (v as CustomerTab) : "all";

export const cleanSearch = (q: string): string => q.trim().replace(/[%_\\]/g, "").slice(0, 100);

export const CREDIT_CATEGORIES = ["goodwill", "seeding", "correction", "other"] as const;
export type CreditCategory = (typeof CREDIT_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<CreditCategory, string> = { goodwill: "Goodwill", seeding: "Seeding", correction: "Correction", other: "Other" };
export const MAX_CREDIT_CENTS = 500_000; // $5,000 per adjustment
const MAX_TEXT = 300;

export type CreditForm = { direction: string; amount: string; category: string; note: string; email: string; message: string };
export type CreditValue = { amountCents: number; category: CreditCategory; note: string | null; email: boolean; message: string | null };

export function parseCredit(f: CreditForm, balanceCents: number): { ok: true; value: CreditValue } | { ok: false; fieldErrors: Record<string, string> } {
  const e: Record<string, string> = {};
  const remove = f.direction === "remove";
  const dollars = Number(f.amount);
  const cents = Math.round(dollars * 100);
  if (!Number.isFinite(dollars) || cents < 1 || cents > MAX_CREDIT_CENTS) e.amount = "Enter an amount from $0.01 to $5,000.";
  else if (remove && cents > balanceCents) e.amount = `That's more than the ${usd(balanceCents)} balance.`;
  const category = f.category as CreditCategory;
  if (!(CREDIT_CATEGORIES as readonly string[]).includes(category)) e.category = "Pick a reason.";
  const note = f.note.trim().slice(0, MAX_TEXT) || null;
  if (category === "other" && !note) e.note = "Say what it's for.";
  if (Object.keys(e).length) return { ok: false, fieldErrors: e };
  const email = !remove && f.email === "on";
  return { ok: true, value: { amountCents: remove ? -cents : cents, category, note, email, message: email ? f.message.trim().slice(0, MAX_TEXT) || null : null } };
}

export function blockRefusal(target: { id: string; isOwner: boolean; isStaff: boolean }, actorId: string): string | null {
  if (target.isOwner) return "An owner account can't be blocked.";
  if (target.isStaff) return "A team login can't be blocked — disable it on the Team page first.";
  if (target.id === actorId) return "You can't block yourself.";
  return null;
}

export function summarizeUserAgent(ua: string | null): string {
  if (!ua) return "Not recorded";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "unknown device";
  return `${browser} on ${os}`;
}

export const fingerprint = (hash: string | null): string => (hash ? hash.slice(0, 8) : "—");

export type OfferState = { kind: "used"; order: string } | { kind: "open"; until: string } | { kind: "expired" };
export function offerState(createdAt: string, usedOn: string | null, nowMs: number = Date.now()): OfferState {
  if (usedOn) return { kind: "used", order: usedOn };
  const until = Date.parse(createdAt) + NEW_ACCOUNT_DAYS * 86_400_000;
  return nowMs < until ? { kind: "open", until: new Date(until).toISOString() } : { kind: "expired" };
}
