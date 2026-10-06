import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const audit = vi.hoisted(() => ({ logAdminEvent: vi.fn(), recordAdminEvent: vi.fn() }));
const markPayoutPaid = vi.fn();
const partnerEmail = vi.fn();
const markW9Checked = vi.fn();
const getPartnerById = vi.fn();
const w9SignedUrl = vi.fn();
const sendOrAlert = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/partners/ledger", () => ({ markPayoutPaid }));
vi.mock("@/lib/partners/data", () => ({ partnerEmail, markW9Checked, getPartnerById, w9SignedUrl }));
vi.mock("@/lib/notify", () => ({ sendOrAlert }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "22222222-2222-4222-8222-222222222222";

describe("payout admin actions", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requireOwner, markPayoutPaid, partnerEmail, markW9Checked, getPartnerById, w9SignedUrl, sendOrAlert]) f.mockReset(); requireOwner.mockResolvedValue({ id: "owner" }); });

  it("marks a queued payout paid with its reference and emails the partner", async () => {
    markPayoutPaid.mockResolvedValue({ id, cash_cents: 21240, reference: "ACH-4471", partners: { customer_id: "u2", code: "BENCHNOTES" } });
    partnerEmail.mockResolvedValue("bn@example.com");
    const { markPayoutPaidAction } = await import("@/app/admin/payouts/actions");
    await markPayoutPaidAction(fd({ payoutId: id, reference: " ACH-4471 " }));
    expect(markPayoutPaid).toHaveBeenCalledWith(id, "ACH-4471");
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "bn@example.com", subject: "Aura payout sent — $212.40" });
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "payouts", action: "payout_paid", targetId: id, label: "BENCHNOTES", detail: "$212.40 · ref ACH-4471", actorId: "owner" });
  });

  it("requires a reference and the owner", async () => {
    const { markPayoutPaidAction } = await import("@/app/admin/payouts/actions");
    await markPayoutPaidAction(fd({ payoutId: id, reference: "" }));
    expect(markPayoutPaid).not.toHaveBeenCalled();
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(markPayoutPaidAction(fd({ payoutId: id, reference: "x1" }))).rejects.toThrow("NOT_FOUND");
  });

  it("opens a W-9 through a short-lived link and marks it checked", async () => {
    getPartnerById.mockResolvedValue({ id, w9_path: `${id}/1.pdf` });
    w9SignedUrl.mockResolvedValue("https://store.example/w9?token=t");
    const { openW9Action, markW9CheckedAction } = await import("@/app/admin/payouts/actions");
    await expect(openW9Action(fd({ partnerId: id }))).rejects.toThrow("REDIRECT:https://store.example/w9?token=t");
    await markW9CheckedAction(fd({ partnerId: id }));
    expect(markW9Checked).toHaveBeenCalledWith(id);
    expect(audit.logAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "w9_opened", targetId: id, actorId: "owner" }));
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ action: "w9_checked", targetId: id, actorId: "owner" }));
  });

  it("refuses to open a W-9 when the access can't be logged", async () => {
    getPartnerById.mockResolvedValue({ id, w9_path: `${id}/1.pdf` });
    audit.logAdminEvent.mockRejectedValueOnce(new Error("admin event insert failed"));
    const { openW9Action } = await import("@/app/admin/payouts/actions");
    await expect(openW9Action(fd({ partnerId: id }))).rejects.toThrow("admin event insert failed");
    expect(w9SignedUrl).not.toHaveBeenCalled();
  });
});
