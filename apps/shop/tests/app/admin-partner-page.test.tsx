import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requireOwner: vi.fn(async () => ({ id: "owner" })), getPartnerDetail: vi.fn(), getPayoutDetails: vi.fn(), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/partners/detail", () => ({ getPartnerDetail: m.getPartnerDetail, PARTNER_LINES_PAGE: 50 }));
vi.mock("@/lib/partners/data", () => ({ getPayoutDetails: m.getPayoutDetails }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({}) }));  // formatRunDate comes from the real ledger module
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T18:00:00Z") }));
vi.mock("@/app/admin/partners/actions", () => ({ setPartnerStatusAction: vi.fn() }));
vi.mock("@/app/admin/payouts/actions", () => ({ openW9Action: vi.fn(), markW9CheckedAction: vi.fn() }));
import PartnerPage from "@/app/admin/partners/[id]/page";

const id = "11111111-1111-4111-8111-111111111111";
const partner = { id, code: "QUINN10", status: "approved", partner_type: "video_creator", tier_pct: 15, lifetime_cents: 1_642_000, payout_pref: "split", split_cash_pct: 50, payout_method: "ach", payout_details_hint: "ACH ••••4471", cash_carry_cents: 0, w9_path: "w9/p1.pdf", w9_uploaded_at: "2026-08-14T00:00:00Z", w9_checked_at: null, approved_at: "2026-08-12T00:00:00Z", created_at: "2026-08-10T00:00:00Z", customers: { full_name: "Avery Quinn", organization: null }, application: { channels: { youtube: "@averyquinnlab" }, audienceSize: "10k_50k", promotion: "Lot-testing videos." } };
const detail = {
  partner, clicks30: 1284, orders: 37, payableCents: 31_260, unpaidCents: 54_000, creditIssuedCents: 40_638, capped: false, totalLines: 2,
  lines: [
    { kind: "commission", id: "k1", orderNumber: "AP-1029", at: "2026-09-30T20:51:00Z", baseCents: 38_047, ratePct: 15, amountCents: 5_707, state: "clearing", clearsAt: "2026-10-16T21:02:00Z" },
    { kind: "adjustment", id: "a1", orderNumber: "AP-1018", at: "2026-09-28T10:00:00Z", amountCents: -3_375, reason: "chargeback" },
  ],
  payouts: [{ id: "y1", run_date: "2026-10-01", cash_cents: 14_820, credit_cents: 19_266, status: "paid", reference: "ACH-77120", paid_at: "2026-10-02T15:00:00Z" }],
};

describe("/admin/partners/[id]", () => {
  beforeEach(() => { m.getPartnerDetail.mockResolvedValue(detail); m.getPayoutDetails.mockResolvedValue({ kind: "ach", routing: "123456789", account: "0004471", bank: "First Lab Bank" }); });

  it("404s a bad id without a query", async () => {
    await expect(PartnerPage({ params: Promise.resolve({ id: "x" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.getPartnerDetail).not.toHaveBeenCalled();
  });

  it("renders KPIs, commissions with an adjustment, payouts, W-9 and Suspend with the forfeit amount", async () => {
    render(await PartnerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: /Avery Quinn/ })).toBeInTheDocument();
    expect(screen.getAllByText("1,284").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "AP-1029" })[0]).toHaveAttribute("href", "/admin/orders/AP-1029");
    expect(screen.getAllByText("−$33.75").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clearing/).length).toBeGreaterThan(0);
    expect(screen.getByText("ACH-77120")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Suspend", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$540\.00 unpaid commission is forfeited/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open W-9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark checked" })).toBeInTheDocument();
  });

  it("offers Approve / Decline for an applicant", async () => {
    m.getPartnerDetail.mockResolvedValue({ ...detail, partner: { ...partner, status: "applied" } });
    render(await PartnerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("button", { name: "Approve", hidden: true }).length).toBeGreaterThan(0);
  });

  it("offers Reinstate for a suspended partner", async () => {
    m.getPartnerDetail.mockResolvedValue({ ...detail, partner: { ...partner, status: "suspended" } });
    render(await PartnerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole("button", { name: "Reinstate", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: "Suspend", hidden: true })).toEqual([]);
  });

  it("renders a line with no order as plain text, not a link to /admin/orders/—", async () => {
    m.getPartnerDetail.mockResolvedValue({ ...detail, lines: [
      { kind: "adjustment", id: "a2", orderNumber: "—", at: "2026-09-20T10:00:00Z", amountCents: -500, reason: "owner note" },
    ] });
    render(await PartnerPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "—" })).toBeNull();
  });
});
