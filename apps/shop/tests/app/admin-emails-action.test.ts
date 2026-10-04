import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue } from "./../helpers/supabase-mock";

const requireOwner = vi.fn(), sendTracked = vi.fn(), listConfirmedEmails = vi.fn(), alertOwner = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/dal", () => ({ requireOwner }));
vi.mock("@/lib/email/data", () => ({ sendTracked, listConfirmedEmails }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));
vi.mock("@/data/catalog", () => ({
  compounds: [{ slug: "bpc-157", name: "BPC-157", variants: [{ strength: "10 mg" }], currentLot: { lot: "AP-2611", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-11-28", coaFile: "/coa/AP-2611.pdf" } }],
}));

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

  it("refuses lots that are unknown or already announced", async () => {
    from = fromQueue({ lot_announcements: [query({ data: [{ lots: ["AP-2611"], finished_at: "2026-11-29T00:00:00Z" }] })] });
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: false, error: "Nothing to send: AP-2611 isn't waiting to be announced." });
  });

  it("creates the announcement, sends to every confirmed subscriber, and finishes it", async () => {
    const insert = query({ data: { id: "ann1" } }), finish = query({});
    from = fromQueue({ lot_announcements: [query({ data: [] }), insert, finish] });
    listConfirmedEmails.mockResolvedValue(["a@b.co", "c@d.co"]);
    const { sendLotAlertAction } = await import("@/app/admin/emails/actions");
    expect(await sendLotAlertAction(["AP-2611"])).toEqual({ ok: true, sent: 2, failed: 0 });
    expect(sendTracked.mock.calls.map((c) => c[0].ref)).toEqual(["ann1", "ann1"]);
  });
});
