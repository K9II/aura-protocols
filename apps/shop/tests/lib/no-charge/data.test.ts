import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";
import type { BuiltLine } from "@/lib/no-charge/rules";

const rpc = vi.fn(), getUserById = vi.fn(), fetchAdminOps = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({
  from: (t: string) => from(t), rpc, auth: { admin: { getUserById } },
}) }));
vi.mock("@/lib/catalog-ops/data", () => ({ fetchAdminOps }));
vi.mock("@/data/catalog", () => ({ catalogContent: [
  { slug: "bpc-157", name: "BPC-157" }, { slug: "mots-c", name: "MOTS-c" }, { slug: "tb-500", name: "TB-500" },
] }));

const lot = (o: Record<string, unknown>) => ({ id: "l", lot_number: "L", slug: "bpc-157", variant_id: "10mg", status: "live", live_at: "2026-09-01T00:00:00Z", available: 0, ...o });
const variant = (o: Record<string, unknown>) => ({ slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 4800, low_at: 5, threepl_sku: null, shown: true, archived_at: null, ...o });

const ship = { name: "Dana Whitfield", line1: "1420 Elm St", line2: null, city: "Boulder", state: "CO" as const, zip: "80302" };
const lines: BuiltLine[] = [
  { compoundSlug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", packQty: 1, quantity: 2, unitPriceCents: 0, lineTotalCents: 0, retailUnitCents: 4800 },
];
const input = { customerId: "c1", email: "dana.w@example.com", ship, lines, retailCents: 9600, reason: "seeding" as const, note: null, replacesOrderId: null, actorId: "owner1", agreedAt: "2026-09-01T00:00:00Z", key: "3b241101-e2bb-4255-8caf-4136c566a962" };

describe("no-charge data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); getUserById.mockReset(); fetchAdminOps.mockReset(); });

  it("stockOptions sums live lots, ignores draft/retired, drops archived, unknown and hidden products, flags hidden strengths", async () => {
    fetchAdminOps.mockResolvedValue({
      products: [{ slug: "bpc-157", shown: true }, { slug: "mots-c", shown: false }, { slug: "tb-500", shown: true }, { slug: "ghost", shown: true }],
      variants: [
        variant({}),
        variant({ slug: "mots-c", variant_id: "40mg", strength: "40 mg", price_cents: 9600 }),
        variant({ slug: "tb-500", variant_id: "10mg", archived_at: "2026-09-01T00:00:00Z" }),
        variant({ slug: "ghost", variant_id: "5mg", strength: "5 mg" }),
        variant({ variant_id: "20mg", strength: "20 mg", shown: false }),
      ],
      lots: [
        lot({ available: 50 }), lot({ id: "l2", available: 34 }),
        lot({ id: "l3", status: "retired", available: 9 }), lot({ id: "l4", status: "draft", available: 7 }),
        lot({ id: "l5", slug: "mots-c", variant_id: "40mg", available: 6 }),
        lot({ id: "l6", slug: "tb-500", variant_id: "10mg", available: 10 }),
        lot({ id: "l7", slug: "ghost", variant_id: "5mg", available: 10 }),
        lot({ id: "l8", variant_id: "20mg", available: 3 }),
      ],
    });
    const { stockOptions } = await import("@/lib/no-charge/data");
    expect(await stockOptions()).toEqual([
      { slug: "bpc-157", variantId: "10mg", name: "BPC-157", strength: "10 mg", priceCents: 4800, available: 84, hidden: false },
      { slug: "bpc-157", variantId: "20mg", name: "BPC-157", strength: "20 mg", priceCents: 4800, available: 3, hidden: true },
    ]);
  });

  it("createNoChargeOrder inserts a zero-money no-charge order and its lines with the retail price", async () => {
    const order = query({ data: { id: "o1", order_number: "AP-1060" } }), items = query({});
    from = fromQueue({ orders: [order], order_items: [items] });
    const { createNoChargeOrder } = await import("@/lib/no-charge/data");
    expect(await createNoChargeOrder({ ...input, reason: "replacement", note: "2 vials cracked", replacesOrderId: "o0" })).toEqual({ id: "o1", orderNumber: "AP-1060" });
    const row = callArgs(order, "insert")![0] as Record<string, unknown>;
    expect(row).toMatchObject({
      customer_id: "c1", email: "dana.w@example.com", status: "awaiting_payment", kind: "no_charge",
      subtotal_cents: 0, shipping_cents: 0, insurance_cents: 0, tax_cents: 0, total_cents: 0, store_credit_cents: 0,
      partner_discount_cents: 0, code_discount_cents: 0,
      retail_value_cents: 9600, no_charge_reason: "replacement", no_charge_note: "2 vials cracked", replaces_order_id: "o0", created_by: "owner1",
      ruo_confirmed_at: "2026-09-01T00:00:00Z", no_charge_key: "3b241101-e2bb-4255-8caf-4136c566a962", ship_name: "Dana Whitfield", ship_line1: "1420 Elm St", ship_line2: null, ship_city: "Boulder", ship_state: "CO", ship_zip: "80302",
    });
    expect(typeof row.expires_at).toBe("string");
    expect(callArgs(items, "insert")![0]).toEqual([{
      order_id: "o1", compound_slug: "bpc-157", compound_name: "BPC-157", variant_id: "10mg", strength: "10 mg",
      pack_qty: 1, quantity: 2, unit_price_cents: 0, line_total_cents: 0, retail_unit_cents: 4800, lot_number: "",
    }]);
  });

  it("createNoChargeOrder deletes the order and throws when the lines fail", async () => {
    const order = query({ data: { id: "o1", order_number: "AP-1060" } }), items = query({ error: { message: "down" } }), del = query({});
    from = fromQueue({ orders: [order, del], order_items: [items] });
    const { createNoChargeOrder } = await import("@/lib/no-charge/data");
    const { NoChargeCreateError } = await import("@/lib/no-charge/rules");
    const err = await createNoChargeOrder(input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NoChargeCreateError);
    expect(String(err)).toMatch(/order_items insert failed/);
    expect((err as InstanceType<typeof NoChargeCreateError>).order).toBeNull(); // deleted — nothing left behind
    expect(callArgs(del, "delete")).toEqual([]);
    expect(callArgs(del, "eq")).toEqual(["id", "o1"]);
  });

  it("createNoChargeOrder reports a failed delete and hands back the order left behind", async () => {
    const order = query({ data: { id: "o1", order_number: "AP-1060" } }), items = query({ error: { message: "down" } }), del = query({ error: { message: "locked" } });
    from = fromQueue({ orders: [order, del], order_items: [items] });
    const { createNoChargeOrder } = await import("@/lib/no-charge/data");
    const err = await createNoChargeOrder(input).catch((e: unknown) => e) as Error & { order: unknown };
    expect(err.message).toMatch(/order_items insert failed[\s\S]*down[\s\S]*delete failed[\s\S]*locked/);
    expect(err.order).toEqual({ id: "o1", orderNumber: "AP-1060" });
  });

  it("createNoChargeOrder returns duplicate when the form's one-time key was already used", async () => {
    from = fromQueue({ orders: [query({ error: { code: "23505", message: 'duplicate key value violates unique constraint "orders_no_charge_key_idx"' } })] });
    const { createNoChargeOrder } = await import("@/lib/no-charge/data");
    expect(await createNoChargeOrder(input)).toEqual({ duplicate: true });
  });

  it("orderByNoChargeKey finds the order a key created", async () => {
    const q = query({ data: { id: "o1", order_number: "AP-1060", status: "paid" } });
    from = fromQueue({ orders: [q] });
    const { orderByNoChargeKey } = await import("@/lib/no-charge/data");
    expect(await orderByNoChargeKey("k1")).toEqual({ id: "o1", orderNumber: "AP-1060", status: "paid" });
    expect(q.calls).toContainEqual(["eq", ["no_charge_key", "k1"]]);
    expect(q.calls).toContainEqual(["eq", ["kind", "no_charge"]]);
  });

  it("orderByNoChargeKey is null when none, throws on a read error", async () => {
    from = fromQueue({ orders: [query({ data: null }), query({ error: { message: "down" } })] });
    const { orderByNoChargeKey } = await import("@/lib/no-charge/data");
    expect(await orderByNoChargeKey("k1")).toBeNull();
    await expect(orderByNoChargeKey("k1")).rejects.toThrow(/no-charge key read failed/);
  });

  it("createNoChargeOrder throws when the order insert fails", async () => {
    from = fromQueue({ orders: [query({ error: { message: "check" } })] });
    const { createNoChargeOrder } = await import("@/lib/no-charge/data");
    await expect(createNoChargeOrder(input)).rejects.toThrow(/no-charge order insert failed/);
  });

  it("searchRecipients searches accounts (cleaned query, 8 at most) and drops blocked ones", async () => {
    rpc.mockResolvedValue({ data: [
      { id: "c1", email: "dana.w@example.com", full_name: "Dana Whitfield", email_verified_at: "2026-09-01T00:00:00Z", blocked_at: null, paid_orders: 2 },
      { id: "c2", email: "dan@example.com", full_name: "Dan Blocked", email_verified_at: null, blocked_at: "2026-09-02T00:00:00Z", paid_orders: 0 },
      { id: "c3", email: "danny@example.com", full_name: "Danny New", email_verified_at: null, blocked_at: null, paid_orders: 0 },
    ], error: null });
    const { searchRecipients } = await import("@/lib/no-charge/data");
    expect(await searchRecipients(" dan%_ ")).toEqual([
      { id: "c1", name: "Dana Whitfield", email: "dana.w@example.com", verified: true, orders: 2 },
      { id: "c3", name: "Danny New", email: "danny@example.com", verified: false, orders: 0 },
    ]);
    expect(rpc).toHaveBeenCalledWith("admin_customer_list", { p_q: "dan", p_tab: "all", p_limit: 8, p_offset: 0 });
  });

  it("searchRecipients throws on a read error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    const { searchRecipients } = await import("@/lib/no-charge/data");
    await expect(searchRecipients("dan")).rejects.toThrow(/recipient search failed/);
  });

  it("recipient joins the account, its email, saved address and latest agreement", async () => {
    from = fromQueue({
      customers: [query({ data: { id: "c1", full_name: "Dana Whitfield", email_verified_at: "2026-09-01T00:00:00Z", blocked_at: null, ship_name: "Dana Whitfield", ship_line1: "1420 Elm St", ship_line2: null, ship_city: "Boulder", ship_state: "CO", ship_zip: "80302" } })],
      account_agreements: [query({ data: { agreed_at: "2026-09-01T00:00:00Z" } })],
    });
    getUserById.mockResolvedValue({ data: { user: { email: "dana.w@example.com" } }, error: null });
    const { recipient } = await import("@/lib/no-charge/data");
    expect(await recipient("c1")).toEqual({ id: "c1", name: "Dana Whitfield", email: "dana.w@example.com", verified: true, blocked: false, agreedAt: "2026-09-01T00:00:00Z", ship });
  });

  it("recipient is null for an unknown id and has no address when one is incomplete", async () => {
    from = fromQueue({ customers: [query({ data: null })] });
    const { recipient } = await import("@/lib/no-charge/data");
    expect(await recipient("nope")).toBeNull();
    vi.resetModules();
    from = fromQueue({
      customers: [query({ data: { id: "c1", full_name: "Dana Whitfield", email_verified_at: null, blocked_at: "2026-09-02T00:00:00Z", ship_name: "Dana", ship_line1: null, ship_line2: null, ship_city: null, ship_state: null, ship_zip: null } })],
      account_agreements: [query({ data: null })],
    });
    getUserById.mockResolvedValue({ data: { user: { email: "dana.w@example.com" } }, error: null });
    const again = await import("@/lib/no-charge/data");
    expect(await again.recipient("c1")).toMatchObject({ blocked: true, verified: false, agreedAt: null, ship: null });
  });

  it("monthTotal counts paid/shipped no-charge orders since the start of the shop-time month", async () => {
    const q = query({ data: [{ retail_value_cents: 9600 }, { retail_value_cents: 4800 }] });
    from = fromQueue({ orders: [q] });
    const { monthTotal } = await import("@/lib/no-charge/data");
    // 2026-10-01 03:00 UTC is still Sep 30 in Denver (UTC-6) → the September month.
    expect(await monthTotal(Date.parse("2026-10-01T03:00:00Z"))).toEqual({ orders: 2, retailCents: 14400 });
    expect(q.calls).toContainEqual(["eq", ["kind", "no_charge"]]);
    expect(q.calls).toContainEqual(["in", ["status", ["paid", "shipped"]]]);
    expect(q.calls).toContainEqual(["gte", ["paid_at", "2026-09-01T06:00:00.000Z"]]);
  });

  it("orderIdByNumber only finds the customer's own paid/shipped sale order", async () => {
    const q = query({ data: { id: "o0" } });
    from = fromQueue({ orders: [q] });
    const { orderIdByNumber } = await import("@/lib/no-charge/data");
    expect(await orderIdByNumber("ap-1052", "c1")).toBe("o0");
    expect(q.calls).toContainEqual(["eq", ["order_number", "AP-1052"]]);
    expect(q.calls).toContainEqual(["eq", ["customer_id", "c1"]]);
    expect(q.calls).toContainEqual(["eq", ["kind", "sale"]]);
    expect(q.calls).toContainEqual(["in", ["status", ["paid", "shipped"]]]);
  });

  it("saleOrders lists the customer's paid/shipped sale orders, newest first", async () => {
    const q = query({ data: [{ order_number: "AP-1052", created_at: "2026-10-01T18:00:00Z" }] });
    from = fromQueue({ orders: [q] });
    const { saleOrders } = await import("@/lib/no-charge/data");
    expect(await saleOrders("c1")).toEqual([{ number: "AP-1052", createdAt: "2026-10-01T18:00:00Z" }]);
    expect(q.calls).toContainEqual(["eq", ["customer_id", "c1"]]);
    expect(q.calls).toContainEqual(["eq", ["kind", "sale"]]);
    expect(q.calls).toContainEqual(["in", ["status", ["paid", "shipped"]]]);
    expect(q.calls).toContainEqual(["order", ["created_at", { ascending: false }]]);
  });

  it("saleOrders throws on a read error", async () => {
    from = fromQueue({ orders: [query({ error: { message: "down" } })] });
    const { saleOrders } = await import("@/lib/no-charge/data");
    await expect(saleOrders("c1")).rejects.toThrow(/customer orders read failed/);
  });
});
