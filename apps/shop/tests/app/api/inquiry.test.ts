import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  getAccountState: vi.fn(), accountIdByEmail: vi.fn(), createInquiry: vi.fn(), underInquiryLimit: vi.fn(),
  sendInquiryEmail: vi.fn(), sendEmail: vi.fn(), alertOwner: vi.fn(),
}));
vi.mock("@/lib/dal", () => ({ getAccountState: m.getAccountState }));
vi.mock("@/lib/account/data", () => ({ accountIdByEmail: m.accountIdByEmail }));
vi.mock("@/lib/inquiries/data", () => ({ createInquiry: m.createInquiry, underInquiryLimit: m.underInquiryLimit }));
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
    expect(await res.json()).toEqual({ ok: true, ref: "Q-1047" });
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

  it("the wholesale form keeps working (topic wholesale, organization in the subject)", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    await POST(post({ topic: "wholesale", name: "Dr. Lab", email: "lab@example.edu", organization: "Example University", message: "Quarterly volume." }));
    expect(m.createInquiry).toHaveBeenCalledWith(expect.objectContaining({ topic: "wholesale", subject: "Wholesale inquiry — Example University", organization: "Example University" }));
  });
});
