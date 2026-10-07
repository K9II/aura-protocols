import { describe, it, expect, vi, beforeEach } from "vitest";

const requireOwner = vi.fn();
const audit = vi.hoisted(() => ({ logAdminEvent: vi.fn(), recordAdminEvent: vi.fn() }));
const getPartnerById = vi.fn();
const setPartnerStatus = vi.fn();
const partnerEmail = vi.fn();
const forfeitUnpaid = vi.fn();
const sendOrAlert = vi.fn();
const revalidatePath = vi.fn();
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/partners/data", () => ({ getPartnerById, setPartnerStatus, partnerEmail }));
vi.mock("@/lib/partners/ledger", () => ({ forfeitUnpaid }));
vi.mock("@/lib/notify", () => ({ sendOrAlert }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("next/cache", () => ({ revalidatePath }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "11111111-1111-4111-8111-111111111111";

describe("partner admin actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requireOwner, getPartnerById, setPartnerStatus, partnerEmail, forfeitUnpaid, sendOrAlert, revalidatePath]) f.mockReset();
    requireOwner.mockResolvedValue({ id: "owner" });
    setPartnerStatus.mockResolvedValue(true);
    partnerEmail.mockResolvedValue("sam@smithlab.org");
  });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValue(new Error("NOT_FOUND"));
    const { setPartnerStatusAction } = await import("@/app/admin/partners/actions");
    await expect(setPartnerStatusAction(fd({ partnerId: id, to: "approved" }))).rejects.toThrow("NOT_FOUND");
    expect(setPartnerStatus).not.toHaveBeenCalled();
  });

  it("approving emails the partner their code and link", async () => {
    getPartnerById.mockResolvedValue({ id, status: "applied", code: "SMITHLAB", customer_id: "u1" });
    const { setPartnerStatusAction } = await import("@/app/admin/partners/actions");
    await setPartnerStatusAction(fd({ partnerId: id, to: "approved" }));
    expect(setPartnerStatus).toHaveBeenCalledWith(id, "applied", "approved");
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "sam@smithlab.org", subject: "Your Aura partner code SMITHLAB is active" });
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "partners", action: "partner_approved", targetId: id, label: "SMITHLAB", actorId: "owner" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/" + id);
  });

  it("suspending forfeits unpaid commission; declining sends a short email", async () => {
    getPartnerById.mockResolvedValue({ id, status: "approved", code: "SMITHLAB", customer_id: "u1" });
    const { setPartnerStatusAction } = await import("@/app/admin/partners/actions");
    await setPartnerStatusAction(fd({ partnerId: id, to: "suspended" }));
    expect(forfeitUnpaid).toHaveBeenCalledWith(id);
    getPartnerById.mockResolvedValue({ id, status: "applied", code: "SMITHLAB", customer_id: "u1" });
    await setPartnerStatusAction(fd({ partnerId: id, to: "declined" }));
    expect(sendOrAlert.mock.calls.at(-1)?.[0]).toMatchObject({ subject: "Your Aura partner application" });
  });

  it("ignores illegal moves", async () => {
    getPartnerById.mockResolvedValue({ id, status: "declined", code: "X1X", customer_id: "u1" });
    const { setPartnerStatusAction } = await import("@/app/admin/partners/actions");
    await setPartnerStatusAction(fd({ partnerId: id, to: "approved" }));
    expect(setPartnerStatus).not.toHaveBeenCalled();
  });
});
