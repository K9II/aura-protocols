import { describe, it, expect } from "vitest";
import { NOW, WARNING_ID, brief, disputeRow, listRow, warningRow } from "../../helpers/dispute-fixtures";
import {
  byDue, closedNote, disputeStats, dueInfo, dueReminder, efwSuggestion, eventText, evidenceChip, fraudTypeLabel, historyRows,
  needsResponse, orderStateChip, outcomeChip, reasonLabel, respondRefusal, statusChip, warningActionData, type DisputeAction,
} from "@/lib/disputes/rules";

describe("dispute rules", () => {
  it("labels reasons and fraud types, falling back to readable words", () => {
    expect(reasonLabel("product_not_received")).toBe("Not received");
    expect(reasonLabel("product_unacceptable")).toBe("Not as described");
    expect(reasonLabel("bank_cannot_process")).toBe("Bank cannot process");
    expect(fraudTypeLabel("unauthorized_use_of_card")).toBe("Unauthorized use of card");
    expect(fraudTypeLabel("card_never_received")).toBe("Card never received");
  });

  it("chips: the evidence state while open, the outcome after", () => {
    expect(evidenceChip(disputeRow())).toEqual({ tone: "need", text: "Not started" });
    expect(evidenceChip(disputeRow({ draft_saved_at: "2026-10-06T15:31:00Z" }))).toEqual({ tone: "draftsaved", text: "Draft saved" });
    expect(evidenceChip(disputeRow({ evidence_submitted: true }))).toEqual({ tone: "review", text: "Submitted" });
    expect(outcomeChip(disputeRow({ status: "under_review" }))).toEqual({ tone: "review", text: "In review" });
    expect(outcomeChip(disputeRow({ status: "won" }))).toEqual({ tone: "won", text: "Won" });
    expect(outcomeChip(disputeRow({ status: "lost" }))).toEqual({ tone: "lost", text: "Lost" });
    expect(outcomeChip(disputeRow({ status: "warning_closed" }))).toEqual({ tone: "ended", text: "Inquiry closed" });
    expect(statusChip(disputeRow({ status: "won" })).text).toBe("Won");
    expect(statusChip(disputeRow()).text).toBe("Not started");
    expect(needsResponse(disputeRow())).toBe(true);
    expect(needsResponse(disputeRow({ status: "warning_needs_response" }))).toBe(true);
    expect(needsResponse(disputeRow({ evidence_submitted: true }))).toBe(false);
  });

  it("deadlines count Mountain days; red at 3 days or less, or past", () => {
    expect(dueInfo("2026-10-09T23:59:59Z", NOW)).toEqual({ date: "Oct 9", daysLeft: 2, past: false, red: true, left: "2 days left", short: "2 days" });
    expect(dueInfo("2026-10-10T23:59:59Z", NOW)?.red).toBe(true);
    expect(dueInfo("2026-10-11T23:59:59Z", NOW)).toMatchObject({ daysLeft: 4, red: false });
    expect(dueInfo("2026-10-24T23:59:59Z", NOW)).toMatchObject({ date: "Oct 24", daysLeft: 17, red: false, short: "17 days" });
    expect(dueInfo("2026-10-07T23:59:59Z", NOW)).toMatchObject({ daysLeft: 0, past: false, red: true, left: "due today", short: "today" });
    expect(dueInfo("2026-10-07T15:00:00Z", NOW)).toMatchObject({ past: true, red: true, left: "past due", short: "past due" });
    expect(dueInfo(null, NOW)).toBeNull();
    expect([listRow({ evidence_due_by: "2026-10-24T00:00:00Z" }), listRow({ evidence_due_by: null }), listRow()].sort(byDue).map((d) => d.evidence_due_by))
      .toEqual(["2026-10-09T23:59:59Z", "2026-10-24T00:00:00Z", null]);
  });

  it("a response is refused once submitted, closed, or clearly past the deadline; inside the drift window Stripe decides", () => {
    expect(respondRefusal(disputeRow(), NOW)).toBeNull();
    expect(respondRefusal(disputeRow({ evidence_submitted: true }), NOW)).toMatch(/already submitted/);
    expect(respondRefusal(disputeRow({ status: "under_review" }), NOW)).toMatch(/isn't waiting for a response/);
    expect(respondRefusal(disputeRow({ evidence_due_by: new Date(NOW - 3 * 60_000).toISOString() }), NOW)).toMatch(/deadline has passed/);
    expect(respondRefusal(disputeRow({ evidence_due_by: new Date(NOW - 60_000).toISOString() }), NOW)).toBeNull();
  });

  it("reminders: once at 3 days and once at 1 day; a missed 3-day one isn't sent late", () => {
    const at = new Date(NOW).toISOString();
    expect(dueReminder({ evidence_due_by: "2026-10-10T23:59:59Z", reminded: {} }, NOW)).toEqual({ day: 3, daysLeft: 3, marks: { "3": at } });
    expect(dueReminder({ evidence_due_by: "2026-10-10T23:59:59Z", reminded: { "3": "x" } }, NOW)).toBeNull();
    expect(dueReminder({ evidence_due_by: "2026-10-08T23:59:59Z", reminded: {} }, NOW)).toEqual({ day: 1, daysLeft: 1, marks: { "3": at, "1": at } });
    expect(dueReminder({ evidence_due_by: "2026-10-08T23:59:59Z", reminded: { "3": "x" } }, NOW)).toEqual({ day: 1, daysLeft: 1, marks: { "3": "x", "1": at } });
    expect(dueReminder({ evidence_due_by: "2026-10-24T23:59:59Z", reminded: {} }, NOW)).toBeNull();
    expect(dueReminder({ evidence_due_by: "2026-10-07T15:00:00Z", reminded: {} }, NOW)).toBeNull();
    expect(dueReminder({ evidence_due_by: null, reminded: {} }, NOW)).toBeNull();
  });

  it("early warnings: not shipped → refund; shipped → watch; already refunded → close", () => {
    expect(efwSuggestion(brief({ status: "paid", shippedAt: null }))).toMatchObject({ kind: "refund", label: "Cancel and refund…", todo: "Not shipped yet", hint: "refund now to avoid a chargeback" });
    expect(efwSuggestion(brief({ status: "shipped", shippedAt: "2026-09-20T18:00:00Z" }))).toMatchObject({ kind: "watch", label: "Watch", todo: "Shipped Sep 20" });
    expect(efwSuggestion(brief({ status: "refunded" }))).toMatchObject({ kind: "close", label: "Close", todo: "Refunded" });
    expect(warningActionData(warningRow())).toEqual({ id: WARNING_ID, orderNumber: "AP-1044", kind: "refund", chargedCents: 18450, creditCents: 0 });
    expect(warningActionData(warningRow({}, { creditCents: 2000 })).chargedCents).toBe(16450);
    expect(orderStateChip(brief({ status: "paid" }))).toEqual({ cls: "o-paid", text: "Paid · not shipped" });
    expect(orderStateChip(brief({ status: "shipped", shippedAt: "2026-09-20T18:00:00Z" }))).toEqual({ cls: "o-shipped", text: "Shipped Sep 20" });
  });

  it("stats: the rate against Stripe's review level, next deadline, open warnings, won in 12 months", () => {
    const s = disputeStats(
      [listRow(), listRow({ id: "d2", evidence_due_by: "2026-10-24T23:59:59Z" }),
        listRow({ id: "d3", status: "won", closed_at: "2026-09-30T16:02:00Z", amount_cents: 32900 }),
        listRow({ id: "d4", status: "lost", closed_at: "2026-09-26T16:02:00Z" }),
        listRow({ id: "d5", status: "won", closed_at: "2025-06-01T00:00:00Z" })],
      [warningRow(), warningRow({ id: "w2" }, { status: "shipped" }), warningRow({ id: "w3", resolved_action: "watching", resolved_at: "2026-10-01T00:00:00Z" })],
      { disputes: 3, charges: 1412 }, NOW);
    expect(s).toEqual({
      rate: "0.21%", rateSub: "3 of 1,412 payments · Stripe reviews at 0.75%", gaugePct: 28,
      needs: 2, nextDue: "Oct 9", warnings: 2, notShipped: 1, won: 1, decided: 2, recoveredCents: 32900,
    });
    expect(disputeStats([], [], { disputes: 0, charges: 0 }, NOW)).toMatchObject({ rate: "—", gaugePct: 0, needs: 0, nextDue: null, decided: 0 });
  });

  it("history: decided and in-review chargebacks plus resolved warnings, newest first", () => {
    const rows = historyRows(
      [listRow(), listRow({ id: "d3", status: "won", closed_at: "2026-09-30T16:02:00Z", amount_cents: 32900 }, { number: "AP-1012", customerName: "M. Okafor" }),
        listRow({ id: "d6", status: "under_review", updated_at: "2026-10-06T10:00:00Z" }, { number: "AP-1020" })],
      [warningRow({ resolved_action: "refunded", resolved_at: "2026-09-18T20:00:00Z" }, { number: "AP-1007", totalCents: 6950 })]);
    expect(rows.map((r) => [r.orderNumber, r.chip.text, r.when])).toEqual([["AP-1020", "In review", "—"], ["AP-1012", "Won", "Sep 30"], ["AP-1007", "Refunded before shipping", "Sep 18"]]);
    expect(rows[1]).toMatchObject({ href: "/admin/disputes/d3", reason: "Not received", amountCents: 32900, customer: "M. Okafor" });
    expect(rows[2]).toMatchObject({ href: null, reason: "Early warning", amountCents: 6950 });
  });

  it("activity text", () => {
    const e = (action: DisputeAction, note: string | null = null, actorName: string | null = null) => ({ id: "e", action, note, at: "2026-10-06T15:31:00Z", actorName });
    expect(eventText(e("opened", "product_not_received"))).toEqual({ text: "Chargeback opened · not received", sub: "owner alerted" });
    expect(eventText(e("draft_saved", null, "Kearney")).text).toBe("Draft saved to Stripe by Kearney");
    expect(eventText(e("submitted", null, "Kearney")).text).toBe("Evidence submitted by Kearney");
    expect(eventText(e("funds_withdrawn", "$412.00 + $15.00 fee")).text).toBe("$412.00 + $15.00 fee withdrawn");
    expect(eventText(e("reminder", "3 days left"))).toEqual({ text: "Reminder: 3 days left", sub: "owner alerted" });
    expect(eventText(e("closed", closedNote("won", 32900))).text).toBe("Won · $329.00 returned");
    expect(closedNote("lost", 14700)).toBe("Lost · $147.00 not returned");
    expect(closedNote("warning_closed", 1)).toBe("Inquiry closed");
  });
});
