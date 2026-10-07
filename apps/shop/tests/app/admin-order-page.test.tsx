import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";

const m = vi.hoisted(() => ({ requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), getOrderDetail: vi.fn(), customersWithDisputes: vi.fn(async () => new Set<string>()), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/orders/detail", () => ({ getOrderDetail: m.getOrderDetail }));
vi.mock("@/lib/disputes/data", () => ({ customersWithDisputes: m.customersWithDisputes }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/app/admin/orders/actions", () => ({ refundCreditOrderAction: vi.fn(), cancelNoChargeOrderAction: vi.fn() }));
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

  describe("a no-charge order (Screen 6)", () => {
    const nc = {
      ...order, order_number: "AP-1061", status: "paid", customer_id: "c1", email: "dana.w@example.com", ship_name: "Dana Whitfield",
      subtotal_cents: 0, partner_discount_cents: 0, code_discount_cents: 0, shipping_cents: 0, insurance_cents: 0, tax_cents: 0, total_cents: 0, store_credit_cents: 0,
      partner_id: null, discount_code_id: null, attributed_by: null, stripe_payment_intent: null, stripe_session_id: null, carrier: null, tracking_number: null, shipped_at: null,
      created_at: "2026-10-06T16:22:00Z", paid_at: "2026-10-06T16:22:01Z",
      kind: "no_charge", retail_value_cents: 19_200, no_charge_reason: "replacement", no_charge_note: "2 vials cracked in transit", replaces_order_id: "o0", created_by: "owner",
      order_items: [
        { id: "i1", compound_name: "BPC-157", strength: "10 mg", pack_qty: 1, quantity: 2, unit_price_cents: 0, line_total_cents: 0, retail_unit_cents: 4_800, lot_number: "BPC-2609-A" },
        { id: "i2", compound_name: "MOTS-c", strength: "40 mg", pack_qty: 1, quantity: 1, unit_price_cents: 0, line_total_cents: 0, retail_unit_cents: 9_600, lot_number: "MOTS-2610-A" },
      ],
    };
    const ncDetail = {
      ...detail, order: nc, lots: new Map(), code: null, partner: null,
      customer: { id: "c1", fullName: "Dana Whitfield", email: "dana.w@example.com", verified: true, blocked: false, paidOrders: 3, spentCents: 89_350, noChargeOrders: 1 },
      noCharge: { reason: "replacement", note: "2 vials cracked in transit", createdBy: "Alvester", replaces: "AP-1052" },
      timeline: [{ key: "created", at: "2026-10-06T16:22:00Z", tone: "ok", title: "Created — no charge", sub: "Replacement for AP-1052", who: "Alvester", detail: "“2 vials cracked in transit” · 3 vials held" }],
    };

    it("chips, actions, sub-line, items at retail, money, No charge card and customer counts", async () => {
      m.getOrderDetail.mockResolvedValue(ncDetail);
      const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1061" }) }));
      expect(screen.getByText("Paid")).toBeInTheDocument();
      expect(container.querySelector(".a-dh .a-mk.amb")).toHaveTextContent("No charge");
      expect(screen.getAllByRole("button", { name: "Cancel order", hidden: true }).length).toBeGreaterThan(0);
      expect(screen.getByText("Cancel AP-1061?")).toBeInTheDocument();
      expect(screen.getByText("The 3 vials go back to stock. Nothing is emailed.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Pick list" })).toHaveAttribute("href", "/admin/orders/AP-1061/pick");
      expect(screen.getByRole("button", { name: "Ship" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Refund to store credit", hidden: true })).toBeNull();
      const sub = container.querySelector(".a-dsub") as HTMLElement;
      expect(sub).toHaveTextContent("Created Oct 6, 10:22 am by Alvester");
      expect(sub).toHaveTextContent("Dana Whitfield");
      expect(within(sub).getByRole("link", { name: "AP-1052" })).toHaveAttribute("href", "/admin/orders/AP-1052");
      const items = screen.getByRole("heading", { name: "Items" }).closest(".a-card") as HTMLElement;
      expect(within(items).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Item", "Retail", "Qty", "Charged"]);
      expect(within(items).getByText("$48.00")).toBeInTheDocument();
      expect(within(items).getAllByText("$0.00")).toHaveLength(2);
      const money = screen.getByRole("heading", { name: "Money" }).closest(".a-card") as HTMLElement;
      expect(money).toHaveTextContent("Retail value");
      expect(money).toHaveTextContent("not a sale · kept for the record");
      expect(money).toHaveTextContent("$192.00");
      expect(within(money).getByText("Charged")).toBeInTheDocument();
      const card = screen.getByRole("heading", { name: "No charge" }).closest(".a-card") as HTMLElement;
      expect(card).toHaveTextContent("ReasonReplacement");
      expect(within(card).getByRole("link", { name: "AP-1052" })).toHaveAttribute("href", "/admin/orders/AP-1052");
      expect(card).toHaveTextContent("Created byAlvester");
      expect(card).toHaveTextContent("Not a sale · no commission · first-order offer untouched");
      expect(screen.getByText("3 orders · $893.50 · 1 no-charge")).toBeInTheDocument();
      expect(screen.getByText("Created — no charge")).toBeInTheDocument();
      expect(screen.getByText(/· Replacement for AP-1052/)).toBeInTheDocument();
    });

    it("hides Cancel order without orders.no_charge, and after shipping", async () => {
      m.requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
      m.getOrderDetail.mockResolvedValue(ncDetail);
      const a = render(await OrderPage({ params: Promise.resolve({ number: "AP-1061" }) }));
      expect(screen.queryByRole("button", { name: "Cancel order", hidden: true })).toBeNull();
      a.unmount();
      m.getOrderDetail.mockResolvedValue({ ...ncDetail, order: { ...nc, status: "shipped" } });
      render(await OrderPage({ params: Promise.resolve({ number: "AP-1061" }) }));
      expect(screen.queryByRole("button", { name: "Cancel order", hidden: true })).toBeNull();
    });

    it("a cancelled no-charge order reads Cancelled (no charge)", async () => {
      m.getOrderDetail.mockResolvedValue({ ...ncDetail, order: { ...nc, status: "refunded", refunded_at: "2026-10-07T16:00:00Z" } });
      render(await OrderPage({ params: Promise.resolve({ number: "AP-1061" }) }));
      expect(screen.getByText("Cancelled (no charge)")).toBeInTheDocument();
      expect(screen.queryByText("Refunded")).toBeNull();
    });
  });
});
