import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";

const sendEmail = vi.fn();
let from: ReturnType<typeof fromQueue>;
vi.mock("@/lib/ses", () => ({ sendEmail }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ from: (t: string) => from(t) }) }));

const msg = { subject: "S", html: "<p>clean</p>" };

describe("sendTracked", () => {
  beforeEach(() => { vi.resetModules(); sendEmail.mockReset(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("claims the send, sends, and stores the SES id", async () => {
    const claim = query({ data: { id: "s1" } }), save = query({});
    from = fromQueue({ email_sends: [claim, save] });
    sendEmail.mockResolvedValue({ messageId: "ses-1" });
    const { sendTracked } = await import("@/lib/email/data");
    expect(await sendTracked({ email: "Lab@Example.com", kind: "welcome_2", ref: null, msg, unsubscribeUrl: "u" })).toBe("sent");
    expect(callArgs(claim, "insert")?.[0]).toEqual({ email: "lab@example.com", kind: "welcome_2", ref: null });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "lab@example.com", fromName: "Alvester at Aura Protocols", replyTo: "support@auraprotocols.com", unsubscribeUrl: "u" }));
    expect(callArgs(save, "update")?.[0]).toEqual({ ses_message_id: "ses-1" });
  });

  it("returns duplicate without sending when the claim already exists", async () => {
    from = fromQueue({ email_sends: [query({ error: { code: "23505" } })] });
    const { sendTracked } = await import("@/lib/email/data");
    expect(await sendTracked({ email: "a@b.co", kind: "welcome_2", ref: null, msg })).toBe("duplicate");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("releases the claim and rethrows when SES fails, so the next run retries", async () => {
    const release = query({});
    from = fromQueue({ email_sends: [query({ data: { id: "s1" } }), release] });
    sendEmail.mockRejectedValue(new Error("throttled"));
    const { sendTracked } = await import("@/lib/email/data");
    await expect(sendTracked({ email: "a@b.co", kind: "welcome_2", ref: null, msg })).rejects.toThrow("throttled");
    expect(release.calls.map(([m]) => m)).toContain("delete");
  });

  it("refuses to send copy that fails the compliance scan", async () => {
    from = fromQueue({});
    const { sendTracked } = await import("@/lib/email/data");
    await expect(sendTracked({ email: "a@b.co", kind: "welcome_2", ref: null, msg: { subject: "dose", html: "" } })).rejects.toThrow("compliance");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
