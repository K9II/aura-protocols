import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const m = vi.hoisted(() => ({ paymentLabel: vi.fn(async () => "Visa ••4242"), requirePermission: vi.fn(async () => (await import("../helpers/staff")).ownerStaff()), getOrderDetail: vi.fn(), customersWithDisputes: vi.fn(async () => new Set<string>()), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/lib/dal", () => ({ requirePermission: m.requirePermission }));
vi.mock("@/lib/orders/detail", () => ({ getOrderDetail: m.getOrderDetail }));
vi.mock("@/lib/disputes/data", () => ({ customersWithDisputes: m.customersWithDisputes }));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("@/app/admin/orders/actions", () => ({ refundOrderAction: vi.fn(), cancelNoChargeOrderAction: vi.fn() }));
vi.mock("@/components/admin/orders/ShipDialog", () => ({ default: () => <button className="a-btn primary">Ship</button> }));
vi.mock("@/lib/refunds/stripe", () => ({ paymentLabel: m.paymentLabel }));
// jsdom has no showModal; the open attribute is enough here.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
import OrderPage from "@/app/admin/orders/[number]/page";

const order = {
  id: "o1", order_number: "AP-1029", status: "shipped", kind: "sale", customer_id: "c1", email: "praman@example.org",
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
  beforeEach(() => { m.getOrderDetail.mockResolvedValue(detail); m.customersWithDisputes.mockResolvedValue(new Set<string>()); m.paymentLabel.mockClear(); delete process.env.STRIPE_SECRET_KEY; });

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

  it("a store-credit-only paid order: Cancel and refund back to store credit, no Stripe", async () => {
    m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...order, status: "paid", shipped_at: null, stripe_session_id: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.queryByRole("link", { name: /Open in Stripe/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel and refund" })).toBeInTheDocument();
    expect(m.paymentLabel).not.toHaveBeenCalled();
    const lines = container.querySelector("dialog .a-refund-lines") as HTMLElement;
    expect(lines).toHaveTextContent("Back to Priya's store creditpaid fully with store credit · available right away$414.39");
    expect(lines).not.toHaveTextContent("Back to Visa");
    expect(new FormData(container.querySelector("dialog form") as HTMLFormElement).get("destination")).toBe("store_credit");
  });

  it("shows Chargeback on the customer card only when the customer (not just this order) has a dispute", async () => {
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.queryByText("Chargeback")).toBeNull();

    m.customersWithDisputes.mockResolvedValue(new Set(["c1"]));
    render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.getByText("Chargeback")).toBeInTheDocument();
    expect(m.customersWithDisputes).toHaveBeenCalledWith(["c1"]);
  });

  it("hides Ship and every refund control for the Assistant", async () => {
    m.requirePermission.mockResolvedValueOnce((await import("../helpers/staff")).assistantStaff());
    m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...order, status: "paid", shipped_at: null, stripe_session_id: null, stripe_payment_intent: null, store_credit_cents: 41_439 } });
    const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
    expect(screen.queryByRole("button", { name: "Ship" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
    expect(container.querySelector("dialog")).toBeNull();
    expect(screen.getByRole("link", { name: "Pick list" })).toBeInTheDocument();
    expect(m.paymentLabel).not.toHaveBeenCalled();
  });

  describe("refunds (mock 2026-10-07-admin-refunds)", () => {
    const paid = { ...order, status: "paid", shipped_at: null, store_credit_cents: 4_000 };
    const withCommission = { ...detail, commission: { amount_cents: 1_920, rate_pct: 10, state: "pending", created_at: "2026-09-30T20:51:00Z", clears_at: null, voided_at: null } };

    it("r1/r2: a paid sale shows Cancel and refund before Pick list and Ship; the dialog has the split and facts", async () => {
      m.getOrderDetail.mockResolvedValue({ ...withCommission, order: paid });
      const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
      const actions = container.querySelector(".a-dh .actions") as HTMLElement;
      const labels = Array.from(actions.querySelectorAll(":scope > button, :scope > a")).map((e) => e.textContent);
      expect(labels.indexOf("Cancel and refund")).toBeGreaterThanOrEqual(0);
      expect(labels.indexOf("Cancel and refund")).toBeLessThan(labels.indexOf("Pick list"));
      expect(labels.indexOf("Pick list")).toBeLessThan(labels.indexOf("Ship"));
      expect(m.paymentLabel).toHaveBeenCalledWith("pi_123");
      const d = container.querySelector("dialog") as HTMLElement;
      const lines = d.querySelector(".a-refund-lines") as HTMLElement;
      expect(lines).toHaveTextContent("Back to Visa ••4242usually 5–10 business days, depending on the bank$374.39");
      expect(lines).toHaveTextContent("Back to Priya's store creditavailable right away$40.00");
      expect(lines).toHaveTextContent("Refunded in full$414.39");
      expect(within(d).getAllByRole("listitem", { hidden: true }).map((li) => li.textContent)).toEqual([
        "5 vials go back to stock.", "The QUINN10 commission ($19.20) is reversed.", 'Priya gets the "cancelled and refunded" email.',
      ]);
      // Phones: the same dialog from the ⋯ menu.
      fireEvent.click(screen.getByRole("button", { name: "More for AP-1029" }));
      fireEvent.click(screen.getByRole("button", { name: /^Cancel and refundBefore shipping · full refund$/ }));
      expect(d).toHaveAttribute("open");
    });

    it("no partner says so", async () => {
      m.getOrderDetail.mockResolvedValue({ ...detail, partner: null, order: { ...paid, partner_id: null } });
      render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
      expect(screen.getByText("No partner on this order.")).toBeInTheDocument();
    });

    it("no refund controls on a refunded or awaiting-payment order", async () => {
      for (const status of ["refunded", "awaiting_payment"]) {
        m.getOrderDetail.mockResolvedValue({ ...detail, order: { ...paid, status } });
        const r = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
        expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
        expect(r.container.querySelector("dialog")).toBeNull();
        r.unmount();
      }
    });

    it("r3: a shipped sale has no refund button; More has Send a replacement and Refund…", async () => {
      m.getOrderDetail.mockResolvedValue(withCommission);
      const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
      expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "More for AP-1029" }));
      expect(screen.getByRole("link", { name: /^Send a replacement/ })).toHaveAttribute("href", "/admin/orders/new?customer=c1&reason=replacement&replaces=AP-1029");
      const d = container.querySelector("dialog") as HTMLElement;
      expect(d).not.toHaveAttribute("open");
      fireEvent.click(screen.getByRole("button", { name: /^Refund…An exception to the refund policy$/ }));
      expect(d).toHaveAttribute("open");
      expect(within(d).getByRole("heading")).toHaveTextContent("Refund AP-1029? It has shipped.");
      expect(within(d).getByRole("link", { name: "Send a replacement instead" })).toHaveAttribute("href", "/admin/orders/new?customer=c1&reason=replacement&replaces=AP-1029");
      expect(within(d).getByRole("radio", { name: /Store credit/ })).toBeChecked();
      expect(within(d).getByRole("button", { name: "Refund $414.39 to store credit" })).toBeInTheDocument();
    });

    it("r5: an open fraud warning — no refund controls, the Disputes callout", async () => {
      m.getOrderDetail.mockResolvedValue({ ...detail, order: paid, flags: { dispute: false, warning: true }, openDisputeId: null });
      const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
      expect(screen.queryByRole("button", { name: "Cancel and refund" })).toBeNull();
      expect(container.querySelector("dialog")).toBeNull();
      const note = container.querySelector(".a-callout.warn") as HTMLElement;
      expect(note).toHaveTextContent("Stripe flagged this card as possibly stolen. To cancel and refund, use Disputes → warning on AP-1029 — it refunds as fraud so Radar blocks the card.");
      expect(within(note).getByRole("link", { name: "Disputes → warning on AP-1029" })).toHaveAttribute("href", "/admin/disputes");
    });

    it("r5: an open chargeback — no refund controls, links the dispute", async () => {
      m.getOrderDetail.mockResolvedValue({ ...detail, flags: { dispute: true, warning: false }, openDisputeId: "d9" });
      const { container } = render(await OrderPage({ params: Promise.resolve({ number: "AP-1029" }) }));
      expect(screen.queryByRole("button", { name: /^Refund…/ })).toBeNull();
      expect(container.querySelector("dialog")).toBeNull();
      const note = container.querySelector(".a-callout.info") as HTMLElement;
      expect(note).toHaveTextContent("A chargeback is open on this order — the bank already holds the money. Respond in Disputes; a refund isn't possible while it's open.");
      expect(within(note).getByRole("link", { name: "Disputes" })).toHaveAttribute("href", "/admin/disputes/d9");
    });
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
      expect(screen.queryByRole("button", { name: "Cancel and refund", hidden: true })).toBeNull();
      expect(m.paymentLabel).not.toHaveBeenCalled();
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
