import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { requirePermission, getCustomerDetail, customersWithDisputes, readStaffRow } = vi.hoisted(() => ({ requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), getCustomerDetail: vi.fn(), customersWithDisputes: vi.fn(), readStaffRow: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/customers/data", () => ({ getCustomerDetail }));
vi.mock("@/lib/disputes/data", () => ({ customersWithDisputes }));
vi.mock("@/lib/staff/data", () => ({ readStaffRow }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/app/admin/customers/actions", () => ({ setCustomerWholesaleAction: vi.fn(), adjustCreditAction: vi.fn(), blockAction: vi.fn(), unblockAction: vi.fn(), resendVerifyAdminAction: vi.fn() }));
vi.mock("@/app/admin/wholesale/actions", () => ({ markWholesaleReviewedAction: vi.fn() }));
import CustomerPage from "@/app/admin/customers/[id]/page";

const ID = "3f1e2d4c-5b6a-4789-8abc-def012345678";
const detail = {
  id: ID, email: "e@lab.edu", fullName: "Elena Novak", organization: "Novak Lab", isOwner: false, createdAt: "2026-09-30T20:07:00Z",
  verifiedAt: "2026-09-30T20:09:00Z", verifySentAt: null, marketingOptIn: true, blockedAt: null, blockedReason: null,
  ship: { name: "Elena Novak", line1: "1550 Linden Dr", line2: null, city: "Madison", state: "WI", zip: "53706" },
  orders: [
    { id: "o2", order_number: "AP-1090", status: "awaiting_payment", created_at: "2026-10-03T20:00:00Z", total_cents: 49_995, store_credit_cents: 0, new_account_discount: false, partner_id: null, attributed_by: null, order_items: [{ quantity: 1 }] },
    { id: "o1", order_number: "AP-1041", status: "shipped", created_at: "2026-09-30T21:00:00Z", total_cents: 61_230, store_credit_cents: 0, new_account_discount: true, partner_id: null, attributed_by: null, order_items: [{ quantity: 1 }, { quantity: 1 }] },
  ],
  agreements: [{ id: "a1", terms_version: "2026-10-01", age_21: true, ruo: true, dispute_policy: true, ip_hash: "3f9a1c07ff", user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/129.0 Safari/537.36", agreed_at: "2026-09-30T20:07:22Z" }],
  attestations: [], ledger: [{ id: "l1", amount_cents: 15_000, reason: "owner_adjust", ref_id: "e1", note: "late shipment", created_at: "2026-10-02T22:12:00Z" }],
  events: [{ id: "e1", kind: "credit_added", amount_cents: 15_000, reason: "goodwill", note: "late shipment", actor_id: "owner", created_at: "2026-10-02T22:12:00Z", actorName: "Kearney" }],
  isPartner: false, referrer: null, blockedBy: null,
  wholesale: { enabledAt: null, disabledAt: null, disabledReason: null, terms: null, reviewedAt: null, reviewedBy: null },
};

describe("/admin/customers/[id]", () => {
  beforeEach(() => { getCustomerDetail.mockResolvedValue(detail); customersWithDisputes.mockResolvedValue(new Set()); readStaffRow.mockReset(); readStaffRow.mockResolvedValue(null); });

  it("404s a bad id or a missing customer", async () => {
    await expect(CustomerPage({ params: Promise.resolve({ id: "nope" }) })).rejects.toThrow("NOT_FOUND");
    getCustomerDetail.mockResolvedValueOnce(null);
    await expect(CustomerPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow("NOT_FOUND");
  });

  it("shows the customer's research verification", async () => {
    getCustomerDetail.mockResolvedValueOnce({ ...detail, research: { field: "pharmacology", org: "Novak Lab", verifiedAt: "2026-10-07T15:00:00Z" } });
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByText(/Research: Pharmacology · Novak Lab · verified/)).toBeInTheDocument();
  });

  it("renders totals from paid orders only, the agreement record, ledger and actions", async () => {
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByRole("heading", { level: 1, name: /Elena Novak/ })).toBeInTheDocument();
    expect(screen.getAllByText("$612.30").length).toBeGreaterThan(0); // spent = AP-1041 only
    expect(screen.getByText("Chrome on macOS")).toBeInTheDocument();
    expect(screen.getByText("3f9a1c07")).toBeInTheDocument();
    expect(screen.getByText(/Used on/)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "AP-1041" })[0]).toHaveAttribute("href", "/admin/orders/AP-1041");
    expect(screen.getByRole("button", { name: "Block" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend verification" })).toBeNull(); // verified
  });

  it("names a refund's card part given as store credit", async () => {
    getCustomerDetail.mockResolvedValueOnce({ ...detail, ledger: [{ id: "l2", amount_cents: 18_800, reason: "refund_to_credit", ref_id: "o1", note: "Refund (card part) as store credit", created_at: "2026-10-03T22:12:00Z" }] });
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByText("Refund (card part) to credit — AP-1041")).toBeInTheDocument();
  });

  it("blocked: banner with Unblock, no Block button; owners get no Block either", async () => {
    getCustomerDetail.mockResolvedValueOnce({ ...detail, blockedAt: "2026-10-04T16:31:00Z", blockedReason: "two chargebacks", blockedBy: "Kearney" });
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByText(/two chargebacks/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();
  });

  it("tags the customer when any of their orders has a chargeback", async () => {
    customersWithDisputes.mockResolvedValue(new Set([ID]));
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(customersWithDisputes).toHaveBeenCalledWith([ID]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Chargeback");
  });

  it("hides Block for a team login — disable it on the Team page instead", async () => {
    readStaffRow.mockResolvedValue({ role: "assistant", status: "active" });
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(readStaffRow).toHaveBeenCalledWith(ID);
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();
  });

  it("hides Adjust credit, Block and Resend verification for the Assistant", async () => {
    requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    getCustomerDetail.mockResolvedValueOnce({ ...detail, verifiedAt: null });
    render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.queryByRole("button", { name: "Adjust credit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Block" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Resend verification" })).toBeNull();
  });

  it("counts sales and no-charge orders apart (no-charge never in Paid orders, Spent or Average)", async () => {
    getCustomerDetail.mockResolvedValueOnce({ ...detail, orders: [
      { id: "o3", order_number: "AP-1061", status: "paid", kind: "no_charge", created_at: "2026-10-06T16:22:00Z", total_cents: 0, store_credit_cents: 0, new_account_discount: false, partner_id: null, attributed_by: null, order_items: [{ quantity: 3 }] },
      { id: "o4", order_number: "AP-1060", status: "refunded", kind: "no_charge", created_at: "2026-10-05T16:22:00Z", total_cents: 0, store_credit_cents: 0, new_account_discount: false, partner_id: null, attributed_by: null, order_items: [{ quantity: 1 }] },
      ...detail.orders.map((o) => ({ ...o, kind: "sale" })),
    ] });
    const { container } = render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    const kpi = screen.getByText("Paid orders").closest(".a-kpi") as HTMLElement;
    expect(kpi).toHaveTextContent(/^Paid orders\s*1\s*1 no-charge$/);
    expect(screen.getByText("Average order").closest(".a-kpi")).toHaveTextContent("$612.30");
    expect(container.querySelectorAll(".a-mk.amb")).toHaveLength(2);
    expect(screen.getByText("Cancelled (no charge)")).toBeInTheDocument();
  });

  it("wholesale card: on since + terms, and the owner can turn it off", async () => {
    getCustomerDetail.mockResolvedValue({ ...detail, wholesale: { enabledAt: "2026-10-09T16:14:00Z", disabledAt: null, disabledReason: null, terms: { version: "2026-10-08", at: "2026-10-09T16:14:00Z" }, reviewedAt: null, reviewedBy: null } });
    const { default: Page } = await import("@/app/admin/customers/[id]/page");
    const { container } = render(await Page({ params: Promise.resolve({ id: detail.id }) }));
    expect(container.textContent).toMatch(/On since Oct 9/);
    expect(container.textContent).toMatch(/2026-10-08 · accepted/);
    expect(screen.getByRole("button", { name: "Turn off wholesale…" })).toBeTruthy();
  });

  it("wholesale card: not reviewed yet with Reviewed for the owner", async () => {
    getCustomerDetail.mockResolvedValue({ ...detail, wholesale: { enabledAt: "2026-10-09T16:14:00Z", disabledAt: null, disabledReason: null, terms: null, reviewedAt: null, reviewedBy: null } });
    const { container } = render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(container.textContent).toMatch(/Not reviewed yet/);
    expect(screen.getByRole("button", { name: `Mark ${detail.fullName} reviewed` })).toBeTruthy();
  });

  it("wholesale card: turned off and never reviewed — Not reviewed yet, no Reviewed button", async () => {
    getCustomerDetail.mockResolvedValue({ ...detail, wholesale: { enabledAt: "2026-10-09T16:14:00Z", disabledAt: "2026-10-10T16:00:00Z", disabledReason: "Reseller", terms: null, reviewedAt: null, reviewedBy: null } });
    const { container } = render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(container.textContent).toMatch(/Not reviewed yet/);
    expect(screen.queryByRole("button", { name: /reviewed$/ })).toBeNull();
  });

  it("wholesale card: reviewed shows the date and who, with no Reviewed button", async () => {
    getCustomerDetail.mockResolvedValue({ ...detail, wholesale: { enabledAt: "2026-10-09T16:14:00Z", disabledAt: null, disabledReason: null, terms: null, reviewedAt: "2026-10-12T17:00:00Z", reviewedBy: "Alvester" } });
    const { container } = render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(container.textContent).toMatch(/Oct 12 by Alvester/);
    expect(screen.queryByRole("button", { name: /reviewed$/i })).toBeNull();
  });

  it("wholesale card: the Assistant sees 'Not reviewed yet' but no Reviewed button", async () => {
    requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    getCustomerDetail.mockResolvedValueOnce({ ...detail, wholesale: { enabledAt: "2026-10-09T16:14:00Z", disabledAt: null, disabledReason: null, terms: null, reviewedAt: null, reviewedBy: null } });
    const { container } = render(await CustomerPage({ params: Promise.resolve({ id: ID }) }));
    expect(container.textContent).toMatch(/Not reviewed yet/);
    expect(screen.queryByRole("button", { name: /reviewed$/i })).toBeNull();
  });
});
