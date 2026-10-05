import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

let from: ReturnType<typeof fromQueue>;
const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t), rpc }) }));
const logEmailAdminEvent = vi.fn();
vi.mock("@/lib/email/admin-data", () => ({ logEmailAdminEvent }));
const getLiveCatalog = vi.fn();
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog }));
const getCodeById = vi.fn(), codeStatsById = vi.fn();
vi.mock("@/lib/discounts/data", () => ({ getCodeById, codeStatsById }));

const liveLot = (lot: string, o: Record<string, unknown> = {}) => ({ slug: "bpc-157", compoundName: "BPC-157", variantId: "10mg", strength: "10 mg", status: "live", liveAt: "2026-10-02T00:00:00Z", onStore: true, lot, purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-10-02", coaFile: `/coa/${lot}.pdf`, ...o });
const fields = { name: "N", subject: "S", previewText: "", audience: "all" as const, content: { headline: "H", body: "", buttonLabel: "", buttonPath: "" }, discountCodeId: null, lots: [] };

describe("campaign data", () => {
  beforeEach(() => { vi.resetModules(); rpc.mockReset(); logEmailAdminEvent.mockReset(); getLiveCatalog.mockReset(); getCodeById.mockReset(); codeStatsById.mockReset(); });

  it("lot choices: waiting lots minus announced ones and lots in other open campaigns", async () => {
    getLiveCatalog.mockResolvedValue({ lots: [liveLot("AP-1"), liveLot("AP-2"), liveLot("AP-3"), liveLot("AP-4", { onStore: false }), liveLot("AP-5", { status: "sold_out" })] });
    from = fromQueue({
      lot_announcements: [query({ data: [{ lots: ["AP-1"] }] })],
      campaigns: [query({ data: [
        { id: "k-sent", status: "sent", lots_snapshot: [{ lot: "AP-2" }] },
        { id: "k-other", status: "draft", lots_snapshot: [{ lot: "AP-3" }] },
      ] })],
    });
    const { lotChoices } = await import("@/lib/email/campaigns/data");
    expect((await lotChoices(null)).map((l) => l.lot)).toEqual([]);
  });

  it("a draft's own lots stay choosable", async () => {
    getLiveCatalog.mockResolvedValue({ lots: [liveLot("AP-3")] });
    from = fromQueue({
      lot_announcements: [query({ data: [] })],
      campaigns: [query({ data: [{ id: "k-me", status: "draft", lots_snapshot: [{ lot: "AP-3" }] }] })],
    });
    const { lotChoices } = await import("@/lib/email/campaigns/data");
    expect((await lotChoices("k-me")).map((l) => l.lot)).toEqual(["AP-3"]);
  });

  it("creates a draft (with the lots snapshot) and logs it", async () => {
    const ins = query({ data: { id: "k1" } });
    from = fromQueue({ campaigns: [ins] });
    const { createCampaign } = await import("@/lib/email/campaigns/data");
    const lot = { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-1", purityPct: 99.4, method: "HPLC+MS" as const, testedOn: "2026-10-02", coaFile: "/coa/AP-1.pdf" };
    expect(await createCampaign("new_lots", { ...fields, lots: ["AP-1"] }, [lot], "owner1")).toBe("k1");
    expect(callArgs(ins, "insert")?.[0]).toMatchObject({ kind: "new_lots", status: "draft", name: "N", subject: "S", preview_text: "", audience: "all", lots_snapshot: [lot], created_by: "owner1", content: fields.content });
    expect(logEmailAdminEvent).toHaveBeenCalledWith({ action: "created", target: "k1", actor: "owner1" });
  });

  it("updates only a draft; a stale update throws", async () => {
    from = fromQueue({ campaigns: [query({ data: [] })] });
    const { updateDraft } = await import("@/lib/email/campaigns/data");
    await expect(updateDraft("k1", fields, [])).rejects.toThrow(/changed/);
  });

  it("moves: schedule needs draft, unschedule needs scheduled, stop needs sending", async () => {
    const sched = query({ data: [{ id: "k1" }] });
    from = fromQueue({ campaigns: [sched] });
    const { moveCampaign } = await import("@/lib/email/campaigns/data");
    await moveCampaign("k1", "draft", "scheduled", "owner1", { scheduledFor: "2026-10-08T15:00:00.000Z" });
    expect(callArgs(sched, "update")?.[0]).toMatchObject({ status: "scheduled", scheduled_for: "2026-10-08T15:00:00.000Z" });
    expect(sched.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toContainEqual(["status", "draft"]);
    expect(logEmailAdminEvent).toHaveBeenCalledWith({ action: "scheduled", target: "k1", actor: "owner1", note: "2026-10-08T15:00:00.000Z" });
    await expect(moveCampaign("k1", "sent", "draft", "owner1")).rejects.toThrow(/Not allowed/);
  });

  it("start: maps the RPC's busy and stale errors", async () => {
    const { startCampaign } = await import("@/lib/email/campaigns/data");
    rpc.mockResolvedValueOnce({ data: 2310, error: null });
    expect(await startCampaign("k1", "owner1", "draft")).toEqual({ ok: true, recipients: 2310 });
    expect(rpc).toHaveBeenCalledWith("admin_start_campaign", { p_id: "k1", p_actor: "owner1", p_from: "draft" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "campaign_busy" } });
    expect(await startCampaign("k1", "owner1", "draft")).toEqual({ ok: false, reason: "busy" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "stale_campaign" } });
    expect(await startCampaign("k1", "owner1", "draft")).toEqual({ ok: false, reason: "stale" });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    expect(await startCampaign("k1", "owner1", "draft")).toEqual({ ok: false, reason: "busy" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    await expect(startCampaign("k1", "owner1", "draft")).rejects.toThrow();
  });

  it("code facts combine the code row with its held + used count", async () => {
    getCodeById.mockResolvedValue({ id: "c1", code: "OCT10", status: "active", starts_at: null, ends_at: null, max_uses: 500, kind: "item_pct", value: 10, stack_on_top: false, free_shipping: false, min_order_cents: null, include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [], once_per_customer: true });
    codeStatsById.mockResolvedValue(new Map([["c1", { uses: 7, held: 2, revenueCents: 0, discountCents: 0, cappedOrders: 0 }]]));
    const { codeForCampaign } = await import("@/lib/email/campaigns/data");
    const r = await codeForCampaign("c1");
    expect(r?.facts).toEqual({ code: "OCT10", status: "active", startsAt: null, endsAt: null, maxUses: 500, uses: 9 });
    expect(r?.render).toEqual({ code: "OCT10", summary: "10% off items", endsAt: null, oncePerCustomer: true, minOrderCents: null });
  });
});
