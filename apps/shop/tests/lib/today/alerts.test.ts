import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: null as null | ((t: string) => unknown) }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ rpc: db.rpc, from: (t: string) => db.from!(t) }) }));

const row = (o: Record<string, unknown> = {}) => ({
  id: "a1", title: "T", detail: "D", count: 1, first_at: "2026-10-06T14:00:00Z", last_at: "2026-10-06T14:00:00Z",
  resolved_at: null, note: null, customers: null, ...o,
});

describe("owner alerts data", () => {
  beforeEach(() => { vi.resetModules(); db.rpc.mockReset(); });

  it("stores through record_owner_alert with a normalised title and a capped detail", async () => {
    db.rpc.mockResolvedValue({ data: "a1", error: null });
    const { recordOwnerAlert } = await import("@/lib/today/alerts");
    await recordOwnerAlert("  Email run \n had failures ", "x".repeat(5000));
    expect(db.rpc).toHaveBeenCalledWith("record_owner_alert", { p_title: "Email run had failures", p_detail: expect.any(String) });
    expect(db.rpc.mock.calls[0][1].p_detail).toHaveLength(4000);
  });

  it("a failed store throws (alertOwner catches and logs it)", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: 'relation "owner_alerts" does not exist' } });
    const { recordOwnerAlert } = await import("@/lib/today/alerts");
    await expect(recordOwnerAlert("t", "d")).rejects.toThrow(/record owner alert failed/);
  });

  it("open alerts: unresolved, newest first; a read error throws", async () => {
    const q = query({ data: [row()] });
    db.from = fromQueue({ owner_alerts: [q, query({ error: { message: "down" } })] });
    const { listOpenAlerts } = await import("@/lib/today/alerts");
    expect((await listOpenAlerts())[0]).toMatchObject({ id: "a1", title: "T", resolved_by_name: null });
    expect(callArgs(q, "is")).toEqual(["resolved_at", null]);
    expect(callArgs(q, "order")).toEqual(["last_at", { ascending: false }]);
    await expect(listOpenAlerts()).rejects.toThrow(/open alerts read failed/);
  });

  it("past alerts: the last 90 days or still open; open first; the resolver's first name", async () => {
    const q = query({ data: [
      row({ id: "done", resolved_at: "2026-10-06T15:00:00Z", last_at: "2026-10-06T15:00:00Z", customers: { full_name: "Kearney Adams" }, note: "resent by hand" }),
      row({ id: "open", last_at: "2026-10-01T00:00:00Z" }),
    ] });
    db.from = fromQueue({ owner_alerts: [q] });
    const { listPastAlerts } = await import("@/lib/today/alerts");
    const out = await listPastAlerts(Date.parse("2026-10-06T15:42:00Z"));
    expect(out.map((a) => a.id)).toEqual(["open", "done"]);
    expect(out[1]).toMatchObject({ resolved_by_name: "Kearney", note: "resent by hand" });
    expect(callArgs(q, "or")).toEqual(["resolved_at.is.null,last_at.gte.2026-07-08T15:42:00.000Z"]);
    expect(callArgs(q, "limit")).toEqual([500]);
  });

  it("resolve: only while still open; a stale one returns false", async () => {
    const ok = query({ data: [{ id: "a1" }] }), stale = query({ data: [] });
    db.from = fromQueue({ owner_alerts: [ok, stale] });
    const { resolveAlert } = await import("@/lib/today/alerts");
    expect(await resolveAlert("a1", "owner1", "fixed in Catalog")).toBe(true);
    expect(callArgs(ok, "update")?.[0]).toMatchObject({ resolved_by: "owner1", note: "fixed in Catalog", resolved_at: expect.any(String) });
    expect(callArgs(ok, "eq")).toEqual(["id", "a1"]);
    expect(callArgs(ok, "is")).toEqual(["resolved_at", null]);
    expect(await resolveAlert("a1", "owner1", null)).toBe(false);
  });
});
