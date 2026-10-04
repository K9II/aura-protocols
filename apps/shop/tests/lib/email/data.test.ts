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

describe("unsubscribe", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("updates an existing subscriber row in place", async () => {
    const update = query({ data: [{ email: "a@b.co" }] });
    from = fromQueue({ subscribers: [update] });
    const { unsubscribe } = await import("@/lib/email/data");
    await unsubscribe("a@b.co");
    expect(callArgs(update, "update")?.[0]).toMatchObject({ status: "unsubscribed" });
    expect(callArgs(update, "eq")).toEqual(["email", "a@b.co"]);
  });

  it("inserts a row for an address with no subscriber row (e.g. a cart-reminder-only email)", async () => {
    const update = query({ data: [] });
    const insert = query({});
    from = fromQueue({ subscribers: [update, insert] });
    const { unsubscribe } = await import("@/lib/email/data");
    await unsubscribe("new@b.co");
    expect(callArgs(insert, "insert")?.[0]).toMatchObject({ email: "new@b.co", source: "unsubscribe", status: "unsubscribed" });
  });

  it("throws on an update error", async () => {
    from = fromQueue({ subscribers: [query({ error: { message: "down" } })] });
    const { unsubscribe } = await import("@/lib/email/data");
    await expect(unsubscribe("a@b.co")).rejects.toThrow();
  });

  it("throws on an insert error", async () => {
    from = fromQueue({ subscribers: [query({ data: [] }), query({ error: { message: "down" } })] });
    const { unsubscribe } = await import("@/lib/email/data");
    await expect(unsubscribe("a@b.co")).rejects.toThrow();
  });

  it("nulls confirm_token_hash so an old confirm link can't resubscribe this address", async () => {
    const update = query({ data: [{ email: "a@b.co" }] });
    from = fromQueue({ subscribers: [update] });
    const { unsubscribe } = await import("@/lib/email/data");
    await unsubscribe("a@b.co");
    expect(callArgs(update, "update")?.[0]).toMatchObject({ confirm_token_hash: null });
  });

  it("retries the update once when the insert races with another writer (23505)", async () => {
    const update1 = query({ data: [] });
    const insert = query({ error: { code: "23505" } });
    const update2 = query({});
    from = fromQueue({ subscribers: [update1, insert, update2] });
    const { unsubscribe } = await import("@/lib/email/data");
    await unsubscribe("a@b.co");
    expect(callArgs(update2, "update")?.[0]).toMatchObject({ status: "unsubscribed", confirm_token_hash: null });
  });

  it("throws if the retried update after an insert race also fails", async () => {
    from = fromQueue({ subscribers: [
      query({ data: [] }),
      query({ error: { code: "23505" } }),
      query({ error: { message: "down" } }),
    ] });
    const { unsubscribe } = await import("@/lib/email/data");
    await expect(unsubscribe("a@b.co")).rejects.toThrow();
  });
});

describe("confirmOptIn", () => {
  beforeEach(() => { vi.resetModules(); });

  it("confirms a pending sign-up opt-in and reports it was new", async () => {
    const upd = query({ data: [{ email: "a@b.co" }] });
    from = fromQueue({ subscribers: [upd] });
    const { confirmOptIn } = await import("@/lib/email/data");
    expect(await confirmOptIn("A@B.co")).toBe(true);
    expect(callArgs(upd, "update")?.[0]).toMatchObject({ status: "confirmed", unsubscribed_at: null });
    expect(callArgs(upd, "eq")).toEqual(["email", "a@b.co"]);
  });

  it("returns false when there was no pending row (unsubscribed since, or already confirmed)", async () => {
    from = fromQueue({ subscribers: [query({ data: [] })] });
    const { confirmOptIn } = await import("@/lib/email/data");
    expect(await confirmOptIn("a@b.co")).toBe(false);
  });
});

describe("welcomeSendsFor", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("returns an empty map for an empty list without querying", async () => {
    from = fromQueue({});
    const { welcomeSendsFor } = await import("@/lib/email/data");
    expect(await welcomeSendsFor([])).toEqual(new Map());
  });

  it("groups kinds and the latest welcome sent_at per email in one query", async () => {
    const q = query({ data: [
      { email: "a@b.co", kind: "welcome_1", sent_at: "2026-11-01T00:00:00Z" },
      { email: "a@b.co", kind: "welcome_2", sent_at: "2026-11-03T00:00:00Z" },
      { email: "c@d.co", kind: "welcome_1", sent_at: "2026-11-02T00:00:00Z" },
    ] });
    from = fromQueue({ email_sends: [q] });
    const { welcomeSendsFor } = await import("@/lib/email/data");
    const map = await welcomeSendsFor(["a@b.co", "c@d.co"]);
    expect(map.get("a@b.co")).toEqual({ kinds: new Set(["welcome_1", "welcome_2"]), lastSentMs: Date.parse("2026-11-03T00:00:00Z") });
    expect(map.get("c@d.co")).toEqual({ kinds: new Set(["welcome_1"]), lastSentMs: Date.parse("2026-11-02T00:00:00Z") });
    expect(callArgs(q, "in")).toEqual(["email", ["a@b.co", "c@d.co"]]);
    expect(callArgs(q, "like")).toEqual(["kind", "welcome_%"]);
  });

  it("pages past Supabase's 1,000-row cap on the email list", async () => {
    const emails = Array.from({ length: 1200 }, (_, i) => `u${i}@example.com`);
    const q1 = query({ data: [{ email: "u0@example.com", kind: "welcome_1", sent_at: "2026-11-01T00:00:00Z" }] });
    const q2 = query({ data: [{ email: "u1199@example.com", kind: "welcome_1", sent_at: "2026-11-01T00:00:00Z" }] });
    from = fromQueue({ email_sends: [q1, q2] });
    const { welcomeSendsFor } = await import("@/lib/email/data");
    const map = await welcomeSendsFor(emails);
    expect(map.size).toBe(2);
    expect(callArgs(q1, "in")?.[1]).toHaveLength(1000);
    expect(callArgs(q2, "in")?.[1]).toHaveLength(200);
  });

  it("throws on a read error", async () => {
    from = fromQueue({ email_sends: [query({ error: { message: "down" } })] });
    const { welcomeSendsFor } = await import("@/lib/email/data");
    await expect(welcomeSendsFor(["a@b.co"])).rejects.toThrow();
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

describe("recordOptIn", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("puts a new address on the list as pending, from sign-up, with the partner ref", async () => {
    const read = query({ data: null }); const write = query({});
    from = fromQueue({ subscribers: [read, write] });
    const { recordOptIn } = await import("@/lib/email/data");
    await recordOptIn("Jane@Lab.org", "SMITHLAB");
    expect(callArgs(write, "upsert")?.[0]).toEqual({ email: "jane@lab.org", source: "signup", status: "pending", unsubscribed_at: null, partner_ref: "SMITHLAB" });
  });

  it("leaves an already-confirmed subscriber alone", async () => {
    from = fromQueue({ subscribers: [query({ data: { email: "a@b.co", status: "confirmed" } })] });
    const { recordOptIn } = await import("@/lib/email/data");
    await recordOptIn("a@b.co", null);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
