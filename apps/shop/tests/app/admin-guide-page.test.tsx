import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { INQUIRY_AUTO_CLOSE_DAYS } from "@/lib/inquiries/constants";

const { requireOwner, getDiscountCap } = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "o1", fullName: "Kearney Adams", isOwner: true })),
  getDiscountCap: vi.fn(async () => 35),
}));
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/discounts/data", () => ({ getDiscountCap }));
import AdminGuidePage from "@/app/admin/guide/page";

describe("/admin/guide", () => {
  beforeEach(() => { requireOwner.mockClear(); getDiscountCap.mockResolvedValue(35); });

  it("is owner-only", async () => {
    requireOwner.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(AdminGuidePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders every chapter with the live cap", async () => {
    getDiscountCap.mockResolvedValue(30);
    render(await AdminGuidePage());
    expect(requireOwner).toHaveBeenCalled();
    for (const t of ["Start here", "Today", "Discounts", "Orders", "Customers", "Disputes", "Catalog & lots", "Email", "Inquiries", "Partners", "Payouts"]) expect(screen.getByRole("heading", { level: 2, name: t })).toBeInTheDocument();
    expect(screen.getAllByText(/30%/).length).toBeGreaterThan(0);
  });

  it("has the Email chapter with figures from constants", async () => {
    render(await AdminGuidePage());
    const email = within(screen.getByRole("region", { name: "Email" }));
    expect(screen.getByRole("heading", { name: "Email" })).toBeInTheDocument();
    expect(email.getByText(/7 days/)).toBeInTheDocument();          // ATTRIBUTION_DAYS (scoped: Activity's "7 days" button label also matches /7 days/)
    expect(email.getAllByText(/5%/).length).toBeGreaterThan(0);     // BOUNCE_LIMIT_PCT
    expect(email.getAllByText(/0.1%/).length).toBeGreaterThan(0);   // COMPLAINT_LIMIT_PCT
  });

  it("has the Inquiries chapter with figures from constants", async () => {
    render(await AdminGuidePage());
    expect(screen.getByRole("heading", { level: 2, name: "Inquiries" })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`${INQUIRY_AUTO_CLOSE_DAYS} days`)).length).toBeGreaterThan(0); // INQUIRY_AUTO_CLOSE_DAYS
    expect(screen.getByText(/one IP address can send/)).toBeInTheDocument();
  });

  it("has the Today chapter with figures from constants", async () => {
    render(await AdminGuidePage());
    expect(screen.getByRole("heading", { level: 2, name: "Today" })).toBeInTheDocument();
    expect(screen.getAllByText(/more than 2 business days/).length).toBeGreaterThan(0); // SHIP_LATE_BUSINESS_DAYS
    expect(screen.getAllByText(/the last 90 days/).length).toBeGreaterThan(0);          // ALERTS_KEEP_DAYS
    expect(screen.getAllByText(/2\.5%/).length).toBeGreaterThan(0);                     // BOUNCE_LIMIT_PCT × RATE_TODO_SHARE
    expect(screen.getAllByText(/waited 1 business day/).length).toBeGreaterThan(0);     // INQUIRY_LATE_BUSINESS_DAYS
  });

  it("has the Disputes chapter with figures from constants", async () => {
    render(await AdminGuidePage());
    expect(screen.getByRole("heading", { level: 2, name: "Disputes" })).toBeInTheDocument();
    expect(screen.getAllByText(/3 days or less to go/).length).toBeGreaterThan(0);           // DISPUTE_DUE_SOON_DAYS
    expect(screen.getAllByText(/3 days and 1 day before it/).length).toBeGreaterThan(0);    // DISPUTE_REMIND_DAYS
    expect(screen.getAllByText(/consider 0\.75% excessive/).length).toBeGreaterThan(0);    // DISPUTE_RATE_REVIEW_PCT
    expect(screen.getAllByText(/within 60 to 75 days/).length).toBeGreaterThan(0);          // BANK_DECISION_DAYS
    expect(screen.getAllByText(/\$15\.00/).length).toBeGreaterThan(0);                       // DISPUTE_FEE_CENTS
  });
});
