import { describe, it, expect } from "vitest";
import { dueWelcome, dueCart, WELCOME_DAYS, CART_HOURS } from "@/lib/email/schedule";

const H = 3600 * 1000, D = 24 * H;
const t0 = Date.parse("2026-12-01T00:00:00Z");

describe("welcome schedule", () => {
  it("runs on days 0, 2, 5, 8, 10", () => {
    expect(WELCOME_DAYS).toEqual([0, 2, 5, 8, 10]);
  });

  it("returns the earliest unsent file that is due, one at a time", () => {
    expect(dueWelcome(t0, t0 + 1 * D, new Set())).toBe("welcome_1");
    expect(dueWelcome(t0, t0 + 1 * D, new Set(["welcome_1"]))).toBeNull();
    expect(dueWelcome(t0, t0 + 2 * D, new Set(["welcome_1"]))).toBe("welcome_2");
    // a missed day never sends two files at once
    expect(dueWelcome(t0, t0 + 9 * D, new Set(["welcome_1"]))).toBe("welcome_2");
    expect(dueWelcome(t0, t0 + 12 * D, new Set(["welcome_1", "welcome_2", "welcome_3", "welcome_4", "welcome_5"]))).toBeNull();
  });

  it("gives up on a series older than 21 days", () => {
    expect(dueWelcome(t0, t0 + 22 * D, new Set(["welcome_1"]))).toBeNull();
  });
});

describe("cart schedule", () => {
  it("runs at +1 h, +12 h and +23 h (before Stripe's 24 h expiry)", () => {
    expect(CART_HOURS).toEqual([1, 12, 23]);
  });

  it("returns the latest due reminder not yet sent, and nothing before 1 h or after 24 h", () => {
    expect(dueCart(t0, t0 + 30 * 60 * 1000, new Set())).toBeNull();
    expect(dueCart(t0, t0 + 2 * H, new Set())).toBe("cart_1");
    expect(dueCart(t0, t0 + 13 * H, new Set(["cart_1"]))).toBe("cart_2");
    // if the hourly run missed cart_1, skip straight to the current one
    expect(dueCart(t0, t0 + 13 * H, new Set())).toBe("cart_2");
    expect(dueCart(t0, t0 + 23.5 * H, new Set(["cart_1", "cart_2"]))).toBe("cart_3");
    expect(dueCart(t0, t0 + 23.5 * H, new Set(["cart_1", "cart_2", "cart_3"]))).toBeNull();
    expect(dueCart(t0, t0 + 25 * H, new Set())).toBeNull();
  });
});
