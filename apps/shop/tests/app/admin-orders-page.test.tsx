import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({
  requireOwner: vi.fn(async () => ({ id: "owner" })), searchOrdersForOwner: vi.fn(), countOrderTabs: vi.fn(), orderFlags: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ requireOwner: m.requireOwner }));
vi.mock("@/lib/orders", () => ({ searchOrdersForOwner: m.searchOrdersForOwner, countOrderTabs: m.countOrderTabs }));
vi.mock("@/lib/disputes/data", () => ({ orderFlags: m.orderFlags }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T18:00:00Z") }));
vi.mock("@/components/admin/orders/ShipDialog", () => ({ default: ({ orderNumber }: { orderNumber: string }) => <button>Ship {orderNumber}</button> }));
import OrdersPage from "@/app/admin/orders/page";

const row = {
  id: "o1", order_number: "AP-1031", status: "paid", email: "dana.w@example.com", ship_name: "Dana Whitfield", ship_city: "Tucson", ship_state: "AZ",
  total_cents: 26_800, paid_at: "2026-10-01T15:12:00Z", created_at: "2026-10-01T15:10:00Z", discount_code_id: null, partner_id: "p1",
  order_items: [{ id: "i1", pack_qty: 5, quantity: 1 }, { id: "i2", pack_qty: 1, quantity: 1 }],
};
const counts = { to_ship: 5, processing: 1, shipped: 184, closed: 9, all: 199 };

describe("/admin/orders", () => {
  beforeEach(() => {
    m.searchOrdersForOwner.mockResolvedValue({ rows: [row], total: 1 });
    m.countOrderTabs.mockResolvedValue(counts);
    m.orderFlags.mockResolvedValue({ disputes: new Set(), warnings: new Set(["o1"]) });
  });

  it("is owner-only", async () => {
    m.requireOwner.mockRejectedValueOnce(new Error("NOT_FOUND"));
    await expect(OrdersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });

  it("defaults to To ship and maps old ?status= links", async () => {
    await OrdersPage({ searchParams: Promise.resolve({}) });
    expect(m.searchOrdersForOwner).toHaveBeenLastCalledWith({ tab: "to_ship", q: "", page: 1 });
    await OrdersPage({ searchParams: Promise.resolve({ status: "refunded" }) });
    expect(m.searchOrdersForOwner).toHaveBeenLastCalledWith({ tab: "closed", q: "", page: 1 });
  });

  it("renders tabs with counts, the row, markers, waiting time and Ship", async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shipped\s*184/ })).toHaveAttribute("href", "/admin/orders?tab=shipped");
    expect(screen.getAllByRole("link", { name: "AP-1031" })[0]).toHaveAttribute("href", "/admin/orders/AP-1031");
    expect(screen.getAllByText("Warning").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 items · 6 vials").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/bus\. days · late/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Ship AP-1031" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Pick list" })[0]).toHaveAttribute("href", "/admin/orders/AP-1031/pick");
  });

  it("searches across all orders and offers Clear", async () => {
    render(await OrdersPage({ searchParams: Promise.resolve({ q: " whitfield ", tab: "shipped" }) }));
    expect(m.searchOrdersForOwner).toHaveBeenLastCalledWith({ tab: "shipped", q: "whitfield", page: 1 });
    expect(screen.getByText(/1 result for/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/admin/orders?tab=shipped");
  });

  it("pages with Previous / Next", async () => {
    m.searchOrdersForOwner.mockResolvedValue({ rows: [row], total: 120 });
    render(await OrdersPage({ searchParams: Promise.resolve({ tab: "all", page: "2" }) }));
    expect(screen.getByText(/51–100 of 120/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/admin/orders?tab=all");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/admin/orders?tab=all&page=3");
  });

  it("shows an empty state", async () => {
    m.searchOrdersForOwner.mockResolvedValue({ rows: [], total: 0 });
    render(await OrdersPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("Nothing to ship.")).toBeInTheDocument();
  });
});
