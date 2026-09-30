import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const clearDueCommissions = vi.fn();
const runPayouts = vi.fn();
const listQueuedPayouts = vi.fn();
const listUnfinishedPayoutRuns = vi.fn();
const sweepShippedCommissions = vi.fn();
const getPartnerById = vi.fn();
const partnerEmail = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/partners/ledger", () => ({
  clearDueCommissions, runPayouts, listQueuedPayouts, listUnfinishedPayoutRuns, sweepShippedCommissions,
}));
vi.mock("@/lib/partners/data", () => ({ getPartnerById, partnerEmail }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));

const get = (auth?: string) => new Request("http://localhost/api/cron/partners-daily", { headers: auth ? { authorization: auth } : {} });

describe("GET /api/cron/partners-daily", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [clearDueCommissions, runPayouts, listQueuedPayouts, listUnfinishedPayoutRuns, sweepShippedCommissions, getPartnerById, partnerEmail, sendOrAlert, alertOwner]) f.mockReset();
    process.env.CRON_SECRET = "s3cret";
    clearDueCommissions.mockResolvedValue(3);
    listUnfinishedPayoutRuns.mockResolvedValue([]);
    sweepShippedCommissions.mockResolvedValue({ swept: 0, errors: [] });
  });
  afterEach(() => vi.useRealTimers());

  it("requires the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    expect((await GET(get())).status).toBe(401);
  });

  it("only clears commission on ordinary days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    expect(await (await GET(get("Bearer s3cret"))).json()).toEqual({
      cleared: 3, resumed: [], swept: { commissions: 0, errors: 0 }, payoutRun: null,
    });
    expect(runPayouts).not.toHaveBeenCalled();
  });

  it("runs payouts on the 15th, emails partners credited and the owner's cash list", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    runPayouts.mockResolvedValue({ skipped: false, results: [{ partnerId: "p1", cashCents: 0, creditValueCents: 7020, carryCents: 5400 }] });
    getPartnerById.mockResolvedValue({ id: "p1", customer_id: "u1", code: "SMITHLAB" });
    partnerEmail.mockResolvedValue("sam@smithlab.org");
    listQueuedPayouts.mockResolvedValue([{ run_date: "2026-10-15", cash_cents: 21240, partners: { code: "BENCHNOTES", payout_details_hint: "ACH · checking ••••7310 · Wells Fargo" } }]);
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const body = await (await GET(get("Bearer s3cret"))).json();
    expect(runPayouts).toHaveBeenCalledWith("2026-10-15");
    expect(body.payoutRun).toEqual({ runDate: "2026-10-15", partners: 1, cashQueued: 1 });
    expect(sendOrAlert.mock.calls.map((c) => c[0].to)).toEqual(["sam@smithlab.org", "owner@example.com"]);
  });

  it("alerts the owner and returns 500 when the run fails", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-01T10:00:00Z"));
    runPayouts.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    expect((await GET(get("Bearer s3cret"))).status).toBe(500);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Payout run failed"), expect.stringContaining("db down"));
  });

  // 1a: resume a stuck earlier payout run, on any day.
  it("resumes an earlier unfinished payout run even on an ordinary day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    listUnfinishedPayoutRuns.mockResolvedValue(["2026-09-15"]);
    runPayouts.mockResolvedValue({ skipped: false, results: [{ partnerId: "p2", cashCents: 0, creditValueCents: 0, carryCents: 0 }], failures: [] });
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const body = await (await GET(get("Bearer s3cret"))).json();
    expect(listUnfinishedPayoutRuns).toHaveBeenCalledWith("2026-10-07");
    expect(runPayouts).toHaveBeenCalledWith("2026-09-15");
    expect(body.resumed).toEqual([{ runDate: "2026-09-15", partners: 1, failures: 0 }]);
    expect(body.payoutRun).toBeNull();
  });

  it("alerts the owner when a resumed run still has failures, without stopping the rest of the job", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    listUnfinishedPayoutRuns.mockResolvedValue(["2026-09-15"]);
    runPayouts.mockResolvedValue({ skipped: false, results: [], failures: [{ partnerId: "p9", error: "boom" }] });
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const res = await GET(get("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.resumed).toEqual([{ runDate: "2026-09-15", partners: 0, failures: 1 }]);
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("2026-09-15"), expect.stringContaining("boom"));
  });

  it("alerts the owner and still runs the other jobs when listing unfinished runs throws", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    listUnfinishedPayoutRuns.mockRejectedValue(new Error("select failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const res = await GET(get("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.cleared).toBe(3);
    expect(body.swept).toEqual({ commissions: 0, errors: 0 });
    expect(alertOwner).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("select failed"));
  });

  // 1b: sweep pending commissions whose order has since shipped.
  it("sweeps pending commissions for shipped orders onto the clearing timer", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    sweepShippedCommissions.mockResolvedValue({ swept: 2, errors: [] });
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const body = await (await GET(get("Bearer s3cret"))).json();
    expect(body.swept).toEqual({ commissions: 2, errors: 0 });
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("alerts the owner with the sweep errors without failing the request", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    sweepShippedCommissions.mockResolvedValue({ swept: 1, errors: ["o5: db timeout"] });
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const res = await GET(get("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.swept).toEqual({ commissions: 1, errors: 1 });
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Sweep"), expect.stringContaining("o5: db timeout"));
  });

  // 1c: a thrown sweep failure must not skip clearing or a same-day payout run.
  it("still runs today's payout when the sweep job throws", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-15T10:00:00Z"));
    sweepShippedCommissions.mockRejectedValue(new Error("sweep down"));
    runPayouts.mockResolvedValue({ skipped: false, results: [], failures: [] });
    listQueuedPayouts.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    const res = await GET(get("Bearer s3cret"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(runPayouts).toHaveBeenCalledWith("2026-10-15");
    expect(body.payoutRun).toEqual({ runDate: "2026-10-15", partners: 0, cashQueued: 0 });
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining("Sweep"), expect.stringContaining("sweep down"));
  });
});
