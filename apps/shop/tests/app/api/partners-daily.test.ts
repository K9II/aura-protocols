import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const clearDueCommissions = vi.fn();
const runPayouts = vi.fn();
const listQueuedPayouts = vi.fn();
const getPartnerById = vi.fn();
const partnerEmail = vi.fn();
const sendOrAlert = vi.fn();
const alertOwner = vi.fn();
vi.mock("@/lib/partners/ledger", () => ({ clearDueCommissions, runPayouts, listQueuedPayouts }));
vi.mock("@/lib/partners/data", () => ({ getPartnerById, partnerEmail }));
vi.mock("@/lib/notify", () => ({ sendOrAlert, alertOwner, alertAddress: () => "owner@example.com" }));

const get = (auth?: string) => new Request("http://localhost/api/cron/partners-daily", { headers: auth ? { authorization: auth } : {} });

describe("GET /api/cron/partners-daily", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [clearDueCommissions, runPayouts, listQueuedPayouts, getPartnerById, partnerEmail, sendOrAlert, alertOwner]) f.mockReset();
    process.env.CRON_SECRET = "s3cret";
    clearDueCommissions.mockResolvedValue(3);
  });
  afterEach(() => vi.useRealTimers());

  it("requires the cron secret", async () => {
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    expect((await GET(get())).status).toBe(401);
  });

  it("only clears commission on ordinary days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-07T10:00:00Z"));
    const { GET } = await import("@/app/api/cron/partners-daily/route");
    expect(await (await GET(get("Bearer s3cret"))).json()).toEqual({ cleared: 3, payoutRun: null });
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
});
