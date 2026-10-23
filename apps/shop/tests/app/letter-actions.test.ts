import { describe, it, expect, vi, beforeEach } from "vitest";

const { getCustomer, letterState, subscribeToLetter, alertOwner } = vi.hoisted(() => ({
  getCustomer: vi.fn(), letterState: vi.fn(), subscribeToLetter: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ getCustomer }));
vi.mock("@/lib/email/letter", () => ({ letterState, subscribeToLetter }));
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

  it("only ever lists the account's own email — an address posted with the form is ignored (single opt-in, no confirm email)", async () => {
    getCustomer.mockResolvedValue(me);
    subscribeToLetter.mockResolvedValue("pending");
    expect(await subscribeLetterAction(consent(true, "someone@else.org"))).toEqual({ ok: true, state: "pending", email: "a@lab.org" });
    expect(subscribeToLetter).toHaveBeenCalledWith(me);
  });
});
