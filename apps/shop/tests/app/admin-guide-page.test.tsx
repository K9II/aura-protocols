import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { INQUIRY_AUTO_CLOSE_DAYS } from "@/lib/inquiries/constants";
import { PERMISSION_LABEL } from "@/lib/staff/permissions";
import { NEVER_FOR_ASSISTANT } from "@/lib/staff/roles";
import { NO_CHARGE_MAX_VIALS } from "@/lib/no-charge/rules";

const { requireStaff, getDiscountCap } = vi.hoisted(() => ({
  requireStaff: vi.fn(async () => ({ id: "o1", fullName: "Kearney Adams", isOwner: true })),
  getDiscountCap: vi.fn(async () => 35),
}));
vi.mock("@/lib/dal", () => ({ requireStaff }));
vi.mock("@/lib/discounts/data", () => ({ getDiscountCap }));
import AdminGuidePage from "@/app/admin/guide/page";

describe("/admin/guide", () => {
  beforeEach(() => { requireStaff.mockClear(); getDiscountCap.mockResolvedValue(35); });

  it("is owner-only", async () => {
    requireStaff.mockRejectedValueOnce(new Error("NEXT_NOT_FOUND"));
    await expect(AdminGuidePage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders every chapter with the live cap", async () => {
    getDiscountCap.mockResolvedValue(30);
    render(await AdminGuidePage());
    expect(requireStaff).toHaveBeenCalled();
    for (const t of ["Start here", "Today", "Discounts", "Orders", "Customers", "Disputes", "Catalog & lots", "Email", "Inquiries", "Partners", "Payouts", "Activity", "Team & the Assistant"]) expect(screen.getByRole("heading", { level: 2, name: t })).toBeInTheDocument();
    expect(screen.getAllByText(/30%/).length).toBeGreaterThan(0);
  });

  it("has the Team & the Assistant chapter, listing what's never for the Assistant from the permission list itself", async () => {
    render(await AdminGuidePage());
    const team = within(screen.getByRole("region", { name: "Team & the Assistant" }));
    for (const s of ["Common tasks", "How it works", "Watch out for"]) expect(team.getByRole("heading", { name: s })).toBeInTheDocument();
    for (const p of NEVER_FOR_ASSISTANT) expect(team.getByText(new RegExp(PERMISSION_LABEL[p].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))).toBeInTheDocument();
  });

  it("the Inquiries chapter mentions Save draft and Draft ready", async () => {
    render(await AdminGuidePage());
    const inquiries = within(screen.getByRole("region", { name: "Inquiries" }));
    expect(inquiries.getByText("Save draft", { exact: false })).toBeInTheDocument();
    expect(inquiries.getByText("Draft ready", { exact: false })).toBeInTheDocument();
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

  it("the Orders chapter explains no-charge orders, with the vial cap from the constant", async () => {
    const { container } = render(await AdminGuidePage());
    const ch = container.querySelector("#orders") as HTMLElement;
    expect(within(ch).getByText("Send vials at no charge")).toBeInTheDocument();
    for (const ui of ["New no-charge order", "Seeding", "Replacement", "Sample", "Other", "Create order", "No charge", "Cancel order"]) {
      expect(within(ch).getAllByText(ui, { selector: ".a-ui" }).length).toBeGreaterThan(0);
    }
    expect(within(ch).getByText("No-charge orders")).toBeInTheDocument();
    expect(ch).toHaveTextContent(/doesn.t use the customer.s first-order offer/);
    expect(ch).toHaveTextContent(`${NO_CHARGE_MAX_VIALS} vials per item`);
  });
});
