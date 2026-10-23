import { describe, it, expect, vi, beforeEach } from "vitest";

const { joinWaitlist, confirmsLastHour, checkDeliverable, alertOwner } = vi.hoisted(() => ({
  joinWaitlist: vi.fn(), confirmsLastHour: vi.fn(), checkDeliverable: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/waitlist/data", () => ({ joinWaitlist, confirmsLastHour, WAITLIST_HOURLY_CAP: 120 }));
vi.mock("@/lib/account/deliverable", () => ({ checkDeliverable }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

import { joinWaitlistAction } from "@/app/waitlist-actions";

const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };

describe("joinWaitlistAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkDeliverable.mockResolvedValue("ok");
    confirmsLastHour.mockResolvedValue(0);
    joinWaitlist.mockResolvedValue(undefined);
  });

  it("joins with the invite code it came through", async () => {
    expect(await joinWaitlistAction(form({ email: " A@Lab.org ", ref: "k7m2qx" }))).toEqual({ ok: true, email: "a@lab.org" });
    expect(joinWaitlist).toHaveBeenCalledWith({ email: "a@lab.org", referredBy: "K7M2QX" });
  });

  it("ignores a junk invite code", async () => {
    await joinWaitlistAction(form({ email: "a@lab.org", ref: "nope" }));
    expect(joinWaitlist).toHaveBeenCalledWith({ email: "a@lab.org", referredBy: null });
  });

  it("refuses a bad or undeliverable address", async () => {
    expect((await joinWaitlistAction(form({ email: "not-an-email" }))).ok).toBe(false);
    checkDeliverable.mockResolvedValue("undeliverable");
    expect((await joinWaitlistAction(form({ email: "a@nomx.example" }))).ok).toBe(false);
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("a filled honeypot looks like success and saves nothing", async () => {
    expect((await joinWaitlistAction(form({ email: "a@lab.org", website: "spam" }))).ok).toBe(true);
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("past the hourly cap: asks to try again and alerts the owner", async () => {
    confirmsLastHour.mockResolvedValue(120);
    const r = await joinWaitlistAction(form({ email: "a@lab.org" }));
    expect(r.ok).toBe(false);
    expect(joinWaitlist).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith("Waitlist: hourly sign-up cap reached", expect.any(String));
  });

  it("a failed save says so and alerts the owner", async () => {
    joinWaitlist.mockRejectedValue(new Error("db down"));
    const r = await joinWaitlistAction(form({ email: "a@lab.org" }));
    expect(r).toEqual({ ok: false, message: "We couldn't add you just now. Please try again in a minute." });
    expect(alertOwner).toHaveBeenCalledWith("Waitlist: sign-up failed", expect.stringContaining("a@lab.org"));
  });
});
