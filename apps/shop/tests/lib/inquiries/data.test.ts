import { describe, it, expect, vi, beforeEach } from "vitest";
import { query, fromQueue, callArgs } from "../../helpers/supabase-mock";
import { NOW } from "../../helpers/inquiry-fixtures";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: null as null | ((t: string) => unknown), storage: { from: vi.fn() } }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdminClient: () => ({ rpc: db.rpc, from: (t: string) => db.from!(t), storage: db.storage }) }));
vi.mock("@/lib/clock", () => ({ currentMs: () => NOW }));
const alertOwner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notify", () => ({ alertOwner }));

describe("inquiries data", () => {
  beforeEach(() => { vi.resetModules(); db.rpc.mockReset(); alertOwner.mockReset(); });

  it("createInquiry calls create_inquiry and returns id + ref", async () => {
    db.rpc.mockResolvedValue({ data: [{ id: "i1", ref: 1050 }], error: null });
    const { createInquiry } = await import("@/lib/inquiries/data");
    const r = await createInquiry({ topic: "account", subject: "Account question", name: "Jordan Hale", email: "jhale@example.net", organization: null, orderNumber: null, message: "No verify email", customerId: null, token: "t".repeat(32), ipHash: "h" });
    expect(db.rpc).toHaveBeenCalledWith("create_inquiry", {
      p_topic: "account", p_subject: "Account question", p_name: "Jordan Hale", p_email: "jhale@example.net", p_organization: null,
      p_order_number: null, p_message: "No verify email", p_customer_id: null, p_token: "t".repeat(32), p_ip_hash: "h",
    });
    expect(r).toEqual({ id: "i1", ref: 1050 });
  });

  it("per-IP limit: 5 an hour, then 20 a day", async () => {
    db.from = fromQueue({ inquiries: [query({ count: 5 })] });
    const { underInquiryLimit } = await import("@/lib/inquiries/data");
    expect(await underInquiryLimit("h", NOW)).toBe(false);
    db.from = fromQueue({ inquiries: [query({ count: 1 }), query({ count: 19 })] });
    expect(await underInquiryLimit("h", NOW)).toBe(true);
  });

  it("ackCountToday: counts inquiries for that email in the last 24h", async () => {
    const q = query({ count: 2 });
    db.from = fromQueue({ inquiries: [q] });
    const { ackCountToday } = await import("@/lib/inquiries/data");
    expect(await ackCountToday("dana.w@example.com", NOW)).toBe(2);
    expect(callArgs(q, "eq")).toEqual(["email", "dana.w@example.com"]);
    expect(callArgs(q, "gte")).toEqual(["created_at", new Date(NOW - 86_400_000).toISOString()]);
  });

  it("list: Open tab = new + needs_reply, longest waiting first, a Q-number searches by ref", async () => {
    const q = query({ data: [], count: 0 });
    db.from = fromQueue({ inquiries: [q] });
    const { listInquiries } = await import("@/lib/inquiries/data");
    await listInquiries({ tab: "open", topic: null, q: "q-1047", page: 1 });
    expect(callArgs(q, "in")).toEqual(["status", ["new", "needs_reply"]]);
    expect(callArgs(q, "eq")).toEqual(["ref", 1047]);
    expect(callArgs(q, "order")).toEqual(["last_customer_at", { ascending: true, nullsFirst: false }]);
    expect(callArgs(q, "range")).toEqual([0, 49]);
  });

  it("list: text search covers name, email, org, order, subject and message text", async () => {
    const msgs = query({ data: [{ inquiry_id: "i9" }, { inquiry_id: "i9" }] });
    const q = query({ data: [], count: 0 });
    db.from = fromQueue({ inquiry_messages: [msgs], inquiries: [q] });
    const { listInquiries } = await import("@/lib/inquiries/data");
    await listInquiries({ tab: "all", topic: "order", q: "cracked,", page: 2 });
    expect(callArgs(msgs, "ilike")).toEqual(["body_text", "%cracked%"]);
    expect(callArgs(q, "or")).toEqual(["name.ilike.%cracked%,email.ilike.%cracked%,organization.ilike.%cracked%,order_number.ilike.%cracked%,subject.ilike.%cracked%,id.in.(i9)"]);
    expect(callArgs(q, "eq")).toEqual(["topic", "order"]);
    expect(callArgs(q, "range")).toEqual([50, 99]);
  });

  it("applyInquiryEvent: conditional move with the right patch; no move → null", async () => {
    const read = query({ data: { status: "needs_reply" } });
    const upd = query({ data: [{ id: "i1" }] });
    db.from = fromQueue({ inquiries: [read, upd] });
    const { applyInquiryEvent } = await import("@/lib/inquiries/data");
    expect(await applyInquiryEvent("i1", "owner_replied", { actorId: "o1" })).toEqual({ from: "needs_reply", to: "waiting" });
    expect(callArgs(upd, "update")).toEqual([{ status: "waiting", waiting_since: new Date(NOW).toISOString(), closed_at: null, closed_by: null }]);
    expect(upd.calls.filter(([m]) => m === "eq").map(([, a]) => a)).toEqual([["id", "i1"], ["status", "needs_reply"]]);

    db.from = fromQueue({ inquiries: [query({ data: { status: "waiting" } })] });
    expect(await applyInquiryEvent("i1", "opened")).toBeNull();
  });

  it("applyInquiryEvent retries when the status changed underneath", async () => {
    db.from = fromQueue({ inquiries: [
      query({ data: { status: "waiting" } }), query({ data: [] }),
      query({ data: { status: "needs_reply" } }), query({ data: [{ id: "i1" }] }),
    ] });
    const { applyInquiryEvent } = await import("@/lib/inquiries/data");
    expect(await applyInquiryEvent("i1", "close", { actorId: "o1" })).toEqual({ from: "needs_reply", to: "closed" });
  });

  it("claimReply: a second claim with the same form key is a duplicate", async () => {
    db.from = fromQueue({ inquiry_messages: [query({ error: { code: "23505" } })] });
    const { claimReply } = await import("@/lib/inquiries/data");
    expect(await claimReply({ inquiryId: "i1", clientKey: "k", body: "x", authorId: "o1", fromEmail: "support@auraprotocols.com" })).toBe("duplicate");
  });

  it("a bounce on one of our replies moves the thread and logs before flipping delivery", async () => {
    const read = query({ data: [{ inquiry_id: "i1" }] });
    const upd = query({ data: [{ inquiry_id: "i1" }] });
    db.from = fromQueue({
      inquiry_messages: [read, upd],
      inquiries: [query({ data: { status: "waiting" } }), query({ data: [{ id: "i1" }] })],
      inquiry_events: [query({})],
    });
    const { markOutboundDelivery } = await import("@/lib/inquiries/data");
    expect(await markOutboundDelivery("0100abc", "bounced")).toBe("i1");
    expect(callArgs(read, "select")).toEqual(["inquiry_id"]);
    expect(callArgs(read, "in")).toEqual(["delivery", ["sent", "delivered"]]);
    expect(callArgs(upd, "update")).toEqual([{ delivery: "bounced" }]);
    expect(callArgs(upd, "in")).toEqual(["delivery", ["sent", "delivered"]]);
  });

  it("retry-safe: the move and log still run (and the inquiry id is still returned) when the delivery update doesn't find a row to flip", async () => {
    const read = query({ data: [{ inquiry_id: "i1" }] });
    const upd = query({ data: [] }); // e.g. a concurrent retry already flipped it
    db.from = fromQueue({
      inquiry_messages: [read, upd],
      inquiries: [query({ data: { status: "waiting" } }), query({ data: [{ id: "i1" }] })],
      inquiry_events: [query({})],
    });
    const { markOutboundDelivery } = await import("@/lib/inquiries/data");
    expect(await markOutboundDelivery("0100abc", "bounced")).toBe("i1");
  });

  it("delivered: a single conditional update, no move/log", async () => {
    const upd = query({ data: [{ inquiry_id: "i1" }] });
    db.from = fromQueue({ inquiry_messages: [upd] });
    const { markOutboundDelivery } = await import("@/lib/inquiries/data");
    expect(await markOutboundDelivery("0100abc", "delivered")).toBe("i1");
    expect(callArgs(upd, "update")).toEqual([{ delivery: "delivered" }]);
    expect(callArgs(upd, "in")).toEqual(["delivery", ["sent"]]);
  });

  it("not one of ours → null, nothing else touched", async () => {
    db.from = fromQueue({ inquiry_messages: [query({ data: [] })] });
    const { markOutboundDelivery } = await import("@/lib/inquiries/data");
    expect(await markOutboundDelivery("other", "delivered")).toBeNull();
  });

  it("bounced, not found (already handled or never ours) → null, no move/log attempted", async () => {
    db.from = fromQueue({ inquiry_messages: [query({ data: [] })] });
    const { markOutboundDelivery } = await import("@/lib/inquiries/data");
    expect(await markOutboundDelivery("other", "bounced")).toBeNull();
  });

  it("auto-close passes the 14-day cut-off", async () => {
    db.rpc.mockResolvedValue({ data: 2, error: null });
    const { autoCloseInquiries } = await import("@/lib/inquiries/data");
    expect(await autoCloseInquiries(NOW)).toBe(2);
    expect(db.rpc).toHaveBeenCalledWith("auto_close_inquiries", { p_before: new Date(NOW - 14 * 86_400_000).toISOString() });
  });

  it("nav count never throws", async () => {
    db.from = fromQueue({ inquiries: [query({ error: { message: "relation does not exist" } })] });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { inquiriesNavCount } = await import("@/lib/inquiries/data");
    expect(await inquiriesNavCount()).toBe(0);
    spy.mockRestore();
  });

  it("recordInbound: the function's verdict, errors throw", async () => {
    db.rpc.mockResolvedValueOnce({ data: "duplicate", error: null });
    const { recordInbound } = await import("@/lib/inquiries/data");
    const input = { inquiryId: "i1", sesMessageId: "s1", fromEmail: "a@b.c", body: "x", full: "x", rawKey: "raw/s1", emailMessageId: null, flags: [], dropped: [], files: [] };
    expect(await recordInbound(input)).toBe("duplicate");
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    await expect(recordInbound(input)).rejects.toThrow(/record_inbound_message failed/);
  });
});
