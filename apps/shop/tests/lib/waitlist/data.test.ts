import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
const { getSubscriber, sendTracked, confirmSubscriber, alertOwner } = vi.hoisted(() => ({
  getSubscriber: vi.fn(), sendTracked: vi.fn(), confirmSubscriber: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/email/data", () => ({ getSubscriber, sendTracked, confirmSubscriber }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

import { confirmWaitlist, ensureReferralCode, joinWaitlist } from "@/lib/waitlist/data";

const withCode = { email: "new@lab.org", status: "confirmed", source: "waitlist", referral_code: "ABCDEF" };

describe("waitlist data (single opt-in)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAILING_ADDRESS = "30 N Gould St Ste R, Sheridan, WY 82801";
    process.env.EMAIL_LINK_SECRET = "test-secret";
    sendTracked.mockResolvedValue("sent");
  });

  it("a new address is on the list at once, gets its invite code and the invite email", async () => {
    getSubscriber.mockResolvedValueOnce(null).mockResolvedValue(withCode);
    const save = query({}), joined = query({});
    from = fromQueue({ subscribers: [save, joined] });
    expect(await joinWaitlist({ email: " New@Lab.org ", referredBy: null })).toBe("ABCDEF");
    expect(callArgs(save, "upsert")![0]).toMatchObject({ email: "new@lab.org", source: "waitlist", status: "confirmed", unsubscribed_at: null });
    expect(callArgs(joined, "is")).toEqual(["waitlist_at", null]);
    const send = sendTracked.mock.calls[0][0];
    expect(send).toMatchObject({ email: "new@lab.org", kind: "waitlist_in" });
    expect(send.msg.html).toContain("auraprotocols.com/?r=ABCDEF");
    expect(send.msg.html).toContain("Sheridan, WY");
    expect(send.unsubscribeUrl).toContain("c=waitlist_in");
  });

  it("an address already confirmed (e.g. on the letter) keeps its row and still gets its link", async () => {
    getSubscriber.mockResolvedValue({ ...withCode, source: "letter" });
    from = fromQueue({ subscribers: [query({})] });
    expect(await joinWaitlist({ email: "new@lab.org", referredBy: null })).toBe("ABCDEF");
    expect(from).toHaveBeenCalledTimes(1); // waitlist_at only, no upsert
  });

  it("records the colleague's invite code once, and never the person's own", async () => {
    getSubscriber.mockResolvedValue(withCode);
    const update = query({});
    from = fromQueue({ subscribers: [query({}), query({ data: { email: "colleague@lab.org" } }), update] });
    await joinWaitlist({ email: "new@lab.org", referredBy: "K7M2QX" });
    expect(callArgs(update, "update")).toEqual([{ referred_by: "K7M2QX" }]);
    expect(update.calls.filter(([m]) => m === "is")).toEqual([["is", ["referred_by", null]], ["is", ["referral_code", null]]]);

    from = fromQueue({ subscribers: [query({}), query({ data: { email: "new@lab.org" } })] });
    await joinWaitlist({ email: "new@lab.org", referredBy: "K7M2QX" });
    expect(from).toHaveBeenCalledTimes(2); // own code: no update
  });

  it("a failed invite email still returns the code and alerts the owner", async () => {
    getSubscriber.mockResolvedValue(withCode);
    from = fromQueue({ subscribers: [query({})] });
    sendTracked.mockRejectedValueOnce(new Error("ses down"));
    expect(await joinWaitlist({ email: "new@lab.org", referredBy: null })).toBe("ABCDEF");
    expect(alertOwner).toHaveBeenCalledWith("Waitlist: invite email failed", expect.stringContaining("new@lab.org"));
  });

  it("a failed save throws", async () => {
    getSubscriber.mockResolvedValue(null);
    from = fromQueue({ subscribers: [query({ error: { message: "db down" } })] });
    await expect(joinWaitlist({ email: "new@lab.org", referredBy: null })).rejects.toThrow(/waitlist save failed/);
  });

  it("makes an invite code once and keeps it", async () => {
    getSubscriber.mockResolvedValueOnce({ email: "a@lab.org", referral_code: null }).mockResolvedValueOnce({ email: "a@lab.org", referral_code: "QQQQQQ" });
    const save = query({});
    from = fromQueue({ subscribers: [save] });
    expect(await ensureReferralCode("a@lab.org")).toBe("QQQQQQ");
    expect((callArgs(save, "update")![0] as { referral_code: string }).referral_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("old confirm links: unknown token is invalid; a pending row confirms and gets its code", async () => {
    confirmSubscriber.mockResolvedValueOnce(null);
    expect(await confirmWaitlist("bad")).toEqual({ state: "invalid" });
    confirmSubscriber.mockResolvedValueOnce({ row: { email: "new@lab.org" }, already: false });
    getSubscriber.mockResolvedValue(withCode);
    expect(await confirmWaitlist("tok")).toEqual({ state: "in", code: "ABCDEF" });
  });
});
