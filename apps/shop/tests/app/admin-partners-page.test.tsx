import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), countPartners: vi.fn(), listPartners: vi.fn(), payableByPartner: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/partners/data", () => ({ countPartners: m.countPartners, listPartners: m.listPartners }));
vi.mock("@/lib/partners/ledger", () => ({ payableByPartner: m.payableByPartner }));
vi.mock("@/app/admin/partners/actions", () => ({ setPartnerStatusAction: vi.fn() }));
import PartnersPage from "@/app/admin/partners/page";

const base = { id: "p1", code: "QUINN10", partner_type: "video_creator", tier_pct: 15, lifetime_cents: 1_642_000, payout_pref: "split", split_cash_pct: 50, payout_method: "ach", w9_path: "x", w9_checked_at: "2026-08-15T00:00:00Z", created_at: "2026-08-10T00:00:00Z", customers: { full_name: "Avery Quinn", organization: null }, application: { channels: { youtube: "@averyquinnlab" }, audienceSize: "10k_50k", promotion: "Lot-testing videos." } };

describe("/admin/partners", () => {
  beforeEach(() => {
    m.payableByPartner.mockClear();
    m.countPartners.mockResolvedValue({ applied: 2, approved: 6, suspended: 1, declined: 3 });
    m.payableByPartner.mockResolvedValue({ p1: 31_260 });
  });

  it("is owner-only", async () => {
    m.requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(PartnersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });

  it("lists active partners with payable and W-9, linking each to its page", async () => {
    m.listPartners.mockResolvedValue([{ ...base, status: "approved" }]);
    render(await PartnersPage({ searchParams: Promise.resolve({ tab: "approved" }) }));
    expect(m.listPartners).toHaveBeenCalledWith("approved");
    expect(screen.getAllByRole("link", { name: /Avery Quinn/ })[0]).toHaveAttribute("href", "/admin/partners/p1");
    expect(screen.getAllByText("$312.60").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Checked").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: "Suspend", hidden: true })).toEqual([]);
  });

  it("shows applications with confirm-guarded Approve and Decline", async () => {
    m.listPartners.mockResolvedValue([{ ...base, status: "applied", code: "RCHEN", customers: { full_name: "Riley Chen", organization: null } }]);
    render(await PartnersPage({ searchParams: Promise.resolve({}) }));
    expect(m.listPartners).toHaveBeenCalledWith("applied");
    expect(screen.getAllByRole("button", { name: "Approve", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Decline", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Code RCHEN starts working now/).length).toBeGreaterThan(0);
    expect(m.payableByPartner).not.toHaveBeenCalled();
  });
});
