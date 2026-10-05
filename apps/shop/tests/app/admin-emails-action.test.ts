import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "./../helpers/supabase-mock";

const requireOwner = vi.fn(), sendTracked = vi.fn(), listConfirmedEmails = vi.fn(), alertOwner = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/email/data", () => ({ sendTracked, listConfirmedEmails }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/lib/catalog-live", () => ({
  getLiveCatalog: async () => ({ all: [], shown: [], lots: [
    { slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", status: "live", liveAt: "2026-11-29T00:00:00Z", onStore: true,
      lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" },
  ] }),
}));

const AP2611 = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" };

describe("lot alert actions", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of [requireOwner, sendTracked, listConfirmedEmails, alertOwner]) f.mockReset();
    requireOwner.mockResolvedValue({ id: "owner1", email: "owner@auraprotocols.com" });
    process.env.EMAIL_LINK_SECRET = "s"; process.env.MAILING_ADDRESS = "Aura Protocols LLC · 1 A St";
    sendTracked.mockResolvedValue("sent");
  });

  it("test-sends the alert to the owner only", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [] })] });
    const { sendLotAlertTestAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertTestAction(["AP-2611"])).toEqual({ ok: true, sent: 1 });
    expect(sendTracked.mock.calls[0][0]).toMatchObject({ email: "owner@auraprotocols.com", kind: "lot_alert" });
    expect(sendTracked.mock.calls[0][0].ref).toMatch(/^test-/);
  });

  it("test-send returns ok:false instead of throwing when the lot read fails", async () => {
    from = fromQueue({ lot_announcements: [query({ error: { message: "down" } })] });
    const { sendLotAlertTestAction } = await import("@/app/admin/emails/actions");
    const result = await sendLotAlertTestAction(["AP-2611"]);
    expect(result.ok).toBe(false);
  });

  it("refuses lots that are unknown or already announced", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [{ lots: ["AP-2611"], finished_at: "2026-11-29T00:00:00Z" }] })] });
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: false, error: "Nothing to send: AP-2611 isn't waiting to be announced." });
  });

  it("refuses a lot that's part of an unfinished announcement, pointing at resume", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [{ lots: ["AP-2611"], finished_at: null }] })] });
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: false, error: "An announcement for AP-2611 is unfinished — resume it." });
  });

  it("creates the announcement with a lots snapshot, sends to every confirmed subscriber, and finishes it", async () => {
    const insert = query({ data: { id: "ann1" } });
    const finish = query({});
    from = fromQueue({ lot_announcements: [query({ data: [] }), insert, finish], email_sends: [query({})] });
    listConfirmedEmails.mockResolvedValue(["a@b.co", "c@d.co"]);
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: true, sent: 2 });
    expect(sendTracked.mock.calls.map((c) => c[0].ref)).toEqual(["ann1", "ann1"]);
    expect(callArgs(insert, "insert")?.[0]).toMatchObject({ lots: ["AP-2611"], lots_snapshot: [AP2611] });
    const payload = callArgs(finish, "update")?.[0] as { recipients: number; finished_at: string };
    expect(payload.recipients).toBe(2);
    expect(payload.finished_at).toBeTruthy();
  });

  it("treats a 23505 on insert as an announcement already in progress", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [] }), query({ error: { code: "23505" } })] });
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: false, error: "An announcement is already in progress — resume it first." });
  });

  it("a non-23505 insert error fails loudly instead of silently", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [] }), query({ error: { message: "down" } })] });
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    const result = await sendLotAlertAction(["AP-2611"]);
    expect(result.ok).toBe(false);
  });

  it("a partial failure leaves finished_at untouched, reports failed:1, and alerts the owner once", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [] }), query({ data: { id: "ann1" } })] });
    listConfirmedEmails.mockResolvedValue(["a@b.co", "c@d.co"]);
    sendTracked.mockResolvedValueOnce("sent").mockRejectedValueOnce(new Error("throttled"));
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: true, sent: 1, failed: 1 });
    expect(alertOwner).toHaveBeenCalledTimes(1);
  });

  it("resumes an unfinished announcement, letting sendTracked's dedupe skip whoever already got it", async () => {
    const row = query({ data: { id: "ann1", lots_snapshot: [AP2611] } });
    const finish = query({});
    from = fromQueue({ lot_announcements: [row, finish], email_sends: [query({})] });
    listConfirmedEmails.mockResolvedValue(["a@b.co", "c@d.co"]);
    sendTracked.mockResolvedValueOnce("duplicate").mockResolvedValueOnce("sent");
    const { resumeLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await resumeLotAlertAction("ann1")).toEqual({ ok: true, sent: 1 });
    expect(sendTracked.mock.calls.map((c) => c[0].ref)).toEqual(["ann1", "ann1"]);
  });

  it("refuses to resume an announcement that's already finished or doesn't exist", async () => {
    from = fromQueue({ lot_announcements: [query({ data: null })] });
    const { resumeLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await resumeLotAlertAction("ann1")).toEqual({ ok: false, error: "Nothing to resume." });
  });
});
