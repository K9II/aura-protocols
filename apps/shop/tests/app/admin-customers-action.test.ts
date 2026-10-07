import { describe, it, expect, vi, beforeEach } from "vitest";
import { ownerStaff } from "../helpers/staff";

const requirePermission = vi.fn();
const data = { getCustomerBasics: vi.fn(), adjustCredit: vi.fn(), logCustomerEvent: vi.fn() };
const block = { blockCustomer: vi.fn(), unblockCustomer: vi.fn() };
const creditBalance = vi.fn(), sendOrAlert = vi.fn(), sendVerifyEmail = vi.fn(), lastVerifySentAt = vi.fn();
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/customers/data", () => data);
vi.mock("@/lib/customers/block", () => block);
vi.mock("@/lib/partners/ledger", () => ({ creditBalance }));
vi.mock("@/lib/notify", () => ({ sendOrAlert }));
vi.mock("@/lib/account/verify", () => ({ sendVerifyEmail, lastVerifySentAt }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://shop.test" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const ID = "3f1e2d4c-5b6a-4789-8abc-def012345678";
const target = { id: ID, email: "e@lab.edu", fullName: "Elena Novak", isOwner: false, blockedAt: null, verifiedAt: null };
function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const credit = { customerId: ID, direction: "add", amount: "50", category: "seeding", note: "samples", email: "on", message: "Thanks" };

describe("customer admin actions", () => {
  beforeEach(() => {
    vi.resetModules();
    requirePermission.mockReset(); requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    for (const f of [...Object.values(data), ...Object.values(block), creditBalance, sendOrAlert, sendVerifyEmail, lastVerifySentAt]) f.mockReset();
    data.getCustomerBasics.mockResolvedValue(target);
    creditBalance.mockResolvedValue(12_000);
    data.adjustCredit.mockResolvedValue({ ok: true, eventId: "e1" });
    sendOrAlert.mockResolvedValue(true);
  });

  it("every action is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const a = await import("@/app/admin/customers/actions");
    await expect(a.adjustCreditAction(null, fd(credit))).rejects.toThrow("NOT_FOUND");
    await expect(a.blockAction(null, fd({ customerId: ID, reason: "x" }))).rejects.toThrow("NOT_FOUND");
    await expect(a.unblockAction(fd({ customerId: ID }))).rejects.toThrow("NOT_FOUND");
    await expect(a.resendVerifyAdminAction(null, fd({ customerId: ID }))).rejects.toThrow("NOT_FOUND");
    expect(data.adjustCredit).not.toHaveBeenCalled();
  });

  it("adds credit, then emails the new balance", async () => {
    const { adjustCreditAction } = await import("@/app/admin/customers/actions");
    expect(await adjustCreditAction(null, fd(credit))).toEqual({ ok: "Added $50.00. The customer was emailed." });
    expect(data.adjustCredit).toHaveBeenCalledWith(ID, 5000, "seeding", "samples", "owner");
    expect(sendOrAlert).toHaveBeenCalledWith(expect.objectContaining({ to: "e@lab.edu", subject: "$50.00 store credit added to your account" }), expect.any(String));
    expect(sendOrAlert.mock.calls[0][0].html).toContain("$170.00");
  });

  it("an email failure keeps the credit and says so", async () => {
    sendOrAlert.mockResolvedValue(false);
    const { adjustCreditAction } = await import("@/app/admin/customers/actions");
    expect(await adjustCreditAction(null, fd(credit))).toEqual({ ok: "Credit added. The email didn't send." });
  });

  it("field errors don't write; a race below zero is reported on the amount", async () => {
    const { adjustCreditAction } = await import("@/app/admin/customers/actions");
    expect(await adjustCreditAction(null, fd({ ...credit, category: "other", note: "" }))).toEqual({ fieldErrors: { note: "Say what it's for." } });
    data.adjustCredit.mockResolvedValue({ ok: false, reason: "insufficient" });
    expect(await adjustCreditAction(null, fd({ ...credit, direction: "remove", amount: "100" }))).toEqual({ fieldErrors: { amount: expect.stringMatching(/balance changed/) } });
    expect(sendOrAlert).not.toHaveBeenCalled();
  });

  it("block needs a reason and refuses owners; runs the block flow", async () => {
    const { blockAction } = await import("@/app/admin/customers/actions");
    expect(await blockAction(null, fd({ customerId: ID, reason: " " }))).toEqual({ fieldErrors: { reason: "Say why." } });
    data.getCustomerBasics.mockResolvedValueOnce({ ...target, isOwner: true });
    expect(await blockAction(null, fd({ customerId: ID, reason: "fraud" }))).toEqual({ error: "An owner account can't be blocked." });
    block.blockCustomer.mockResolvedValue({ closed: [] });
    expect(await blockAction(null, fd({ customerId: ID, reason: "fraud" }))).toEqual({ ok: "Blocked." });
    expect(block.blockCustomer).toHaveBeenCalledWith(ID, "fraud", "owner");
  });

  it("a bad id throws (stale form), a missing customer throws", async () => {
    const { unblockAction } = await import("@/app/admin/customers/actions");
    await expect(unblockAction(fd({ customerId: "nope" }))).rejects.toThrow();
    data.getCustomerBasics.mockResolvedValue(null);
    await expect(unblockAction(fd({ customerId: ID }))).rejects.toThrow();
  });

  it("resend verification respects the 60 s cooldown and logs it", async () => {
    const { resendVerifyAdminAction } = await import("@/app/admin/customers/actions");
    lastVerifySentAt.mockResolvedValue(new Date().toISOString());
    expect(await resendVerifyAdminAction(null, fd({ customerId: ID }))).toEqual({ error: expect.stringMatching(/a minute/) });
    lastVerifySentAt.mockResolvedValue(null);
    expect(await resendVerifyAdminAction(null, fd({ customerId: ID }))).toEqual({ ok: "Sent." });
    expect(sendVerifyEmail).toHaveBeenCalledWith(ID, "e@lab.edu");
    expect(data.logCustomerEvent).toHaveBeenCalledWith({ customerId: ID, kind: "verify_resent", actorId: "owner" });
  });

  it("blocking also refreshes the Disputes pages (Block customer lives on a chargeback too)", async () => {
    const { blockAction } = await import("@/app/admin/customers/actions");
    const { revalidatePath } = await import("next/cache");
    await blockAction(null, fd({ customerId: ID, reason: "chargeback" }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/disputes", "layout");
  });
});
