import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const getPartnerById = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/partners/data", () => ({ getPartnerById }));

const partner = { id: "p1", code: "QUINN10", status: "approved", customer_id: "c1", customers: { full_name: "Avery Quinn", organization: null } };
const now = Date.parse("2026-10-06T18:00:00Z");

describe("getPartnerDetail", () => {
  beforeEach(() => { vi.resetModules(); getPartnerById.mockReset(); });

  it("returns null for an unknown partner", async () => {
    getPartnerById.mockResolvedValue(null);
    from = fromQueue({});
    const { getPartnerDetail } = await import("@/lib/partners/detail");
    expect(await getPartnerDetail("p9", 1, now)).toBeNull();
  });

  it("totals commissions, merges adjustments newest first and pages them", async () => {
    getPartnerById.mockResolvedValue(partner);
    from = fromQueue({
      partner_clicks_daily: [query({ data: [{ clicks: 1000 }, { clicks: 284 }] })],
      commissions: [query({ data: [
        { id: "k1", order_id: "o1", base_cents: 118_000, rate_pct: 15, amount_cents: 17_700, state: "pending", clears_at: null, created_at: "2026-10-04T10:00:00Z", orders: { order_number: "AP-1037" } },
        { id: "k2", order_id: "o2", base_cents: 54_000, rate_pct: 15, amount_cents: 8_100, state: "payable", clears_at: "2026-10-01T00:00:00Z", created_at: "2026-09-18T10:00:00Z", orders: { order_number: "AP-1012" } },
        { id: "k3", order_id: "o3", base_cents: 9_600, rate_pct: 10, amount_cents: 960, state: "void", clears_at: null, created_at: "2026-09-01T10:00:00Z", orders: { order_number: "AP-1002" } },
      ] })],
      commission_adjustments: [query({ data: [{ id: "a1", order_id: "o4", amount_cents: -3_375, reason: "chargeback", created_at: "2026-09-28T10:00:00Z", orders: { order_number: "AP-1018" } }] })],
      payouts: [query({ data: [{ id: "y1", run_date: "2026-10-01", cash_cents: 14_820, credit_cents: 19_266, status: "paid", reference: "ACH-77120", paid_at: "2026-10-02T15:00:00Z" }] })],
    });
    const { getPartnerDetail } = await import("@/lib/partners/detail");
    const d = (await getPartnerDetail("p1", 1, now))!;
    expect(d.clicks30).toBe(1284);
    expect(d.orders).toBe(2);                    // void commissions don't count
    expect(d.payableCents).toBe(8_100);
    expect(d.unpaidCents).toBe(25_800);          // pending + clearing + payable (forfeited on suspend)
    expect(d.creditIssuedCents).toBe(19_266);
    expect(d.lines.map((l) => l.id)).toEqual(["k1", "a1", "k2", "k3"]);
    expect(d.lines[1]).toMatchObject({ kind: "adjustment", amountCents: -3_375, orderNumber: "AP-1018", reason: "chargeback" });
    expect(d.totalLines).toBe(4);
  });

  it("throws when a read fails", async () => {
    getPartnerById.mockResolvedValue(partner);
    from = fromQueue({
      partner_clicks_daily: [query({ data: [] })], commissions: [query({ error: { message: "down" } })],
      commission_adjustments: [query({ data: [] })], payouts: [query({ data: [] })],
    });
    const { getPartnerDetail } = await import("@/lib/partners/detail");
    await expect(getPartnerDetail("p1", 1, now)).rejects.toThrow(/partner commissions read failed/);
  });
});
