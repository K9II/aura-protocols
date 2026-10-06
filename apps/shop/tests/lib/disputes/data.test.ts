import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";
import { CUSTOMER_ID, DISPUTE_ID, IPHONE_UA, disputeRow } from "../../helpers/dispute-fixtures";

const db = vi.hoisted(() => ({ rpc: vi.fn(), getUserById: vi.fn(), from: null as null | ((t: string) => unknown) }));
const m = vi.hoisted(() => ({ getOrderById: vi.fn(), orderItemLots: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdminClient: () => ({ rpc: db.rpc, from: (t: string) => db.from!(t), auth: { admin: { getUserById: db.getUserById } } }),
}));
vi.mock("@/lib/orders", () => ({ getOrderById: m.getOrderById }));
vi.mock("@/lib/catalog-ops/data", () => ({ orderItemLots: m.orderItemLots }));
vi.mock("@/lib/catalog-live", () => ({ coaPublicUrl: (p: string) => `https://cdn.test/coa/${p}` }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

const order = {
  id: "o1", order_number: "AP-1031", customer_id: CUSTOMER_ID, email: "dana.w@example.com", status: "shipped",
  ship_name: "Dana Whitfield", ship_line1: "1420 Elm St", ship_line2: "Apt 3", ship_city: "Boulder", ship_state: "CO", ship_zip: "80302",
  subtotal_cents: 39100, shipping_cents: 0, insurance_cents: 550, tax_cents: 1550, total_cents: 41200, partner_discount_cents: 0, store_credit_cents: 0,
  ruo_confirmed_at: "2026-09-21T16:00:00Z", carrier: "usps", tracking_number: "9400111899223401552788",
  paid_at: "2026-09-21T16:02:00Z", shipped_at: "2026-09-22T18:00:00Z", created_at: "2026-09-21T16:00:00Z",
  order_items: [
    { id: "i1", compound_slug: "bpc-157", compound_name: "BPC-157", variant_id: "10mg", strength: "10 mg", pack_qty: 1, quantity: 3, unit_price_cents: 6900, line_total_cents: 20700, lot_number: "AP-BPC-2604" },
    { id: "i2", compound_slug: "tb-500", compound_name: "TB-500", variant_id: "10mg", strength: "10 mg", pack_qty: 2, quantity: 1, unit_price_cents: 18400, line_total_cents: 18400, lot_number: "AP-TB5-2603" },
  ],
};

describe("disputes data", () => {
  beforeEach(() => {
    vi.resetModules();
    db.rpc.mockReset(); db.getUserById.mockReset();
    for (const f of Object.values(m)) f.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("records a dispute through record_dispute; an error throws so Stripe retries", async () => {
    db.rpc.mockResolvedValueOnce({ data: DISPUTE_ID, error: null }).mockResolvedValueOnce({ data: null, error: { message: "down" } });
    const { recordDispute } = await import("@/lib/disputes/data");
    const p = { p_stripe_id: "dp_1", p_order: "o1", p_charge: "ch_1", p_pi: "pi_1", p_amount: 41200, p_currency: "usd", p_reason: "fraudulent", p_status: "needs_response", p_due: null, p_submitted: false, p_fee: 1500, p_opened: "2026-10-01T22:12:00.000Z", p_event_at: "2026-10-01T22:12:05.000Z" };
    expect(await recordDispute(p)).toBe(DISPUTE_ID);
    expect(db.rpc).toHaveBeenCalledWith("record_dispute", p);
    await expect(recordDispute(p)).rejects.toThrow(/record_dispute failed/);
  });

  it("a keyed activity entry is written once (upsert, ignore duplicates); an owner entry is a plain insert", async () => {
    const keyed = query({}), plain = query({});
    db.from = fromQueue({ dispute_events: [keyed, plain] });
    const { logDisputeEvent } = await import("@/lib/disputes/data");
    await logDisputeEvent({ disputeId: DISPUTE_ID, action: "opened", note: "fraudulent", key: "opened:dp_1" });
    expect(callArgs(keyed, "upsert")).toEqual([{ dispute_id: DISPUTE_ID, action: "opened", actor: null, note: "fraudulent", event_key: "opened:dp_1" }, { onConflict: "event_key", ignoreDuplicates: true }]);
    await logDisputeEvent({ disputeId: DISPUTE_ID, action: "draft_saved", actor: "owner1" });
    expect(callArgs(plain, "insert")).toEqual([{ dispute_id: DISPUTE_ID, action: "draft_saved", actor: "owner1", note: null, event_key: null }]);
  });

  it("funds times are set once; warnings upsert by Stripe id and close when their charge is disputed", async () => {
    const funds = query({}), upsert = query({}), close = query({});
    db.from = fromQueue({ disputes: [funds], early_fraud_warnings: [upsert, close] });
    const d = await import("@/lib/disputes/data");
    await d.recordFunds(DISPUTE_ID, "withdrawn", "2026-10-01T22:12:05.000Z");
    expect(callArgs(funds, "update")).toEqual([{ funds_withdrawn_at: "2026-10-01T22:12:05.000Z" }]);
    expect(callArgs(funds, "is")).toEqual(["funds_withdrawn_at", null]);
    const w = { stripe_efw_id: "issfr_1", order_id: "o2", charge_id: "ch_2", fraud_type: "misc", actionable: true, created_at: "2026-10-07T14:12:00.000Z" };
    await d.recordWarning(w);
    expect(callArgs(upsert, "upsert")).toEqual([w, { onConflict: "stripe_efw_id" }]);
    await d.resolveWarningsForCharge("ch_2");
    expect(callArgs(close, "update")?.[0]).toMatchObject({ resolved_action: "disputed" });
    expect(callArgs(close, "eq")).toEqual(["charge_id", "ch_2"]);
  });

  it("the nav count adds open chargebacks and open warnings, and never throws", async () => {
    db.from = fromQueue({ disputes: [query({ count: 2 }), query({ error: { message: 'relation "disputes" does not exist' } })], early_fraud_warnings: [query({ count: 1 }), query({ count: 1 })] });
    const { disputesNavCount } = await import("@/lib/disputes/data");
    expect(await disputesNavCount()).toBe(3);
    expect(await disputesNavCount()).toBe(0);
    expect(console.error).toHaveBeenCalledWith("disputes nav count failed:", expect.any(Error));
  });

  it("Chargeback tag: one call for the page's customers; none for an empty page", async () => {
    db.rpc.mockResolvedValue({ data: [{ customer_id: CUSTOMER_ID }], error: null });
    const { customersWithDisputes } = await import("@/lib/disputes/data");
    expect(await customersWithDisputes([])).toEqual(new Set());
    expect(db.rpc).not.toHaveBeenCalled();
    expect(await customersWithDisputes([CUSTOMER_ID, "u2"])).toEqual(new Set([CUSTOMER_ID]));
    expect(db.rpc).toHaveBeenCalledWith("admin_disputed_customers", { p_ids: [CUSTOMER_ID, "u2"] });
  });

  it("Chargeback tag: a failure (e.g. before disputes.sql is applied) tags nobody instead of breaking Customers", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'function admin_disputed_customers does not exist' } });
    const { customersWithDisputes } = await import("@/lib/disputes/data");
    expect(await customersWithDisputes([CUSTOMER_ID])).toEqual(new Set());
    expect(console.error).toHaveBeenCalledWith("disputed customers read failed:", expect.any(Error));
  });

  it("the dispute rate excludes warning_* (inquiry) statuses from the numerator, and counts every Stripe payment (not card-only) for the denominator", async () => {
    const d = query({ count: 4 }), o = query({ count: 900 });
    db.from = fromQueue({ disputes: [d], orders: [o] });
    const { disputeRateCounts } = await import("@/lib/disputes/data");
    expect(await disputeRateCounts("2026-07-09T15:42:00.000Z")).toEqual({ disputes: 4, charges: 900 });
    expect(callArgs(d, "gte")).toEqual(["opened_at", "2026-07-09T15:42:00.000Z"]);
    expect(callArgs(d, "not")).toEqual(["status", "like", "warning_%"]);
    expect(callArgs(o, "gte")).toEqual(["paid_at", "2026-07-09T15:42:00.000Z"]);
    expect(callArgs(o, "not")).toEqual(["stripe_payment_intent", "is", null]);
  });

  it("hasDisputeForCharge reports whether a chargeback already exists on a charge", async () => {
    db.from = fromQueue({ disputes: [query({ count: 1 }), query({ count: 0 })] });
    const { hasDisputeForCharge } = await import("@/lib/disputes/data");
    expect(await hasDisputeForCharge("ch_1")).toBe(true);
    expect(await hasDisputeForCharge("ch_2")).toBe(false);
  });

  it("resolving a warning reports whether this request did it", async () => {
    db.from = fromQueue({ early_fraud_warnings: [query({ data: [{ id: "w1" }] }), query({ data: [] })] });
    const { resolveWarning } = await import("@/lib/disputes/data");
    expect(await resolveWarning("w1", "refunded", "owner1")).toBe(true);
    expect(await resolveWarning("w1", "watching", "owner1")).toBe(false);
  });

  it("assembles the facts for one chargeback from the order, account, agreement and lots", async () => {
    m.getOrderById.mockResolvedValue(order);
    m.orderItemLots.mockResolvedValue(new Map([
      ["i1", { allocated: [{ lotNumber: "AP-BPC-2604", qty: 3 }], shipped: [{ lotNumber: "AP-BPC-2604", qty: 3 }] }],
      ["i2", { allocated: [], shipped: [] }],
    ]));
    db.getUserById.mockResolvedValue({ data: { user: { email: "dana.w@example.com", last_sign_in_at: "2026-09-21T15:58:00Z" } }, error: null });
    db.from = fromQueue({
      disputes: [query({ data: disputeRow({ billing_address: "Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US" }) }), query({ data: [{ order_id: "o1" }] })],
      customers: [query({ data: { full_name: "Dana Whitfield", created_at: "2026-09-15T01:02:00Z", is_owner: false, blocked_at: null } })],
      account_agreements: [query({ data: { id: "a1", terms_version: "2026-09-27", age_21: true, ruo: true, dispute_policy: true, ip_hash: "9f3ce21a77b0", user_agent: IPHONE_UA, agreed_at: "2026-09-15T01:02:41Z" } })],
      orders: [query({ data: [
        { id: "o0", order_number: "AP-1009", status: "shipped", total_cents: 6900, paid_at: "2026-09-15T17:00:00Z", created_at: "2026-09-15T16:59:00Z" },
        { id: "o1", order_number: "AP-1031", status: "shipped", total_cents: 41200, paid_at: "2026-09-21T16:02:00Z", created_at: "2026-09-21T16:00:00Z" },
        { id: "o9", order_number: "AP-1090", status: "awaiting_payment", total_cents: 9900, paid_at: null, created_at: "2026-10-03T16:00:00Z" },
      ] })],
      dispute_events: [query({ data: [{ id: "e1", action: "draft_saved", note: null, at: "2026-10-06T15:31:00Z", customers: { full_name: "Kearney Adams" } }] })],
      lots: [query({ data: [{ lot_number: "AP-BPC-2604", purity_pct: "99.40", method: "HPLC", coa_path: "AP-BPC-2604/1.pdf" }] })],
    });
    const { getDisputeCase } = await import("@/lib/disputes/data");
    const c = (await getDisputeCase(DISPUTE_ID))!;
    expect(c.facts.order).toMatchObject({ number: "AP-1031", carrier: "usps", tracking: "9400111899223401552788", ship: { line2: "Apt 3" } });
    expect(c.facts.items).toEqual([
      { name: "BPC-157", strength: "10 mg", vials: 3, lineTotalCents: 20700, lots: [{ lotNumber: "AP-BPC-2604", vials: 3, purityPct: 99.4, method: "HPLC", coaUrl: "https://cdn.test/coa/AP-BPC-2604/1.pdf" }] },
      { name: "TB-500", strength: "10 mg", vials: 2, lineTotalCents: 18400, lots: [{ lotNumber: "AP-TB5-2603", vials: 2, purityPct: null, method: null, coaUrl: null }] },
    ]);
    expect(c.facts.customer).toEqual({ name: "Dana Whitfield", email: "dana.w@example.com", createdAt: "2026-09-15T01:02:00Z", lastSignInAt: "2026-09-21T15:58:00Z" });
    expect(c.facts.agreement).toMatchObject({ agreedAt: "2026-09-15T01:02:41Z", termsVersion: "2026-09-27", ipHash: "9f3ce21a77b0" });
    expect(c.facts.priorOrders).toEqual([{ number: "AP-1009", paidAt: "2026-09-15T17:00:00Z", disputed: false }]);
    expect(c.facts.billingAddress).toBe("Dana Whitfield, 1420 Elm St, Boulder, CO 80302, US");
    expect(c.facts.site).toBe("https://auraprotocols.com");
    expect(c.events).toEqual([{ id: "e1", action: "draft_saved", note: null, at: "2026-10-06T15:31:00Z", actorName: "Kearney" }]);
    expect(c.customer).toEqual({ id: CUSTOMER_ID, name: "Dana Whitfield", isOwner: false, blockedAt: null, paidOrders: 2, openCheckouts: [{ number: "AP-1090", totalCents: 9900 }] });
    expect(m.orderItemLots).toHaveBeenCalledWith(["i1", "i2"]);
  });

  it("a missing chargeback is null; a missing order is an error, not a blank page", async () => {
    db.from = fromQueue({ disputes: [query({ data: null }), query({ data: disputeRow() })] });
    m.getOrderById.mockResolvedValue(null);
    const { getDisputeCase } = await import("@/lib/disputes/data");
    expect(await getDisputeCase(DISPUTE_ID)).toBeNull();
    await expect(getDisputeCase(DISPUTE_ID)).rejects.toThrow(/dispute order read failed/);
  });
});
