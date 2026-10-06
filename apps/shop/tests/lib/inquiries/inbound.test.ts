// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inquiry } from "../../helpers/inquiry-fixtures";

const raw = new Uint8Array(readFileSync(join(__dirname, "..", "..", "fixtures", "mail", "reply-with-photo.eml")));
const TOKEN = "0123456789abcdef0123456789abcdef";
const d = vi.hoisted(() => ({
  seenSesMessage: vi.fn(), getInquiry: vi.fn(), recordInbound: vi.fn(), recordUnmatched: vi.fn(), uploadInquiryFile: vi.fn(), getRawEmail: vi.fn(),
}));
vi.mock("@/lib/inquiries/data", () => ({ seenSesMessage: d.seenSesMessage, getInquiry: d.getInquiry, recordInbound: d.recordInbound, recordUnmatched: d.recordUnmatched, uploadInquiryFile: d.uploadInquiryFile }));
vi.mock("@/lib/inquiries/s3", () => ({ getRawEmail: d.getRawEmail }));

const note = (over: Record<string, unknown> = {}) => ({
  notificationType: "Received",
  mail: { messageId: "ses-1" },
  receipt: { recipients: [`r-${TOKEN}@in.auraprotocols.com`], spamVerdict: { status: "PASS" }, virusVerdict: { status: "PASS" },
    action: { type: "S3", bucketName: "aura-inbound-mail", objectKey: "raw/ses-1" } },
  ...over,
});

describe("handleInbound", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const f of Object.values(d)) f.mockReset();
    process.env.INBOUND_MAIL_BUCKET = "aura-inbound-mail";
    process.env.INBOUND_MAIL_DOMAIN = "in.auraprotocols.com";
    d.seenSesMessage.mockResolvedValue(false);
    d.getRawEmail.mockResolvedValue(raw);
    d.getInquiry.mockResolvedValue({ ...inquiry({ status: "waiting" }), token: TOKEN });
    d.recordInbound.mockResolvedValue("recorded");
  });

  it("matched by token: uploads the photo, records the cut text with the full text kept", async () => {
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note())).toBe("recorded");
    expect(d.getInquiry).toHaveBeenCalledWith({ token: TOKEN });
    expect(d.uploadInquiryFile).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111/ses-1/1-box.png", expect.any(Uint8Array), "image/png");
    expect(d.recordInbound).toHaveBeenCalledWith(expect.objectContaining({
      inquiryId: "11111111-1111-4111-8111-111111111111", sesMessageId: "ses-1", fromEmail: "dana.w@example.com",
      body: "Here you go — both vials and the box.", rawKey: "raw/ses-1", emailMessageId: "<CAF-abc-123@mail.gmail.com>",
      flags: [], dropped: [],
      files: [{ filename: "box.png", content_type: "image/png", size_bytes: expect.any(Number), storage_path: "11111111-1111-4111-8111-111111111111/ses-1/1-box.png" }],
    }));
    expect(d.recordInbound.mock.calls[0][0].full).toContain("On Tue, Oct 6, 2026");
  });

  it("already processed → duplicate, nothing fetched", async () => {
    d.seenSesMessage.mockResolvedValue(true);
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note())).toBe("duplicate");
    expect(d.getRawEmail).not.toHaveBeenCalled();
  });

  it("virus verdict FAIL → dropped, nothing stored", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note({ receipt: { ...note().receipt, virusVerdict: { status: "FAIL" } } }))).toBe("dropped");
    expect(d.recordInbound).not.toHaveBeenCalled();
    expect(d.recordUnmatched).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("unknown token and no subject match → Unmatched (attachments named, not kept)", async () => {
    d.getInquiry.mockResolvedValue(null);
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note())).toBe("unmatched");
    expect(d.recordUnmatched).toHaveBeenCalledWith(expect.objectContaining({ ses_message_id: "ses-1", from_email: "dana.w@example.com", attachment_names: ["box.png"], spam: false }));
    expect(d.uploadInquiryFile).not.toHaveBeenCalled();
  });

  it("a [Q-n] subject only matches when the sender is the inquiry's own email", async () => {
    d.getInquiry.mockImplementation(async (by: Record<string, unknown>) => ("token" in by ? null : { ...inquiry({ email: "someone.else@example.com" }), token: TOKEN }));
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note())).toBe("unmatched");
  });

  it("a dead token falls back to [Q-n] from the inquiry's own address", async () => {
    d.getInquiry.mockImplementation(async (by: Record<string, unknown>) => ("token" in by ? null : { ...inquiry(), token: "f".repeat(32) }));
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound(note())).toBe("recorded");
    expect(d.getInquiry).toHaveBeenCalledWith({ ref: 1047 });
  });

  it("spam verdict FAIL is stored flagged (the SQL never moves the status for it)", async () => {
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    await handleInbound(note({ receipt: { ...note().receipt, spamVerdict: { status: "FAIL" } } }));
    expect(d.recordInbound.mock.calls[0][0].flags).toEqual(["spam"]);
  });

  it("refuses a notification from another bucket (loud)", async () => {
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    await expect(handleInbound(note({ receipt: { ...note().receipt, action: { type: "S3", bucketName: "other", objectKey: "raw/x" } } }))).rejects.toThrow(/unexpected bucket/);
  });

  it("ignores anything that isn't a Received notification", async () => {
    const { handleInbound } = await import("@/lib/inquiries/inbound");
    expect(await handleInbound({ notificationType: "AmazonSnsSubscriptionSucceeded" })).toBe("ignored");
  });
});
