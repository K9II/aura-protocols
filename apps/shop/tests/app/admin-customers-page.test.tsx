import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { requirePermission, listCustomers, customerStats, customersWithDisputes } = vi.hoisted(() => ({
  requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), listCustomers: vi.fn(), customerStats: vi.fn(), customersWithDisputes: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/customers/data", () => ({ listCustomers, customerStats, PAGE_SIZE: 50 }));
vi.mock("@/lib/disputes/data", () => ({ customersWithDisputes }));
import CustomersPage from "@/app/admin/customers/page";

const row = { id: "u1", email: "e@lab.edu", fullName: "Elena Novak", organization: "Novak Lab", isOwner: false, isPartner: true, createdAt: "2026-09-30T20:00:00Z", verified: true, blocked: false, paidOrders: 3, spentCents: 231_640, lastOrderAt: "2026-10-03T20:00:00Z", creditCents: 12_000 };
const stats = { total: 1284, new_30d: 212, new_prior_30d: 194, ordered: 486, repeat: 141, unverified: 23, blocked: 2, credit_cents: 394_000, credit_accounts: 37 };

describe("/admin/customers", () => {
  beforeEach(() => { listCustomers.mockResolvedValue({ rows: [row], total: 1 }); customerStats.mockResolvedValue(stats); customersWithDisputes.mockResolvedValue(new Set()); });

  it("is owner-only", async () => {
    requirePermission.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(CustomersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });

  it("passes cleaned search, tab and page to the list", async () => {
    await CustomersPage({ searchParams: Promise.resolve({ q: " 50%x ", tab: "blocked", page: "3" }) });
    expect(listCustomers).toHaveBeenCalledWith({ q: "50x", tab: "blocked", page: 3 });
  });

  it("renders tiles, tabs and the row", async () => {
    render(await CustomersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Customers" })).toBeInTheDocument();
    expect(screen.getAllByText("1,284").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Blocked/ })).toHaveAttribute("href", "/admin/customers?tab=blocked");
    expect(screen.getAllByRole("link", { name: "Elena Novak" })[0]).toHaveAttribute("href", "/admin/customers/u1");
    expect(screen.getAllByText("$2,316.40").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partner").length).toBeGreaterThan(0);
  });

  it("tags customers with a chargeback on any order", async () => {
    customersWithDisputes.mockResolvedValue(new Set(["u1"]));
    render(await CustomersPage({ searchParams: Promise.resolve({}) }));
    expect(customersWithDisputes).toHaveBeenCalledWith(["u1"]);
    expect(screen.getAllByText("Chargeback").length).toBeGreaterThan(0);
  });
});
