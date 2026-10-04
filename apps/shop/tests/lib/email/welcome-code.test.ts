import { describe, it, expect } from "vitest";
import { checkWelcomeCode, generateWelcomeCode, isWelcomeCodeFormat, welcomeExpiry, WELCOME_PCT, type WelcomeRow } from "@/lib/email/welcome-code";
import { CODE_DISCOUNT_PCT } from "@/lib/partners/tiers";

const now = Date.parse("2026-12-01T12:00:00Z");
const row = (o: Partial<WelcomeRow> = {}): WelcomeRow => ({
  email: "lab@example.com", status: "confirmed", welcome_code: "AURA-7K2Q",
  welcome_code_expires_at: "2026-12-10T00:00:00Z", welcome_code_used_order_id: null, ...o,
});
const check = (o: Partial<Parameters<typeof checkWelcomeCode>[0]> = {}) =>
  checkWelcomeCode({ code: "aura-7k2q", buyerEmail: "Lab@Example.com", row: row(), hasPaidOrder: false, nowMs: now, ...o });

describe("welcome code", () => {
  it("is 10%, the same as a partner code", () => {
    expect(WELCOME_PCT).toBe(CODE_DISCOUNT_PCT);
  });

  it("generates AURA- plus 4 unambiguous characters", () => {
    const seq = [0, 15, 30, 6];
    let i = 0;
    const code = generateWelcomeCode((n) => seq[i++ % seq.length] % n);
    expect(code).toMatch(/^AURA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    expect(isWelcomeCodeFormat(code)).toBe(true);
    expect(isWelcomeCodeFormat(" aura-7k2q ")).toBe(true);
    expect(isWelcomeCodeFormat("SMITHLAB")).toBe(false);
    expect(isWelcomeCodeFormat("AURA-0O1I")).toBe(false);
    expect(isWelcomeCodeFormat("AURA-LLLL")).toBe(false);
  });

  it("expires at the end of the UTC day, 14 days after confirmation (so it doesn't end before the date shown in the email)", () => {
    expect(welcomeExpiry(Date.parse("2026-12-01T00:00:00Z"))).toBe("2026-12-15T23:59:59.999Z");
    expect(welcomeExpiry(Date.parse("2026-12-01T22:30:00Z"))).toBe("2026-12-15T23:59:59.999Z");
  });

  it("accepts the right code for the right email, case-insensitively", () => {
    expect(check()).toEqual({ ok: true, code: "AURA-7K2Q" });
  });

  it("rejects each failure with its own message", () => {
    expect(check({ row: null })).toEqual({ ok: false, message: "This code isn't valid." });
    expect(check({ row: row({ email: "other@example.com" }) })).toEqual({ ok: false, message: "This code belongs to a different email address. Sign in with the email it was sent to." });
    expect(check({ row: row({ status: "pending" }) })).toEqual({ ok: false, message: "This code isn't valid." });
    expect(check({ row: row({ welcome_code_used_order_id: "o1" }) })).toEqual({ ok: false, message: "This code has already been used." });
    expect(check({ nowMs: Date.parse("2026-12-10T00:00:01Z") })).toEqual({ ok: false, message: "This code has expired." });
    expect(check({ hasPaidOrder: true })).toEqual({ ok: false, message: "This code is for a first order only." });
  });

  it("still accepts a code after a marketing unsubscribe (not account deletion)", () => {
    expect(check({ row: row({ status: "unsubscribed" }) })).toEqual({ ok: true, code: "AURA-7K2Q" });
  });
});
