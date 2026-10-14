import { describe, it, expect, vi, beforeEach } from "vitest";

const { getCustomer, letterState, subscribeToLetter, subscribeOtherEmail, alertOwner } = vi.hoisted(() => ({
  getCustomer: vi.fn(), letterState: vi.fn(), subscribeToLetter: vi.fn(), subscribeOtherEmail: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/email/letter", () => ({ letterState, subscribeToLetter, subscribeOtherEmail }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

import { letterStatusAction, subscribeLetterAction } from "@/app/letter-actions";

const consent = (on: boolean, email?: string) => { const f = new FormData(); if (on) f.set("consent", "on"); if (email !== undefined) f.set("email", email); return f; };
const me = { id: "c1", email: "a@lab.org", emailConfirmed: true };

describe("Aura letter actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("reports signed out, or the account's email and list state", async () => {
    getCustomer.mockResolvedValueOnce(null);
    expect(await letterStatusAction()).toEqual({ signedIn: false });
    getCustomer.mockResolvedValueOnce(me);
    letterState.mockResolvedValueOnce("none");
    expect(await letterStatusAction()).toEqual({ signedIn: true, email: "a@lab.org", state: "none", verified: true });
  });

  it("requires a signed-in account and the consent box", async () => {
    getCustomer.mockResolvedValue(null);
    expect(await subscribeLetterAction(consent(true))).toEqual({ ok: false, message: "Please sign in to subscribe." });
    getCustomer.mockResolvedValue(me);
    expect((await subscribeLetterAction(consent(false))).ok).toBe(false);
    expect(subscribeToLetter).not.toHaveBeenCalled();
  });

  it("subscribes the account's own email", async () => {
    getCustomer.mockResolvedValue(me);
    subscribeToLetter.mockResolvedValue("confirmed");
    expect(await subscribeLetterAction(consent(true))).toEqual({ ok: true, state: "confirmed", email: "a@lab.org" });
    expect(subscribeToLetter).toHaveBeenCalledWith(me);
  });

  it("says so and alerts the owner when the save fails", async () => {
    getCustomer.mockResolvedValue(me);
    subscribeToLetter.mockRejectedValue(new Error("db down"));
    const r = await subscribeLetterAction(consent(true));
    expect(r.ok).toBe(false);
    expect(alertOwner).toHaveBeenCalledWith("Aura letter: subscribe failed", expect.stringContaining("db down"));
  });

  it("sends a different address a confirm link instead of listing it", async () => {
    getCustomer.mockResolvedValue(me);
    subscribeOtherEmail.mockResolvedValue("check_inbox");
    expect(await subscribeLetterAction(consent(true, " Lab@Other.org "))).toEqual({ ok: true, state: "check_inbox", email: "lab@other.org" });
    expect(subscribeOtherEmail).toHaveBeenCalledWith("lab@other.org");
    expect(subscribeToLetter).not.toHaveBeenCalled();
  });

  it("treats the account email in any case as the account's own", async () => {
    getCustomer.mockResolvedValue(me);
    subscribeToLetter.mockResolvedValue("confirmed");
    await subscribeLetterAction(consent(true, "A@LAB.org"));
    expect(subscribeToLetter).toHaveBeenCalledWith(me);
    expect(subscribeOtherEmail).not.toHaveBeenCalled();
  });

  it("rejects an invalid address", async () => {
    getCustomer.mockResolvedValue(me);
    expect(await subscribeLetterAction(consent(true, "not-an-email"))).toEqual({ ok: false, message: "Please enter a valid email address." });
  });
});
