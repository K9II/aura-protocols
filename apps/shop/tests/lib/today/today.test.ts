import { describe, it, expect, vi, beforeEach } from "vitest";
import { listRow, warningRow } from "../../helpers/dispute-fixtures";

const m = vi.hoisted(() => ({
  listOpenAlerts: vi.fn(), listOrdersForOwner: vi.fn(), fetchAdminOps: vi.fn(), waitingLots: vi.fn(), sendingCampaign: vi.fn(),
  listRuns: vi.fn(), emailOverview: vi.fn(), listPartners: vi.fn(), listQueuedPayouts: vi.fn(), openInquiryTodos: vi.fn(), salesSummary: vi.fn(), openDisputeTodos: vi.fn(),
}));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T15:42:00Z") }));
vi.mock("@/lib/today/alerts", () => ({ listOpenAlerts: m.listOpenAlerts }));
vi.mock("@/lib/orders", () => ({ listOrdersForOwner: m.listOrdersForOwner }));
vi.mock("@/lib/catalog-ops/data", () => ({ fetchAdminOps: m.fetchAdminOps }));
vi.mock("@/lib/email/campaigns/data", () => ({ waitingLots: m.waitingLots, sendingCampaign: m.sendingCampaign }));
vi.mock("@/lib/email/admin-data", () => ({ listRuns: m.listRuns }));
vi.mock("@/lib/email/stats", () => ({ emailOverview: m.emailOverview }));
vi.mock("@/lib/partners/data", () => ({ listPartners: m.listPartners }));
vi.mock("@/lib/partners/ledger", () => ({ listQueuedPayouts: m.listQueuedPayouts }));
vi.mock("@/lib/inquiries/data", () => ({ openInquiryTodos: m.openInquiryTodos }));
vi.mock("@/lib/today/data", () => ({ salesSummary: m.salesSummary }));
vi.mock("@/lib/disputes/data", () => ({ openDisputeTodos: m.openDisputeTodos }));
const wholesaleTodos = vi.hoisted(() => vi.fn());
vi.mock("@/lib/wholesale/runs-data", () => ({ wholesaleTodos }));

const sum = (o: Record<string, unknown> = {}) => ({
  salesCents: 0, orders: 0, chargedCents: 0, shippingCents: 0, taxCents: 0, refundedCents: 0, refundedOrders: 0,
  firstTimeOrders: 0, repeatOrders: 0, newAccounts: 0, buckets: [], top: [], ...o,
});
const lotRow = (o: Record<string, unknown>) => ({
  id: "l1", lot_number: "AP-BPC-2610", slug: "bpc-157", variant_id: "10mg", purity_pct: 99.4, method: "HPLC+MS", tested_on: "2026-09-30",
  coa_path: "AP-BPC-2610/1.pdf", status: "live", live_at: "2026-10-01T00:00:00Z", sellable: 7, held: 0, sold: 0, available: 7,
  ordered_qty: 7, counted_qty: 7, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: null, received_by_name: null,
  received_at: "2026-10-01T00:00:00Z", retired_at: null, ...o,
});

describe("today assembly", () => {
  beforeEach(() => {
    vi.resetModules();
    wholesaleTodos.mockReset();
    wholesaleTodos.mockResolvedValue({ collecting: null, toOrder: [], failed: [], balances: { due: 0, overdue: 0 } });
    for (const f of Object.values(m)) f.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.listOpenAlerts.mockResolvedValue([{ id: "a1", title: "T", detail: "D", count: 1, first_at: "2026-10-06T14:00:00Z", last_at: "2026-10-06T14:00:00Z", resolved_at: null, resolved_by_name: null, note: null }]);
    m.listOrdersForOwner.mockResolvedValue([{ order_number: "AP-1040", ship_name: "Marcus Lee", total_cents: 12900, paid_at: "2026-10-05T15:00:00Z", created_at: "2026-10-05T14:59:00Z", order_items: [{ quantity: 1 }] }]);
    m.fetchAdminOps.mockResolvedValue({
      products: [{ slug: "bpc-157", shown: true }],
      variants: [{ slug: "bpc-157", variant_id: "10mg", strength: "10 mg", price_cents: 6900, low_at: 10, threepl_sku: null, shown: true, archived_at: null }],
      lots: [lotRow({}), lotRow({ id: "l2", lot_number: "AP-BPC-2612", status: "draft", live_at: null, coa_path: null, sellable: 80, available: 80, ordered_qty: 80, counted_qty: 80, received_at: "2026-10-05T00:00:00Z" })],
    });
    m.waitingLots.mockResolvedValue([]);
    m.listRuns.mockResolvedValue([{ id: "r1", started_at: "2026-10-06T15:30:00Z", finished_at: "2026-10-06T15:31:00Z", welcome_sent: 0, cart_sent: 0, cart_skipped: 0, campaign_sent: 0, failures: 0, error_text: null }]);
    m.emailOverview.mockResolvedValue({ confirmed: 10, pending: 0, unsubscribed: 0, sent_30d: 100, sent_prior_30d: 0, bounces_30d: 0, complaints_30d: 0 });
    m.sendingCampaign.mockResolvedValue(null);
    m.listPartners.mockResolvedValue([{ id: "p1", code: "NORTH", created_at: "2026-10-05T16:00:00Z", customers: { full_name: "Ann North", organization: null } }]);
    m.listQueuedPayouts.mockResolvedValue([]);
    m.openInquiryTodos.mockResolvedValue({ count: 0, oldest: [] });
    m.openDisputeTodos.mockResolvedValue({ disputes: [], warnings: [] });
  });

  it("loads every section through the modules' own data functions; the nav count is the sum of their counts", async () => {
    const { loadTodos, todayNavCount } = await import("@/lib/today/today");
    const slots = await loadTodos();
    expect(slots.map((s) => s.key)).toEqual(["alerts", "disputes", "orders", "wholesale", "catalog", "email", "partners", "inquiries"]);
    expect(slots.map((s) => (s.sections ?? []).map((x) => `${x.key}:${x.n}`))).toEqual([["alerts:1"], [], ["orders:1"], [], ["stock:1", "lots:1"], [], ["partners:1"], []]);
    expect(slots.find((s) => s.key === "catalog")?.sections?.[1].lines[0].title).toBe("BPC-157 10 mg is missing its certificate");
    expect(m.listOrdersForOwner).toHaveBeenCalledWith("paid", { oldestFirst: true });
    expect(m.listPartners).toHaveBeenCalledWith("applied");
    expect(m.listRuns).toHaveBeenCalledWith(1);
    expect(await todayNavCount()).toBe(5);
  });

  it("a failing section shows as couldn't-load on its own; the others still load and count", async () => {
    m.fetchAdminOps.mockRejectedValue(new Error("catalog down"));
    m.listOpenAlerts.mockRejectedValue(new Error('relation "owner_alerts" does not exist'));
    const { loadTodos, todayNavCount } = await import("@/lib/today/today");
    const slots = await loadTodos();
    expect(slots.find((s) => s.key === "catalog")?.sections).toBeNull();
    expect(slots.find((s) => s.key === "alerts")?.sections).toBeNull();
    expect(slots.find((s) => s.key === "orders")?.sections?.[0].n).toBe(1);
    expect(console.error).toHaveBeenCalledWith("today: catalog section failed:", expect.any(Error));
    expect(await todayNavCount()).toBe(2); // orders 1 + partners 1
  });

  it("a synchronous throw inside a loader is still contained to its section", async () => {
    m.listRuns.mockImplementation(() => { throw new Error("client construction failed"); });
    const { loadTodos } = await import("@/lib/today/today");
    const slots = await loadTodos();
    expect(slots.find((s) => s.key === "email")?.sections).toBeNull();
    expect(slots.find((s) => s.key === "partners")?.sections).not.toBeNull();
  });

  it("numbers: the current and prior period, mapped into the view; any failure is { ok: false }", async () => {
    m.salesSummary.mockResolvedValueOnce(sum({ salesCents: 134650, orders: 5 })).mockResolvedValueOnce(sum({ salesCents: 110369, orders: 3 }));
    const { loadNumbers } = await import("@/lib/today/today");
    const r = await loadNumbers("today");
    expect(m.salesSummary).toHaveBeenNthCalledWith(1, { from: "2026-10-06T06:00:00.000Z", to: "2026-10-06T15:42:00.000Z" }, "hour");
    expect(m.salesSummary).toHaveBeenNthCalledWith(2, { from: "2026-10-05T06:00:00.000Z", to: "2026-10-05T15:42:00.000Z" }, "hour");
    expect(r.ok && r.view.sales).toBe("$1,346.50");
    m.salesSummary.mockRejectedValue(new Error("function admin_sales_summary does not exist"));
    expect(await loadNumbers("7d")).toEqual({ ok: false });
  });

  it("Disputes loads in its own slot through lib/disputes/data and counts toward the badge", async () => {
    m.openDisputeTodos.mockResolvedValue({ disputes: [listRow()], warnings: [warningRow()] });
    const { loadTodos, todayNavCount } = await import("@/lib/today/today");
    const slots = await loadTodos();
    expect(slots.find((s) => s.key === "disputes")?.sections?.[0]).toMatchObject({ key: "disputes", n: 2 });
    expect(await todayNavCount()).toBe(7);
  });

  it("Disputes failing (e.g. before disputes.sql is applied) shows on its own", async () => {
    m.openDisputeTodos.mockRejectedValue(new Error('relation "disputes" does not exist'));
    const { loadTodos } = await import("@/lib/today/today");
    const slots = await loadTodos();
    expect(slots.find((s) => s.key === "disputes")?.sections).toBeNull();
    expect(slots.find((s) => s.key === "orders")?.sections?.[0].n).toBe(1);
  });
});
