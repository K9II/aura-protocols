import { describe, it, expect, afterEach } from "vitest";
import { isPrelaunch, prelaunchAllows } from "@/lib/prelaunch";

describe("pre-launch lock", () => {
  afterEach(() => { delete process.env.PRELAUNCH; });

  it("is on only with PRELAUNCH=1", () => {
    expect(isPrelaunch()).toBe(false);
    process.env.PRELAUNCH = "1";
    expect(isPrelaunch()).toBe(true);
  });

  it("keeps the coming-soon page, the owner's way into the command center and email landings open", () => {
    for (const p of ["/", "/early", "/admin", "/admin/email", "/sign-in", "/auth/callback", "/reset-password", "/unsubscribed", "/opengraph-image"]) {
      expect(prelaunchAllows(p), p).toBe(true);
    }
  });

  it("locks every store page", () => {
    for (const p of ["/products", "/products/bpc-157", "/checkout", "/cart", "/coa", "/coa/AP-1", "/terms", "/privacy", "/account", "/wholesale", "/affiliates", "/partners", "/administrator", "/L/AP-1"]) {
      expect(prelaunchAllows(p), p).toBe(false);
    }
  });

  it("opens only the APIs the waitlist, email and crons need", () => {
    for (const p of ["/api/waitlist/confirm", "/api/unsubscribe", "/api/ses/events", "/api/ses/inbound", "/api/cron/emails", "/api/catalog/refresh"]) {
      expect(prelaunchAllows(p), p).toBe(true);
    }
    for (const p of ["/api/inquiry", "/api/gate/lookup", "/api/me/gate", "/api/subscribe/confirm", "/api/stripe/webhook", "/api/waitlistx"]) {
      expect(prelaunchAllows(p), p).toBe(false);
    }
  });
});
