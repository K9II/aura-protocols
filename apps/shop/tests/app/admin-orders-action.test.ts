import { describe, it, expect, vi, beforeEach } from "vitest";

import { ownerStaff } from "../helpers/staff";
const requirePermission = vi.fn();
const audit = vi.hoisted(() => ({ logAdminEvent: vi.fn(), recordAdminEvent: vi.fn() }));
const getOrderById = vi.fn();
const transitionOrder = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
const markCommissionClearing = vi.fn();
const afterOrderRefunded = vi.fn();
const orderItemLots = vi.fn();
const recordShipped = vi.fn();
const catalogStockChanged = vi.fn();
const revalidatePath = vi.fn();
const holdVials = vi.fn();
const nc = vi.hoisted(() => ({ recipient: vi.fn(), stockOptions: vi.fn(), createNoChargeOrder: vi.fn(), orderIdByNumber: vi.fn() }));
const afterOrderPaid = vi.fn();
const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); });
vi.mock("@/lib/dal", () => ({ requirePermission }));
vi.mock("@/lib/audit/data", () => audit);
vi.mock("@/lib/orders", () => ({ getOrderById, transitionOrder }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner }));
vi.mock("@/lib/partners/ledger", () => ({ markCommissionClearing }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/stripe-events", () => ({ afterOrderRefunded }));
vi.mock("@/lib/catalog-ops/data", () => ({ orderItemLots, recordShipped, holdVials }));
vi.mock("@/lib/no-charge/data", () => nc);
vi.mock("@/lib/order-paid", () => ({ afterOrderPaid }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/catalog-live", () => ({ catalogStockChanged }));

function fd(v: Record<string, string>) { const f = new FormData(); for (const [k, x] of Object.entries(v)) f.set(k, x); return f; }
const id = "11111111-1111-4111-8111-111111111111";

describe("markShippedAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, sendOrAlert, alertOwner, markCommissionClearing, orderItemLots, recordShipped, catalogStockChanged, revalidatePath]) f.mockReset();
    orderItemLots.mockResolvedValue(new Map());
  });

  it("is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await expect(markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("marks a paid order shipped with tracking and emails the customer", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: " 9400 1118 9922 3344 5566 77 ", carrier: "usps" }));
    expect(requirePermission).toHaveBeenCalledWith("orders.ship");
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "shipped", { tracking_number: "9400111899223344556677", carrier: "usps" });
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
    expect(markCommissionClearing).toHaveBeenCalledWith(id, expect.any(String));
  });

  it("still ships and emails the customer when clearing the commission fails", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    markCommissionClearing.mockRejectedValue(new Error("db down"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(alertOwner).toHaveBeenCalledWith("Commission not cleared at shipping", expect.stringMatching(/^AP-1001: [\s\S]*db down/));
    expect(sendOrAlert.mock.calls[0][0]).toMatchObject({ to: "j@lab.org", subject: "Order AP-1001 has shipped" });
  });

  it("marking shipped records each line's allocated lots as shipped (manual)", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }, { lotNumber: "BPC-2", qty: 4 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("ok");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(recordShipped).toHaveBeenCalledWith("i1", [{ lotNumber: "BPC-1", qty: 6 }, { lotNumber: "BPC-2", qty: 4 }], "manual");
    expect(alertOwner).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "orders", action: "order_shipped", targetId: id, label: "AP-1001", detail: "FEDEX 778122104410", actorId: "owner" });
  });

  it("skips a line already recorded as shipped", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [{ lotNumber: "BPC-1", qty: 6 }] }]]));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(recordShipped).not.toHaveBeenCalled();
  });

  it("'moved' expires the live catalog", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("moved");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(alertOwner).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("'alert' notifies the owner by order and line, but the shipment still stands", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }]]));
    recordShipped.mockResolvedValue("alert");
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots don't match what was held", expect.stringMatching(/^AP-1001 · line i1/));
    expect(catalogStockChanged).not.toHaveBeenCalled();
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("a thrown recordShipped for one line alerts the owner by line, but other lines and the shipment still go through", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }, { id: "i2" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockResolvedValue(new Map([
      ["i1", { allocated: [{ lotNumber: "BPC-1", qty: 6 }], shipped: [] }],
      ["i2", { allocated: [{ lotNumber: "BPC-2", qty: 4 }], shipped: [] }],
    ]));
    recordShipped.mockImplementation(async (itemId: string) => { if (itemId === "i1") throw new Error("db down"); return "ok"; });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots not recorded", expect.stringMatching(/^AP-1001 · line i1/));
    expect(recordShipped).toHaveBeenCalledWith("i2", [{ lotNumber: "BPC-2", qty: 4 }], "manual");
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("a failed shipped-lot record alerts the owner but the shipment stands", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", order_items: [{ id: "i1" }], ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "778122104410", carrier: "fedex", ...ship });
    transitionOrder.mockResolvedValue(true);
    orderItemLots.mockRejectedValue(new Error("down"));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "778122104410", carrier: "fedex" }));
    expect(alertOwner).toHaveBeenCalledWith("Shipped lots not recorded", expect.stringMatching(/^AP-1001: /));
    expect(sendOrAlert).toHaveBeenCalled();
  });

  it("ignores bad input and non-paid orders", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    await markShippedAction(null, fd({ orderId: id, tracking: "x", carrier: "usps" }));
    getOrderById.mockResolvedValue({ id, status: "cancelled" });
    await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }));
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(markCommissionClearing).not.toHaveBeenCalled();
  });

  it("reports a bad tracking number to the dialog instead of ignoring it", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "1Z-99", carrier: "ups" }))).toEqual({ error: "Use 8–40 letters and numbers.", field: "tracking" });
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("reports an order that is no longer waiting to ship", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    getOrderById.mockResolvedValue({ id, status: "shipped", order_number: "AP-1001" });
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).toEqual({ error: "This order is no longer waiting to ship." });
  });

  it("returns ok and revalidates the list and the order page", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const ship = { ship_name: "J. Rivera", ship_line1: "1 A St", ship_line2: null, ship_city: "Austin", ship_state: "TX", ship_zip: "78701" };
    getOrderById.mockResolvedValueOnce({ id, status: "paid", email: "j@lab.org", order_number: "AP-1001", ...ship })
      .mockResolvedValueOnce({ id, status: "shipped", email: "j@lab.org", order_number: "AP-1001", tracking_number: "9400111899223344556677", carrier: "usps", ...ship });
    transitionOrder.mockResolvedValue(true);
    const { markShippedAction } = await import("@/app/admin/orders/actions");
    expect(await markShippedAction(null, fd({ orderId: id, tracking: "9400111899223344556677", carrier: "usps" }))).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/AP-1001");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/[id]", "page");
  });
});

describe("refundCreditOrderAction", () => {
  const creditOrder = (status: string, over: Record<string, unknown> = {}) => ({
    id, order_number: "AP-1009", status, stripe_session_id: null, store_credit_cents: 6950, total_cents: 6950, ...over,
  });
  beforeEach(() => { vi.resetModules(); for (const f of [audit.logAdminEvent, audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, alertOwner, afterOrderRefunded, revalidatePath]) f.mockReset(); });

  it("is owner-only", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await expect(refundCreditOrderAction(fd({ orderId: id }))).rejects.toThrow("NOT_FOUND");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("refunds a paid or shipped order paid fully in store credit, then runs the refund follow-ups", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    getOrderById.mockResolvedValue(creditOrder("shipped"));
    transitionOrder.mockResolvedValue(true);
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    await refundCreditOrderAction(fd({ orderId: id }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "shipped", "refunded");
    expect(afterOrderRefunded).toHaveBeenCalledWith(expect.objectContaining({ id, order_number: "AP-1009" }));
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/orders/AP-1009");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/partners/[id]", "page");
  });

  it("refuses orders Stripe charged (those are refunded in Stripe) and unpaid ones", async () => {
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    const { refundCreditOrderAction } = await import("@/app/admin/orders/actions");
    for (const o of [creditOrder("paid", { stripe_session_id: "cs_1" }), creditOrder("paid", { store_credit_cents: 5000 }), creditOrder("cancelled")]) {
      getOrderById.mockResolvedValue(o);
      await refundCreditOrderAction(fd({ orderId: id }));
    }
    expect(transitionOrder).not.toHaveBeenCalled();
    expect(afterOrderRefunded).not.toHaveBeenCalled();
  });
});

describe("createNoChargeOrderAction", () => {
  const cust = "22222222-2222-4222-8222-222222222222";
  const ship = { name: "Dr. Mara Lin", line1: "1 Lab Way", line2: null, city: "Austin", state: "TX" as const, zip: "78701" };
  const who = { id: cust, name: "Mara Lin", email: "mara@lab.org", verified: true, blocked: false, agreedAt: "2026-10-01T00:00:00Z", ship };
  const stock = [
    { slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false },
    { slug: "mots-c", variantId: "40mg", name: "MOTS-c", strength: "40 mg", priceCents: 9600, available: 3, hidden: true },
  ];
  const form = (over: Record<string, string | string[]> = {}) => {
    const v: Record<string, string | string[]> = {
      customer: cust, reason: "replacement", replaces: "AP-1040", note: "Vial cracked in transit", email: "on",
      line: ["bpc-157:10mg:2", "mots-c:40mg:1"],
      ship_name: ship.name, ship_line1: ship.line1, ship_line2: "", ship_city: ship.city, ship_state: "tx", ship_zip: ship.zip, ...over,
    };
    const f = new FormData();
    for (const [k, x] of Object.entries(v)) for (const y of Array.isArray(x) ? x : [x]) f.append(k, y);
    return f;
  };

  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.recordAdminEvent, requirePermission, transitionOrder, alertOwner, catalogStockChanged, revalidatePath, holdVials, afterOrderPaid, redirect, nc.recipient, nc.stockOptions, nc.createNoChargeOrder, nc.orderIdByNumber]) f.mockReset();
    redirect.mockImplementation((url: string) => { throw new Error(`REDIRECT ${url}`); });
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    nc.recipient.mockResolvedValue(who);
    nc.stockOptions.mockResolvedValue(stock);
    nc.orderIdByNumber.mockResolvedValue("orig-id");
    nc.createNoChargeOrder.mockResolvedValue({ id: "o9", orderNumber: "AP-1061" });
    holdVials.mockResolvedValue({ ok: true });
    transitionOrder.mockResolvedValue(true);
    afterOrderPaid.mockResolvedValue(undefined);
  });

  it("requires orders.no_charge", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("orders.no_charge");
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", null],
    ["blocked", { ...who, blocked: true }],
    ["never agreed", { ...who, agreedAt: null }],
  ])("refuses a recipient who can't receive orders (%s)", async (_label, r) => {
    nc.recipient.mockResolvedValue(r);
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: "That customer can't receive orders. Pick someone else." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses a malformed customer id without reading anything", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form({ customer: "nope" }))).toEqual({ errors: { form: "That customer can't receive orders. Pick someone else." } });
    expect(nc.recipient).not.toHaveBeenCalled();
  });

  it("returns the parse errors and inserts nothing", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    const r = await createNoChargeOrderAction(null, form({ reason: "", line: [] }));
    expect(r).toEqual({ errors: { reason: "Pick a reason.", lines: "Add at least one item." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses a replacement for an order that isn't this customer's", async () => {
    nc.orderIdByNumber.mockResolvedValue(null);
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { replaces: "That order isn't this customer's." } });
    expect(nc.orderIdByNumber).toHaveBeenCalledWith("AP-1040", cust);
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("refuses an incomplete address", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form({ ship_zip: "7870" }))).toEqual({ errors: { form: "Please complete the shipping address." } });
    expect(nc.createNoChargeOrder).not.toHaveBeenCalled();
  });

  it("creates, holds, marks paid, runs the paid steps, logs and opens the order", async () => {
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1061");
    expect(nc.createNoChargeOrder).toHaveBeenCalledWith({
      customerId: cust, email: "mara@lab.org", ship: { ...ship, state: "TX" },
      lines: [
        { compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", packQty: 1, quantity: 2, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 4800 },
        { compoundSlug: "mots-c", compoundName: "MOTS-c", variantId: "40mg", strength: "40 mg", packQty: 1, quantity: 1, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 9600 },
      ],
      retailCents: 19200, reason: "replacement", note: "Vial cracked in transit", replacesOrderId: "orig-id", actorId: "owner", agreedAt: "2026-10-01T00:00:00Z",
    });
    expect(holdVials).toHaveBeenCalledWith("o9");
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "paid");
    expect(afterOrderPaid).toHaveBeenCalledWith("o9", { notify: true });
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith({ area: "orders", action: "no_charge_created", targetId: "o9", label: "AP-1061", detail: "Replacement · $192.00 retail · email: yes", actorId: "owner" });
    expect(holdVials.mock.invocationCallOrder[0]).toBeLessThan(transitionOrder.mock.invocationCallOrder[0]);
    expect(transitionOrder.mock.invocationCallOrder[0]).toBeLessThan(afterOrderPaid.mock.invocationCallOrder[0]);
  });

  it("no email box → notify false, recorded as email: no; non-replacement ignores replaces", async () => {
    const f = form({ reason: "seeding", note: "", replaces: "" });
    f.delete("email");
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, f)).rejects.toThrow("REDIRECT");
    expect(nc.orderIdByNumber).not.toHaveBeenCalled();
    expect(nc.createNoChargeOrder).toHaveBeenCalledWith(expect.objectContaining({ reason: "seeding", note: null, replacesOrderId: null }));
    expect(afterOrderPaid).toHaveBeenCalledWith("o9", { notify: false });
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: "Seeding · $192.00 retail · email: no" }));
  });

  it("sold out while creating → cancels and names the short item", async () => {
    holdVials.mockResolvedValue({ ok: false, reason: "sold_out", short: [{ slug: "mots-c", variantId: "40mg" }] });
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { lines: "Not enough MOTS-c 40 mg left — someone just bought it. Lower the count." } });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(transitionOrder).not.toHaveBeenCalledWith("o9", "awaiting_payment", "paid");
    expect(afterOrderPaid).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("a hold that throws → cancels, nothing created", async () => {
    holdVials.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    expect(await createNoChargeOrderAction(null, form())).toEqual({ errors: { form: "Stock couldn't be reserved. Nothing was created — try again." } });
    expect(transitionOrder).toHaveBeenCalledWith("o9", "awaiting_payment", "cancelled");
    expect(afterOrderPaid).not.toHaveBeenCalled();
  });

  it("paid steps failing alerts the owner and still opens the order", async () => {
    afterOrderPaid.mockRejectedValue(new Error("email down"));
    const { createNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(createNoChargeOrderAction(null, form())).rejects.toThrow("REDIRECT /admin/orders/AP-1061");
    expect(alertOwner).toHaveBeenCalledWith("No-charge order follow-up failed", expect.stringMatching(/^AP-1061: [\s\S]*email down/));
    expect(audit.recordAdminEvent).toHaveBeenCalled();
  });
});

describe("cancelNoChargeOrderAction", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [audit.recordAdminEvent, requirePermission, getOrderById, transitionOrder, sendOrAlert, catalogStockChanged, afterOrderRefunded, revalidatePath]) f.mockReset();
    requirePermission.mockResolvedValue(ownerStaff({ id: "owner" }));
    transitionOrder.mockResolvedValue(true);
  });
  const nco = (over: Record<string, unknown> = {}) => ({ id, order_number: "AP-1061", kind: "no_charge", status: "paid", ...over });

  it("requires orders.no_charge", async () => {
    requirePermission.mockRejectedValue(new Error("NOT_FOUND"));
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow("NOT_FOUND");
    expect(requirePermission).toHaveBeenCalledWith("orders.no_charge");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("moves a paid no-charge order to refunded (stock returns), logs it, sends no email", async () => {
    getOrderById.mockResolvedValue(nco());
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await cancelNoChargeOrderAction(fd({ orderId: id }));
    expect(transitionOrder).toHaveBeenCalledWith(id, "paid", "refunded");
    expect(catalogStockChanged).toHaveBeenCalled();
    expect(audit.recordAdminEvent).toHaveBeenCalledWith(expect.objectContaining({ area: "orders", action: "no_charge_cancelled", targetId: id, label: "AP-1061", actorId: "owner" }));
    expect(sendOrAlert).not.toHaveBeenCalled();
    expect(afterOrderRefunded).not.toHaveBeenCalled();
  });

  it("refuses a shipped one", async () => {
    getOrderById.mockResolvedValue(nco({ status: "shipped" }));
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow("This order has shipped — it can't be cancelled.");
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it.each([["a sale", nco({ kind: "sale" })], ["missing", null], ["already cancelled", nco({ status: "refunded" })]])("throws on a stale order (%s)", async (_l, o) => {
    getOrderById.mockResolvedValue(o);
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow();
    expect(transitionOrder).not.toHaveBeenCalled();
  });

  it("throws when the order moved meanwhile", async () => {
    getOrderById.mockResolvedValue(nco());
    transitionOrder.mockResolvedValue(false);
    const { cancelNoChargeOrderAction } = await import("@/app/admin/orders/actions");
    await expect(cancelNoChargeOrderAction(fd({ orderId: id }))).rejects.toThrow();
    expect(audit.recordAdminEvent).not.toHaveBeenCalled();
  });
});
