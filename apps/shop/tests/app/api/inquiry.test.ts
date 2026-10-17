import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getAccountState: vi.fn(), accountIdByEmail: vi.fn(), createInquiry: vi.fn(), underInquiryLimit: vi.fn(), ackCountToday: vi.fn(),
  sendInquiryEmail: vi.fn(), sendEmail: vi.fn(), alertOwner: vi.fn(),
  getWholesaleSettings: vi.fn(), getLiveCatalog: vi.fn(), createQuoteRequest: vi.fn(), syncRequestInquiry: vi.fn(),
}));
vi.mock("@/lib/wholesale/data", () => ({ getWholesaleSettings: m.getWholesaleSettings }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalog: m.getLiveCatalog }));
vi.mock("@/lib/wholesale/quote-data", () => ({ createQuoteRequest: m.createQuoteRequest, syncRequestInquiry: m.syncRequestInquiry }));
vi.mock("@/lib/dal", () => ({ getAccountState: m.getAccountState }));
vi.mock("@/lib/account/data", () => ({ accountIdByEmail: m.accountIdByEmail }));
vi.mock("@/lib/inquiries/data", () => ({ createInquiry: m.createInquiry, underInquiryLimit: m.underInquiryLimit, ackCountToday: m.ackCountToday }));
vi.mock("@/lib/inquiries/send", () => ({ sendInquiryEmail: m.sendInquiryEmail, newToken: () => "f".repeat(32) }));
vi.mock("@/lib/ses", () => ({ sendEmail: m.sendEmail }));
vi.mock("@/lib/notify", () => ({ alertOwner: m.alertOwner }));
vi.mock("@/lib/gate", () => ({ hashIp: (ip: string) => `hash:${ip}` }));
vi.mock("@/lib/clock", () => ({ currentMs: () => Date.parse("2026-10-06T21:00:00Z") }));

const valid = { topic: "order", name: "Dana Whitfield", email: "Dana.W@example.com", orderNumber: "AP-1052", message: "Two vials arrived cracked." };
const post = (body: unknown) => new Request("http://localhost/api/inquiry", { method: "POST", headers: { "x-forwarded-for": "1.2.3.4" }, body: JSON.stringify(body) });

describe("POST /api/inquiry", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(m)) f.mockReset();
    m.getAccountState.mockResolvedValue({ customer: null, blocked: false, unfinished: false });
    m.accountIdByEmail.mockResolvedValue(null);
    m.underInquiryLimit.mockResolvedValue(true);
    m.ackCountToday.mockResolvedValue(0);
    m.createInquiry.mockResolvedValue({ id: "i1", ref: 1047 });
    m.sendInquiryEmail.mockResolvedValue({ messageId: "s1", headerId: "<s1@x>" });
    m.sendEmail.mockResolvedValue({ messageId: "o1" });
    process.env.INQUIRY_NOTIFY_EMAIL = "owner@example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://auraprotocols.com";
  });

  it("400s an unknown topic, a missing message, or a signed-out post without name/email", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post({ ...valid, topic: "affiliate" }))).status).toBe(400);
    expect((await POST(post({ ...valid, message: "" }))).status).toBe(400);
    expect((await POST(post({ topic: "order", message: "x" }))).status).toBe(400);
    expect(m.createInquiry).not.toHaveBeenCalled();
  });

  it("a filled honeypot looks like success and stores nothing", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    const res = await POST(post({ ...valid, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ref: null });
    expect(m.createInquiry).not.toHaveBeenCalled();
  });

  it("429s over the per-IP limit", async () => {
    m.underInquiryLimit.mockResolvedValue(false);
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(429);
    expect(m.underInquiryLimit).toHaveBeenCalledWith("hash:1.2.3.4", Date.parse("2026-10-06T21:00:00Z"));
  });

  it("signed out: stores it, links an account with that email, confirms to the customer, notifies the owner", async () => {
    m.accountIdByEmail.mockResolvedValue("c9");
    const { POST } = await import("@/app/api/inquiry/route");
    const res = await POST(post(valid));
    expect(await res.json()).toEqual({ ok: true, ref: "Q-1047", orderNumber: null });
    expect(m.createInquiry).toHaveBeenCalledWith({
      topic: "order", subject: "Order question — AP-1052", name: "Dana Whitfield", email: "dana.w@example.com", organization: null,
      orderNumber: "AP-1052", message: "Two vials arrived cracked.", customerId: "c9", token: "f".repeat(32), ipHash: "hash:1.2.3.4",
    });
    expect(m.sendInquiryEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "dana.w@example.com", subject: "We've got your message [Q-1047]", token: "f".repeat(32), ignore: ["Dana Whitfield", "dana.w@example.com"] }));
    expect(m.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com", subject: "New inquiry Q-1047 · Order question — Dana Whitfield" }));
    expect(m.sendEmail.mock.calls[0][0].html).toContain("https://auraprotocols.com/admin/inquiries/Q-1047");
  });

  it("signed in: name and email come from the account, linked to it", async () => {
    m.getAccountState.mockResolvedValue({ customer: { id: "c1", fullName: "Marcus Lee", email: "m.lee@example.com" }, blocked: false, unfinished: false });
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post({ topic: "product", message: "Which lot ships now?" }));
    expect(m.createInquiry).toHaveBeenCalledWith(expect.objectContaining({ name: "Marcus Lee", email: "m.lee@example.com", customerId: "c1", subject: "Product or COA question" }));
    expect(m.accountIdByEmail).not.toHaveBeenCalled();
  });

  it("500 when the insert fails; nothing emailed", async () => {
    m.createInquiry.mockRejectedValue(new Error("down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(500);
    expect(m.sendInquiryEmail).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("still 200 when the confirmation fails — the owner is alerted", async () => {
    m.sendInquiryEmail.mockRejectedValue(new Error("ses down"));
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(200);
    expect(m.alertOwner).toHaveBeenCalledWith("Inquiry acknowledgement not sent", expect.stringContaining("Q-1047"));
  });

  it("still 200 when the owner notification fails — alertOwner (never throws), not just a console log", async () => {
    m.sendEmail.mockRejectedValue(new Error("ses down"));
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(200);
    expect(m.alertOwner).toHaveBeenCalledWith("Inquiry owner notification not sent", expect.stringContaining("Q-1047"));
  });

  it("strips control characters from name, organization and order number — message keeps its newlines", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post({
      topic: "wholesale", name: "Dr. Lab\r\nBcc: x@evil.example", email: "lab@example.edu",
      organization: "Example\x07 University", orderNumber: "AP-1052", message: "Line one\nLine two",
    }));
    expect(m.createInquiry).toHaveBeenCalledWith(expect.objectContaining({
      name: "Dr. LabBcc: x@evil.example", organization: "Example University", orderNumber: "AP-1052", message: "Line one\nLine two",
    }));
  });

  it("skips the acknowledgement at the per-email daily limit — still saves and notifies the owner", async () => {
    m.ackCountToday.mockResolvedValue(3);
    const { POST } = await import("@/app/api/inquiry/route");
    const res = await POST(post(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ref: "Q-1047", orderNumber: null });
    expect(m.createInquiry).toHaveBeenCalled();
    expect(m.sendInquiryEmail).not.toHaveBeenCalled();
    expect(m.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com" }));
  });

  it("sends the acknowledgement under the per-email daily limit", async () => {
    m.ackCountToday.mockResolvedValue(2);
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post(valid));
    expect(m.sendInquiryEmail).toHaveBeenCalled();
  });

  it("greets 'Hi there' when the name isn't letters/space/'/- or is too long", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post({ ...valid, name: "Dana123" }));
    expect(m.sendInquiryEmail.mock.calls[0][0].html).toContain("Hi there");
    m.sendInquiryEmail.mockClear();
    await POST(post({ ...valid, name: "Dana Whitfield" }));
    expect(m.sendInquiryEmail.mock.calls[0][0].html).toContain("Hi Dana");
  });

  it("the wholesale form keeps working (topic wholesale, organization in the subject)", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post({ topic: "wholesale", name: "Dr. Lab", email: "lab@example.edu", organization: "Example University", message: "Quarterly volume." }));
    expect(m.createInquiry).toHaveBeenCalledWith(expect.objectContaining({ topic: "wholesale", subject: "Wholesale inquiry — Example University", organization: "Example University" }));
  });

  // ---------- volume-quote requests (quote-requests.sql) ----------
  describe("a volume-quote request from the order sheet", () => {
    const buyer = { id: "c1", fullName: "Dana Reyes", email: "dana@lab.org", wholesale: { enabledAt: "2026-10-01T00:00:00Z", disabledAt: null } };
    const kit = (slug: string) => ({ slug, name: slug.toUpperCase(), designation: null, chemicalClass: "Peptide Fragments", variants: [{ id: "10mg", strength: "10 mg", priceUsd: 65, wholesale: true }] });
    const req = { topic: "wholesale", message: "Volume quote request (30 kits):\n- BPC-157 10 mg: 30 kits", quoteLines: [{ slug: "bpc-157", variantId: "10mg", kits: 30 }] };
    beforeEach(() => {
      m.getAccountState.mockResolvedValue({ customer: buyer, blocked: false, unfinished: false });
      m.getWholesaleSettings.mockResolvedValue({ open: true, tiers: [{ minKits: 5, pct: 30 }, { minKits: 20, pct: 40 }], depositPct: 40, minKits: 5, runDays: 14, leadDays: 22, nextCutoffOverride: null, kitBoxCents: 150 });
      m.getLiveCatalog.mockResolvedValue({ shown: [kit("bpc-157")] });
      m.createQuoteRequest.mockResolvedValue({ id: "o1", orderNumber: "AP-1063" });
    });

    it("becomes an order: the buyer gets the Quote requested email with its link, the owner a pricing link", async () => {
      const { POST } = await import("@/app/api/inquiry/route");
      const res = await POST(post(req));
      expect(await res.json()).toEqual({ ok: true, ref: "Q-1047", orderNumber: "AP-1063" });
      expect(m.createQuoteRequest).toHaveBeenCalledWith(expect.objectContaining({ customerId: "c1", inquiryId: "i1", kitBoxCents: 150,
        lines: [{ slug: "bpc-157", variantId: "10mg", kits: 30, pct: 0 }], cutoffOn: "2026-10-19" }));
      const ack = m.sendInquiryEmail.mock.calls[0][0];
      expect(ack.subject).toBe("Quote requested: order AP-1063 [Q-1047]");
      expect(ack.html).toContain("https://auraprotocols.com/order/AP-1063");
      expect(ack.html).toContain("Within 12 hours");
      const owner = m.sendEmail.mock.calls[0][0];
      expect(owner.subject).toContain("Quote request AP-1063 · 30 kits — Dana Reyes");
      expect(owner.html).toContain("https://auraprotocols.com/admin/orders/AP-1063");
      // the order is the to-do: its inquiry is marked answered (one to-do, not two)
      expect(m.syncRequestInquiry).toHaveBeenCalledWith("i1", "requested", "AP-1063");
    });

    it("stays a plain inquiry when the buyer isn't a wholesale buyer, wholesale is closed, or the kits don't qualify (owner alerted)", async () => {
      const { POST } = await import("@/app/api/inquiry/route");
      m.getAccountState.mockResolvedValue({ customer: { ...buyer, wholesale: { enabledAt: null, disabledAt: null } }, blocked: false, unfinished: false });
      expect((await (await POST(post(req))).json()).orderNumber).toBeNull();
      m.getAccountState.mockResolvedValue({ customer: buyer, blocked: false, unfinished: false });
      m.getWholesaleSettings.mockResolvedValue({ open: false });
      expect((await (await POST(post(req))).json()).orderNumber).toBeNull();
      m.getWholesaleSettings.mockResolvedValue({ open: true, tiers: [{ minKits: 5, pct: 30 }], depositPct: 40, minKits: 5, runDays: 14, leadDays: 22, nextCutoffOverride: null, kitBoxCents: 150 });
      expect((await (await POST(post({ ...req, quoteLines: [{ slug: "bpc-157", variantId: "10mg", kits: 12 }] }))).json()).orderNumber).toBeNull();
      expect(m.alertOwner).toHaveBeenCalledWith("Quote request not made into an order", expect.stringContaining("under 30 kits"));
      expect(m.createQuoteRequest).not.toHaveBeenCalled();
    });

    it("a failed order save keeps the inquiry and alerts the owner", async () => {
      m.createQuoteRequest.mockRejectedValue(new Error("db down"));
      const { POST } = await import("@/app/api/inquiry/route");
      expect(await (await POST(post(req))).json()).toEqual({ ok: true, ref: "Q-1047", orderNumber: null });
      expect(m.alertOwner).toHaveBeenCalledWith("Quote request not made into an order", expect.stringContaining("db down"));
      expect(m.sendInquiryEmail.mock.calls[0][0].subject).toBe("We've got your message [Q-1047]");
    });
  });
});
