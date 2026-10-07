import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/ses", () => ({ sendEmail: m.sendEmail }));

describe("sendInquiryEmail", () => {
  beforeEach(() => {
    vi.resetModules(); m.sendEmail.mockReset();
    process.env.INBOUND_MAIL_DOMAIN = "in.auraprotocols.com";
    process.env.SES_FROM_EMAIL = "support@send.auraprotocols.com";
    delete process.env.INQUIRY_FROM_EMAIL;
    process.env.AWS_REGION = "us-east-2";
  });

  it("scans, then sends as Aura Protocols with the thread's reply address and threading headers", async () => {
    m.sendEmail.mockResolvedValue({ messageId: "0100abc" });
    const { sendInquiryEmail } = await import("@/lib/inquiries/send");
    const r = await sendInquiryEmail({ to: "dana@example.com", subject: "Re: x [Q-1]", html: "<p>Hi</p>", text: "Hi", token: "0123456789abcdef0123456789abcdef", inReplyTo: "<c@gmail>", references: ["<a@x>", "<c@gmail>"] });
    expect(m.sendEmail).toHaveBeenCalledWith({
      to: "dana@example.com", subject: "Re: x [Q-1]", html: "<p>Hi</p>", text: "Hi",
      fromName: "Aura Protocols", fromEmail: "support@send.auraprotocols.com",
      replyTo: "r-0123456789abcdef0123456789abcdef@in.auraprotocols.com",
      headers: [{ name: "In-Reply-To", value: "<c@gmail>" }, { name: "References", value: "<a@x> <c@gmail>" }],
    });
    expect(r).toEqual({ messageId: "0100abc", headerId: "<0100abc@us-east-2.amazonses.com>" });
  });

  it("uses INQUIRY_FROM_EMAIL once auraprotocols.com is verified", async () => {
    process.env.INQUIRY_FROM_EMAIL = "support@auraprotocols.com";
    m.sendEmail.mockResolvedValue({ messageId: "x" });
    const { sendInquiryEmail } = await import("@/lib/inquiries/send");
    await sendInquiryEmail({ to: "a@b.c", subject: "s", html: "<p>h</p>", text: "h", token: "0123456789abcdef0123456789abcdef" });
    expect(m.sendEmail.mock.calls[0][0]).toMatchObject({ fromEmail: "support@auraprotocols.com", headers: [] });
  });

  it("refuses banned copy before anything is sent", async () => {
    const { sendInquiryEmail } = await import("@/lib/inquiries/send");
    await expect(sendInquiryEmail({ to: "a@b.c", subject: "s", html: "<p>the dose</p>", text: "the dose", token: "0123456789abcdef0123456789abcdef" })).rejects.toThrow(/compliance/);
    expect(m.sendEmail).not.toHaveBeenCalled();
  });

  it("throws without the inbound domain (never sends an unanswerable email)", async () => {
    delete process.env.INBOUND_MAIL_DOMAIN;
    const { sendInquiryEmail } = await import("@/lib/inquiries/send");
    await expect(sendInquiryEmail({ to: "a@b.c", subject: "s", html: "<p>h</p>", text: "h", token: "0123456789abcdef0123456789abcdef" })).rejects.toThrow(/INBOUND_MAIL_DOMAIN/);
  });

  it("us-east-1 uses email.amazonses.com in the Message-ID; tokens are 32 hex", async () => {
    const { newToken, sesHeaderId } = await import("@/lib/inquiries/send");
    expect(sesHeaderId("abc", "us-east-1")).toBe("<abc@email.amazonses.com>");
    expect(newToken()).toMatch(/^[0-9a-f]{32}$/);
  });
});
