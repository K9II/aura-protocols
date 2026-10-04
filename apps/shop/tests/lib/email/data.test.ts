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

describe("upsertPending", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });
  const noCooldown = () => [query({ data: [] }), query({ data: [] })];

  it("returns confirmed without writing for an already-confirmed subscriber", async () => {
    from = fromQueue({ subscribers: [query({ data: { email: "a@b.co", status: "confirmed", partner_ref: null } })] });
    const { upsertPending } = await import("@/lib/email/data");
    expect(await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null })).toEqual({ state: "confirmed" });
  });

  it("keeps the existing partner_ref when the new one is null", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: "p1" } });
    const write = query({});
    from = fromQueue({ subscribers: [read, write], email_sends: noCooldown() });
    const { upsertPending } = await import("@/lib/email/data");
    await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null });
    expect((callArgs(write, "upsert")?.[0] as { partner_ref: string | null }).partner_ref).toBe("p1");
  });

  it("keeps the existing source on a re-request", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", source: "popup", partner_ref: null } });
    const write = query({});
    from = fromQueue({ subscribers: [read, write], email_sends: noCooldown() });
    const { upsertPending } = await import("@/lib/email/data");
    await upsertPending({ email: "a@b.co", source: "footer", partnerRef: null });
    expect((callArgs(write, "upsert")?.[0] as { source: string }).source).toBe("popup");
  });

  it("does not re-enable an unsubscribed address — status and unsubscribed_at stay untouched", async () => {
    const read = query({ data: { email: "a@b.co", status: "unsubscribed", source: "popup", partner_ref: null } });
    const write = query({});
    from = fromQueue({ subscribers: [read, write], email_sends: noCooldown() });
    const { upsertPending } = await import("@/lib/email/data");
    const result = await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null });
    expect(result).toEqual({ state: "pending", token: expect.any(String) });
    const patch = callArgs(write, "upsert")?.[0] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("status");
    expect(patch).not.toHaveProperty("unsubscribed_at");
    expect(patch).toHaveProperty("confirm_token_hash");
  });

  it("sets status pending and clears unsubscribed_at for a brand-new or still-pending address", async () => {
    const read = query({ data: null });
    const write = query({});
    from = fromQueue({ subscribers: [read, write], email_sends: noCooldown() });
    const { upsertPending } = await import("@/lib/email/data");
    await upsertPending({ email: "new@b.co", source: "popup", partnerRef: null });
    const patch = callArgs(write, "upsert")?.[0] as Record<string, unknown>;
    expect(patch).toMatchObject({ status: "pending", unsubscribed_at: null });
  });

  it("returns cooldown without rotating a token when a confirmation went out in the last 10 minutes", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: null } });
    from = fromQueue({ subscribers: [read], email_sends: [query({ data: [{ id: "1" }] }), query({ data: [] })] });
    const { upsertPending } = await import("@/lib/email/data");
    expect(await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null })).toEqual({ state: "cooldown" });
  });

  it("returns cooldown after 3 confirmations in 24 hours even if none were in the last 10 minutes", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: null } });
    from = fromQueue({ subscribers: [read], email_sends: [query({ data: [] }), query({ data: [{ id: "1" }, { id: "2" }, { id: "3" }] })] });
    const { upsertPending } = await import("@/lib/email/data");
    expect(await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null })).toEqual({ state: "cooldown" });
  });

  it("overwrites a cart-email-unsubscribe stub's source with the new request's source", async () => {
    const read = query({ data: { email: "a@b.co", status: "unsubscribed", source: "unsubscribe", partner_ref: null } });
    const write = query({});
    from = fromQueue({ subscribers: [read, write], email_sends: noCooldown() });
    const { upsertPending } = await import("@/lib/email/data");
    await upsertPending({ email: "a@b.co", source: "popup", partnerRef: null });
    expect((callArgs(write, "upsert")?.[0] as { source: string }).source).toBe("popup");
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
    expect(result).toEqual({ row: { email: "a@b.co", status: "confirmed" }, already: false });
  });

  it("does not null confirm_token_hash and clears unsubscribed_at when confirming an unsubscribed address", async () => {
    const read = query({ data: { email: "a@b.co", status: "unsubscribed", partner_ref: "p1", welcome_code: null } });
    const write = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [read, write] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    const result = await confirmSubscriber("tok", Date.parse("2026-12-01T00:00:00Z"));
    expect(result).toEqual({ row: { email: "a@b.co", status: "confirmed" }, already: false });
    const patch = callArgs(write, "update")?.[0] as Record<string, unknown>;
    expect(patch).not.toHaveProperty("confirm_token_hash");
    expect(patch).toMatchObject({ unsubscribed_at: null });
  });

  it("returns already:true without writing when the token belongs to a row that's already confirmed (double-click)", async () => {
    const active = query({ data: null });
    const confirmed = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [active, confirmed] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    const result = await confirmSubscriber("tok");
    expect(result).toEqual({ row: { email: "a@b.co", status: "confirmed" }, already: true });
  });

  it("returns null when the token matches no subscriber at all", async () => {
    from = fromQueue({ subscribers: [query({ data: null }), query({ data: null })] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    expect(await confirmSubscriber("nope")).toBeNull();
  });

  it("falls through to the already-confirmed lookup when a concurrent request wins the race (update matches 0 rows)", async () => {
    const read = query({ data: { email: "a@b.co", status: "pending", partner_ref: null, welcome_code: null } });
    const raced = query({ data: null, error: null });
    const confirmedLookup = query({ data: { email: "a@b.co", status: "confirmed" } });
    from = fromQueue({ subscribers: [read, raced, confirmedLookup] });
    const { confirmSubscriber } = await import("@/lib/email/data");
    const result = await confirmSubscriber("tok", Date.parse("2026-12-01T00:00:00Z"));
    expect(result).toEqual({ row: { email: "a@b.co", status: "confirmed" }, already: true });
  });
});

describe("confirmsSentSince", () => {
  beforeEach(() => { vi.resetModules(); process.env.EMAIL_LINK_SECRET = "s"; });

  it("counts confirm sends for the email since the given time", async () => {
    const q = query({ data: [{ id: "1" }, { id: "2" }] });
    from = fromQueue({ email_sends: [q] });
    const { confirmsSentSince } = await import("@/lib/email/data");
    expect(await confirmsSentSince("A@B.co", "2026-10-01T00:00:00Z")).toBe(2);
    const eqCalls = q.calls.filter(([m]) => m === "eq").map(([, args]) => args);
    expect(eqCalls).toContainEqual(["email", "a@b.co"]);
    expect(eqCalls).toContainEqual(["kind", "confirm"]);
    expect(callArgs(q, "gte")).toEqual(["sent_at", "2026-10-01T00:00:00Z"]);
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
