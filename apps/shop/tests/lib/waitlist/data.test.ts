import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
const { getSubscriber, upsertPending, sendTracked, confirmSubscriber, alertOwner } = vi.hoisted(() => ({
  getSubscriber: vi.fn(), upsertPending: vi.fn(), sendTracked: vi.fn(), confirmSubscriber: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/email/data", () => ({ getSubscriber, upsertPending, sendTracked, confirmSubscriber }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/notify", () => ({ alertOwner }));

import { confirmWaitlist, ensureReferralCode, joinWaitlist } from "@/lib/waitlist/data";

describe("waitlist data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MAILING_ADDRESS = "30 N Gould St Ste R, Sheridan, WY 82801";
    process.env.EMAIL_LINK_SECRET = "test-secret";
    sendTracked.mockResolvedValue("sent");
  });

  it("a new address: listed as a pending waitlist sign-up and sent a confirm link", async () => {
    upsertPending.mockResolvedValue({ state: "pending", token: "tok" });
    const joined = query({});
    from = fromQueue({ subscribers: [joined] });
    await joinWaitlist({ email: " New@Lab.org ", referredBy: null });
    expect(upsertPending).toHaveBeenCalledWith({ email: "new@lab.org", source: "waitlist", partnerRef: null }, expect.any(Number));
    expect(callArgs(joined, "is")).toEqual(["waitlist_at", null]);
    const send = sendTracked.mock.calls[0][0];
    expect(send).toMatchObject({ email: "new@lab.org", kind: "confirm" });
    expect(send.msg.html).toContain("https://auraprotocols.com/api/waitlist/confirm?token=tok");
  });

  it("records the friend's invite code once, and never the person's own", async () => {
    upsertPending.mockResolvedValue({ state: "pending", token: "tok" });
    const update = query({});
    from = fromQueue({ subscribers: [query({}), query({ data: { email: "friend@lab.org" } }), update] });
    await joinWaitlist({ email: "new@lab.org", referredBy: "K7M2QX" });
    expect(callArgs(update, "update")).toEqual([{ referred_by: "K7M2QX" }]);
    expect(update.calls.filter(([m]) => m === "is")).toEqual([["is", ["referred_by", null]], ["is", ["referral_code", null]]]);

    from = fromQueue({ subscribers: [query({}), query({ data: { email: "new@lab.org" } })] });
    await joinWaitlist({ email: "new@lab.org", referredBy: "K7M2QX" });
    expect(from).toHaveBeenCalledTimes(2); // own code: no update
  });

  it("an already-confirmed address gets its invite link instead of a second opt-in", async () => {
    upsertPending.mockResolvedValue({ state: "confirmed" });
    getSubscriber.mockResolvedValue({ email: "a@lab.org", referral_code: "ABCDEF" });
    from = fromQueue({ subscribers: [query({})] });
    await joinWaitlist({ email: "a@lab.org", referredBy: null });
    const send = sendTracked.mock.calls[0][0];
    expect(send.kind).toBe("waitlist_in");
    expect(send.msg.html).toContain("auraprotocols.com/?r=ABCDEF");
    expect(send.msg.html).toContain("Sheridan, WY");
    expect(send.unsubscribeUrl).toContain("c=waitlist_in");
  });

  it("a cooling-down address: nothing is sent", async () => {
    upsertPending.mockResolvedValue({ state: "cooldown" });
    from = fromQueue({ subscribers: [query({})] });
    await joinWaitlist({ email: "a@lab.org", referredBy: null });
    expect(sendTracked).not.toHaveBeenCalled();
  });

  it("makes an invite code once and keeps it", async () => {
    getSubscriber.mockResolvedValueOnce({ email: "a@lab.org", referral_code: null }).mockResolvedValueOnce({ email: "a@lab.org", referral_code: "QQQQQQ" });
    const save = query({});
    from = fromQueue({ subscribers: [save] });
    expect(await ensureReferralCode("a@lab.org")).toBe("QQQQQQ");
    expect((callArgs(save, "update")![0] as { referral_code: string }).referral_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it("confirm: an unknown token is invalid; a good one returns the code even if the invite email fails", async () => {
    confirmSubscriber.mockResolvedValueOnce(null);
    expect(await confirmWaitlist("bad")).toEqual({ state: "invalid" });

    confirmSubscriber.mockResolvedValueOnce({ row: { email: "a@lab.org" }, already: false });
    getSubscriber.mockResolvedValue({ email: "a@lab.org", referral_code: "ABCDEF" });
    sendTracked.mockRejectedValueOnce(new Error("ses down"));
    expect(await confirmWaitlist("tok")).toEqual({ state: "in", code: "ABCDEF" });
    expect(alertOwner).toHaveBeenCalledWith("Waitlist: invite email failed", expect.stringContaining("a@lab.org"));
  });
});
