import { describe, it, expect, vi, beforeEach } from "vitest";

const fromMock = vi.fn();
const sendMock = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: fromMock }) }));
vi.mock("@/lib/ses", () => ({ sendEmail: sendMock }));

const valid = { kind: "wholesale", name: "Dr. Lab", email: "lab@example.edu", organization: "Example University", message: "Quarterly volume for 5 compounds." };
const post = (body: unknown) => new Request("http://localhost/api/inquiry", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/inquiry", () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockReset();
    sendMock.mockReset();
    process.env.INQUIRY_NOTIFY_EMAIL = "owner@example.com";
  });

  it("rejects an unknown kind or missing message with 400", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post({ ...valid, kind: "other" }))).status).toBe(400);
    expect((await POST(post({ ...valid, message: "" }))).status).toBe(400);
  });

  it("rejects the retired affiliate kind with 400 (the partner program replaced it)", async () => {
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post({ ...valid, kind: "affiliate" }))).status).toBe(400);
  });

  it("returns 500 when the insert fails, and does not email", async () => {
    fromMock.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: { message: "down" } }) });
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(500);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("stores the inquiry and notifies the owner", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert });
    sendMock.mockResolvedValue({ messageId: "m1" });
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(200);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ kind: "wholesale", email: "lab@example.edu" }));
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("wholesale") }));
  });

  it("strips CR/LF from the name before it lands in the email subject", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ insert });
    sendMock.mockResolvedValue({ messageId: "m1" });
    const { POST } = await import("@/app/api/inquiry/route");
    const injected = "Dr. Lab\r\nBcc: attacker@evil.example";
    expect((await POST(post({ ...valid, name: injected }))).status).toBe(200);
    const { subject } = sendMock.mock.calls[0][0] as { subject: string };
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toBe("New wholesale inquiry — Dr. Lab Bcc: attacker@evil.example");
  });

  it("still returns 200 when the notification email fails (inquiry is saved)", async () => {
    fromMock.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) });
    sendMock.mockRejectedValue(new Error("ses down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/inquiry/route");
    expect((await POST(post(valid))).status).toBe(200);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
