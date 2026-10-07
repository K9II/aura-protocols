import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), getOrderDetail: vi.fn(), customersWithDisputes: vi.fn(async () => new Set<string>()), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/orders/detail", () => ({ getOrderDetail: m.getOrderDetail }));
vi.mock("@/lib/disputes/data", () => ({ customersWithDisputes: m.customersWithDisputes }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/app/admin/orders/actions", () => ({ refundCreditOrderAction: vi.fn() }));
vi.mock("@/components/admin/orders/ShipDialog", () => ({ default: () => <button>Ship</button> }));
import OrderPage from "@/app/admin/orders/[number]/page";

const order = {
  id: "o1", order_number: "AP-1029", status: "shipped", customer_id: "c1", email: "praman@example.org",
  ship_name: "Priya Raman", ship_line1: "2290 Larimer St", ship_line2: "Apt 4B", ship_city: "Denver", ship_state: "CO", ship_zip: "80205",
  subtotal_cents: 44_500, partner_discount_cents: 6_453, code_discount_cents: 2_003, shipping_cents: 0, insurance_cents: 550, tax_cents: 2_842, total_cents: 41_439,
  store_credit_cents: 0, new_account_discount: false, partner_id: "p1", discount_code_id: "dc1", attributed_by: "code",
  stripe_payment_intent: "pi_123", stripe_session_id: "cs_1", carrier: "usps", tracking_number: "9400111899223344550112",
  created_at: "2026-09-30T20:48:00Z", paid_at: "2026-09-30T20:51:00Z", shipped_at: "2026-10-01T21:02:00Z", ruo_confirmed_at: "2026-09-30T20:48:00Z",
  order_items: [{ id: "i1", compound_name: "BPC-157", strength: "10 mg", pack_qty: 5, quantity: 1, unit_price_cents: 22_500, line_total_cents: 22_500, lot_number: "BPC-2609-A" }],
};
const detail = {
  order, lots: new Map([["i1", { allocated: [{ lotNumber: "BPC-2609-A", qty: 5 }], shipped: [{ lotNumber: "BPC-2609-A", qty: 5 }] }]]),
  customer: { id: "c1", fullName: "Priya Raman", email: "praman@example.org", verified: true, blocked: false, paidOrders: 4, spentCents: 160_280 },
  code: { id: "dc1", code: "SPRING20", kind: "order_pct", value: 5, stack_on_top: true, free_shipping: false },
  partner: { id: "p1", code: "QUINN10" }, commission: null, flags: { dispute: false, warning: false },
  timeline: [{ key: "shipped", at: "2026-10-01T21:02:00Z", tone: "ok", title: "Shipped · USPS 9400111899223344550112", who: "Alvester Adams" }],
};

describe("/admin/orders/[number]", () => {
  beforeEach(() => { m.getOrderDetail.mockResolvedValue(detail); m.customersWithDisputes.mockResolvedValue(new Set<string>()); delete process.env.STRIPE_SECRET_KEY; });

  it("rejects a malformed number without a query", async () => {
    await expect(OrderPage({ params: Promise.resolve({ number: "../x" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.getOrderDetail).not.toHaveBeenCalled();
  });

  it("404s an unknown order", async () => {
    m.getOrderDetail.mockResolvedValue(null);
    await expect(OrderPage({ params: Promise.resolve({ number: "AP-9" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders items with lots, money, timeline and side cards", async () => {
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.getByRole("heading", { level: 1, name: /AP-1029/ })).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getByText("Partner discount")).toBeInTheDocument();
    expect(screen.getByText("−$44.50")).toBeInTheDocument();
    expect(screen.getByText("Charged")).toBeInTheDocument();
    expect(screen.getByText(/Shipped · USPS/)).toBeInTheDocument();
    expect(screen.getByText(/by Alvester Adams/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Priya Raman" })).toHaveAttribute("href", "/admin/customers/c1");
    expect(screen.getByRole("link", { name: "SPRING20" })).toHaveAttribute("href", "/admin/discounts/dc1");
    expect(screen.getByRole("link", { name: "QUINN10" })).toHaveAttribute("href", "/admin/partners/p1");
    expect(screen.getByRole("link", { name: /Open in Stripe/ })).toHaveAttribute("href", "https://dashboard.stripe.com/test/payments/pi_123");
    expect(screen.queryByRole("button", { name: "Ship" })).toBeNull();
  });

  it("offers Ship and Pick list on a paid order", async () => {
    m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...order, status: "paid", shipped_at: null } });
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.getByRole("button", { name: "Ship" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pick list" })).toHaveAttribute("href", "/admin/orders/AP-1029/pick");
  });

  it("offers Refund to store credit only for a store-credit-only order", async () => {
    m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...order, stripe_session_id: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.getAllByRole("button", { name: "Refund to store credit", hidden: true }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Open in Stripe/ })).toBeNull();
  });

  it("shows Chargeback on the customer card only when the customer (not just this order) has a dispute", async () => {
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.queryByText("Chargeback")).toBeNull();

    m.customersWithDisputes.mockResolvedValue(new Set(["c1"]));
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.getByText("Chargeback")).toBeInTheDocument();
    expect(m.customersWithDisputes).toHaveBeenCalledWith(["c1"]);
  });

  it("hides Ship and refund-to-credit for the Assistant", async () => {
    m.requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...order, status: "paid", shipped_at: null, stripe_session_id: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.queryByRole("button", { name: "Ship" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Refund to store credit", hidden: true })).toBeNull();
    expect(screen.getByRole("link", { name: "Pick list" })).toBeInTheDocument();
  });
});
