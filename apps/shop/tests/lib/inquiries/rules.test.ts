import { describe, it, expect } from "vitest";
import {
  STATUSES, nextStatus, parseTab, statusesForTab, waitInfo, waitText, businessDayText, refLabel, parseRef, cleanSearch,
  STATUS_CHIP, historyText, firstName, greetingName, type InquiryEventName, type Status,
} from "@/lib/inquiries/rules";
import { NOW, inquiry } from "../../helpers/inquiry-fixtures";

describe("status machine", () => {
  const table: Array<[InquiryEventName, Status, Status | null]> = [
    ["opened", "new", "needs_reply"], ["opened", "needs_reply", null], ["opened", "waiting", null],
    ["owner_replied", "new", "waiting"], ["owner_replied", "needs_reply", "waiting"], ["owner_replied", "waiting", "waiting"], ["owner_replied", "closed", "waiting"],
    ["owner_replied_close", "needs_reply", "closed"], ["owner_replied_close", "closed", "closed"],
    ["customer_replied", "waiting", "needs_reply"], ["customer_replied", "closed", "needs_reply"], ["customer_replied", "new", "new"], ["customer_replied", "needs_reply", "needs_reply"],
    ["close", "new", "closed"], ["close", "needs_reply", "closed"], ["close", "waiting", "closed"], ["close", "closed", null],
    ["reopen", "closed", "needs_reply"], ["reopen", "waiting", null],
    ["auto_close", "waiting", "closed"], ["auto_close", "needs_reply", null],
    ["bounced", "waiting", "needs_reply"], ["bounced", "closed", "needs_reply"], ["bounced", "new", "new"],
  ];
  it.each(table)("%s from %s → %s", (e, from, to) => expect(nextStatus(from, e)).toBe(to));
  it("has four statuses with chips", () => {
    expect(STATUSES).toEqual(["new", "needs_reply", "waiting", "closed"]);
    expect(STATUS_CHIP.waiting).toEqual({ tone: "q-waiting", text: "Waiting on customer" });
  });
});

describe("tabs", () => {
  it("maps tabs to statuses; unknown → open", () => {
    expect(parseTab("waiting")).toBe("waiting");
    expect(parseTab("x")).toBe("open");
    expect(statusesForTab("open")).toEqual(["new", "needs_reply"]);
    expect(statusesForTab("waiting")).toEqual(["waiting"]);
    expect(statusesForTab("closed")).toEqual(["closed"]);
    expect(statusesForTab("all")).toEqual(["new", "needs_reply", "waiting", "closed"]);
  });
});

describe("waiting clock", () => {
  it("short text: minutes, hours, then Mountain calendar days", () => {
    expect(waitText("2026-10-06T20:20:00Z", NOW)).toBe("40 min");
    expect(waitText("2026-10-06T20:59:50Z", NOW)).toBe("1 min");
    expect(waitText("2026-10-06T18:02:00Z", NOW)).toBe("2 h");
    expect(waitText("2026-10-05T15:40:00Z", NOW)).toBe("1 day");
    expect(waitText("2026-10-03T22:12:00Z", NOW)).toBe("3 days");
  });
  it("open threads count from the customer's last message and are late after 1 business day", () => {
    expect(waitInfo(inquiry({ status: "new", last_customer_at: "2026-10-06T20:21:00Z" }), NOW)).toEqual({ since: "2026-10-06T20:21:00Z", text: "39 min", late: false });
    expect(waitInfo(inquiry({ status: "needs_reply", last_customer_at: "2026-10-05T15:40:00Z" }), NOW)).toMatchObject({ text: "1 day", late: true });
  });
  it("waiting threads count from our reply and are never late", () => {
    expect(waitInfo(inquiry({ status: "waiting", waiting_since: "2026-09-30T16:00:00Z" }), NOW)).toMatchObject({ late: false, since: "2026-09-30T16:00:00Z" });
  });
  it("closed threads have no clock", () => {
    expect(waitInfo(inquiry({ status: "closed", closed_at: "2026-10-01T00:00:00Z" }), NOW)).toBeNull();
  });
  it("businessDayText: the list footer's figure, distinct from the calendar waitText", () => {
    expect(businessDayText("2026-10-03T22:12:00Z", NOW)).toBe("2 business days");
    expect(businessDayText("2026-10-05T15:40:00Z", NOW)).toBe("1 business day");
    expect(businessDayText(new Date(NOW - 60_000).toISOString(), NOW)).toBe("under a business day");
  });
});

describe("refs, search, names", () => {
  it("formats and parses Q-numbers", () => {
    expect(refLabel(1047)).toBe("Q-1047");
    for (const s of ["Q-1047", "q1047", " 1047 ", "q-1047"]) expect(parseRef(s)).toBe(1047);
    expect(parseRef("AP-1047")).toBeNull();
    expect(parseRef("")).toBeNull();
  });
  it("cleans search text for PostgREST or-filters", () => {
    expect(cleanSearch(" dana,(w)%_\\ ")).toBe("danaw");
    expect(cleanSearch("x".repeat(200))).toHaveLength(100);
    expect(cleanSearch('"dana*whitfield"')).toBe("danawhitfield");
  });
  it("first name for previews", () => {
    expect(firstName("Dana Whitfield")).toBe("Dana");
    expect(firstName("  ")).toBe("Customer");
  });
  it("greeting name: 'there' for anything outside letters/space/'/- or over 40 chars", () => {
    expect(greetingName("Dana Whitfield")).toBe("Dana");
    expect(greetingName("Mary-Jane O'Hara")).toBe("Mary-Jane");
    expect(greetingName("Dana123")).toBe("there");
    expect(greetingName("😀Dana")).toBe("there");
    expect(greetingName("a".repeat(41))).toBe("there");
    expect(greetingName("a".repeat(40))).toBe("a".repeat(40));
  });
});

describe("history text", () => {
  it("reads like the mock", () => {
    expect(historyText({ action: "customer_replied", actorName: null, detail: "3 attachments" })).toBe("Customer replied · 3 attachments");
    expect(historyText({ action: "replied", actorName: "Kearney", detail: null })).toBe("Replied by Kearney");
    expect(historyText({ action: "opened", actorName: "Kearney", detail: null })).toBe("Opened by Kearney");
    expect(historyText({ action: "created", actorName: null, detail: "order" })).toBe("Received from contact form");
    expect(historyText({ action: "created", actorName: null, detail: "wholesale" })).toBe("Received from the wholesale form");
    expect(historyText({ action: "auto_closed", actorName: null, detail: null })).toBe("Closed automatically after 14 days");
    expect(historyText({ action: "topic_changed", actorName: "Kearney", detail: "Wholesale" })).toBe("Topic changed to Wholesale by Kearney");
    expect(historyText({ action: "bounced", actorName: null, detail: null })).toBe("Reply bounced");
    expect(historyText({ action: "replied", actorName: "Alvester", detail: "drafted by Assistant" })).toBe("Replied by Alvester · drafted by Assistant");
    expect(historyText({ action: "draft_saved", actorName: "Assistant", detail: null })).toBe("Draft saved by Assistant");
    expect(historyText({ action: "draft_discarded", actorName: "Alvester", detail: null })).toBe("Draft discarded by Alvester");
  });
});
