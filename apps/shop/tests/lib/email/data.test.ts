import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  it("throws a stuck-claim message when SES fails AND releasing the claim also fails", async () => {
    const release = query({ error: { message: "db down" } });
    from = fromQueue({ email_sends: [query({ data: { id: "s1" } }), release] });
    sendEmail.mockRejectedValue(new Error("throttled"));
    const { sendTracked } = await import("@/lib/email/data");
    await expect(sendTracked({ email: "a@b.co", kind: "welcome_2", ref: null, msg }))
      .rejects.toThrow(/stuck/);
  });

  it("still returns sent (and never deletes) when the post-send message-id update errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const claim = query({ data: { id: "s1" } });
    const save = query({ error: { message: "update failed" } });
    from = fromQueue({ email_sends: [claim, save] });
    sendEmail.mockResolvedValue({ messageId: "ses-1" });
    const { sendTracked } = await import("@/lib/email/data");
    expect(await sendTracked({ email: "a@b.co", kind: "welcome_2", ref: null, msg })).toBe("sent");
    expect(save.calls.map(([m]) => m)).not.toContain("delete");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("hasPaidOrder", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("counts an in-flight (processing) payment as a first order", async () => {
    const q = query({});
    from = fromQueue({ orders: [q] });
    const { hasPaidOrder } = await import("@/lib/email/data");
    await hasPaidOrder("c1");
    expect(callArgs(q, "in")).toEqual(["status", ["paid", "processing", "shipped", "refunded"]]);
  });
});

describe("upsertPending", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("returns confirmed without writing for an already-confirmed subscriber", async () => {
    from = fromQueue({ subscribers: [query({ data: { email: "a@b.co", status: "confirmed", partner_ref: null } })] });
    const { upsertPending } = await import("@/lib/email/data");
    expect(await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null })).toEqual({ state: "confirmed" });
  });

  it("keeps the existing partner_ref when the new one is null", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: "p1" } });
    const write = query({});
    from = fromQueue({ subscribers: [read, write] });
    const { upsertPending } = await import("@/lib/email/data");
    await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null });
    expect((callArgs(write, "upsert")?.[0] as { partner_ref: string | null }).partner_ref).toBe("p1");
  });
});

describe("confirmSubscriber", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("issues no welcome code for a partner-referred row", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: "p1", welcome_code: null } });
    const write = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [read, write] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    await confirmSubscriber("tok", Date.parse("2026-12-01T00:00:00Z"));
    const patch = callArgs(write, "update")?.[0] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("welcome_code");
  });

  it("issues an AURA- code for a non-partner-referred row", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: null, welcome_code: null } });
    const write = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [read, write] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    await confirmSubscriber("tok", Date.parse("2026-12-01T00:00:00Z"));
    const patch = callArgs(write, "update")?.[0] as { welcome_code: string };
    expect(patch.welcome_code).toMatch(/^AURA-/);
  });

  it("retries after a 23505 (duplicate code) error and succeeds on the second try", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: null, welcome_code: null } });
    const clash = query({ error: { code: "23505" } });
    const ok = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [read, clash, ok] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    const result = await confirmSubscriber("tok", Date.parse("2026-12-01T00:00:00Z"));
    expect(result).toEqual({ email: "a@b.co", status: "confirmed" });
  });
});

describe("markWelcomeCodeUsed", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("returns false when the update matched no rows (already used)", async () => {
    from = fromQueue({ subscribers: [query({ data: [] })] });
    const { markWelcomeCodeUsed } = await import("@/lib/email/data");
    expect(await markWelcomeCodeUsed("AURA-7K2Q", "o1")).toBe(false);
  });
});

describe("listConfirmedEmails / listWelcomeCandidates paging", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("listConfirmedEmails pages past Supabase's 1,000-row cap", async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({ email: `u${i}@example.com` }));
    const page2 = [{ email: "a@x.co" }, { email: "b@x.co" }, { email: "c@x.co" }];
    from = fromQueue({ subscribers: [query({ data: page1 }), query({ data: page2 })] });
    const { listConfirmedEmails } = await import("@/lib/email/data");
    const emails = await listConfirmedEmails();
    expect(emails).toHaveLength(1003);
  });

  it("listWelcomeCandidates pages past Supabase's 1,000-row cap", async () => {
    const row = (email: string) => ({ email, status: "confirmed", welcome_code: null, welcome_code_expires_at: null, welcome_code_used_order_id: null, source: "popup", partner_ref: null, confirmed_at: "2026-10-01T00:00:00Z", unsubscribed_at: null });
    const page1 = Array.from({ length: 1000 }, (_, i) => row(`u${i}@example.com`));
    const page2 = [row("a@x.co"), row("b@x.co"), row("c@x.co")];
    from = fromQueue({ subscribers: [query({ data: page1 }), query({ data: page2 })] });
    const { listWelcomeCandidates } = await import("@/lib/email/data");
    const rows = await listWelcomeCandidates("2026-10-01T00:00:00Z");
    expect(rows).toHaveLength(1003);
  });
});
