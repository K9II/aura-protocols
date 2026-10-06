import { describe, it, expect } from "vitest";
import { clipDetail, firstLine, normalizeAlertTitle, sortAlerts, type OwnerAlert } from "@/lib/today/alert-rules";
import {
  alertsSection, disputesSection, emailSection, excerpt, inquiriesSection, lotsSection, navCount, ordersSection, partnersSection, stockSection,
  type InquiryPreview, type ShipOrder,
} from "@/lib/today/todos";
import type { AdminLotRow, AdminRow } from "@/lib/catalog-ops/rules";
import { DISPUTE_ID, NOW as DNOW, WARNING_ID, listRow, warningRow } from "../../helpers/dispute-fixtures";

const NOW = Date.parse("2026-10-06T15:42:00Z"); // Tue Oct 6, 9:42 am MDT
const alert = (o: Partial<OwnerAlert> = {}): OwnerAlert => ({
  id: "a1", title: "Shipped lots don't match what was held", detail: "AP-1042 · line i1\nheld AP-BPC-2610", count: 1,
  first_at: "2026-10-06T14:15:00Z", last_at: "2026-10-06T14:15:00Z", resolved_at: null, resolved_by_name: null, note: null, ...o,
});
const order = (n: number, paid: string): ShipOrder => ({ order_number: `AP-10${n}`, ship_name: `Customer ${n}`, total_cents: 41200, paid_at: paid, created_at: paid, items: 3 });
const row = (o: Partial<AdminRow>): AdminRow => ({
  slug: "bpc-157", name: "BPC-157", chemicalClass: "Peptide Fragments", variantId: "10mg", strength: "10 mg", priceCents: 6900, lowAt: 10, sku: null,
  shown: true, productShown: true, strengthShown: true, archivedAt: null, available: 50, held: 0, stock: "in",
  selling: null, next: null, lastSoldOut: null, hasDraft: false, hasDiscrepancy: false, ...o,
});
const lot = (o: Partial<AdminLotRow>): AdminLotRow => ({
  id: "l1", lot_number: "AP-TB5-2611", slug: "tb-500", variant_id: "10mg", purity_pct: 99.1, method: "HPLC", tested_on: "2026-10-01",
  coa_path: "AP-TB5-2611/1.pdf", status: "draft", live_at: null, sellable: 120, held: 0, sold: 0, available: 120,
  ordered_qty: 120, counted_qty: 120, damaged_qty: 0, adjust_qty: 0, discrepancy_note: null, received_by: null, received_by_name: null,
  received_at: "2026-10-05T16:00:00Z", retired_at: null, ...o,
});
const healthyRun = { started_at: "2026-10-06T15:28:00Z", finished_at: "2026-10-06T15:29:00Z", welcome_sent: 4, cart_sent: 2, cart_skipped: 0, campaign_sent: 0, failures: 0, error_text: null };
const overview = { confirmed: 2310, pending: 96, unsubscribed: 141, sent_30d: 1460, sent_prior_30d: 1200, bounces_30d: 10, complaints_30d: 0 };
const inq = (id: string, at: string, o: Partial<InquiryPreview> = {}): InquiryPreview => ({
  id, kind: "wholesale", name: "Jo Park", organization: "Meridian Peptide Lab", message: "Do you offer COAs per vial for bulk orders?", created_at: at, ...o,
});

describe("alert rules", () => {
  it("titles are whitespace-collapsed, trimmed and capped; details capped", () => {
    expect(normalizeAlertTitle("  Email run\n  had failures ")).toBe("Email run had failures");
    expect(normalizeAlertTitle("   ")).toBe("Owner alert");
    expect(normalizeAlertTitle("x".repeat(300))).toHaveLength(160);
    expect(clipDetail("y".repeat(5000))).toHaveLength(4000);
    expect(clipDetail("short")).toBe("short");
    expect(firstLine("\n  first \nsecond")).toBe("first");
  });

  it("past alerts: open first, then newest", () => {
    const out = sortAlerts([
      alert({ id: "done-new", resolved_at: "2026-10-06T15:30:00Z", last_at: "2026-10-06T15:00:00Z" }),
      alert({ id: "open-old", last_at: "2026-10-01T00:00:00Z" }),
      alert({ id: "done-old", resolved_at: "2026-10-03T00:00:00Z", last_at: "2026-10-02T00:00:00Z" }),
    ]);
    expect(out.map((a) => a.id)).toEqual(["open-old", "done-new", "done-old"]);
  });
});

describe("to-do sections", () => {
  it("alerts: open only, newest first, ×N with last and first time, Past alerts link", () => {
    const s = alertsSection([
      alert({ id: "a1" }),
      alert({ id: "a2", title: "Campaign send now failed to start", detail: "\"October restock\": SES throttled", count: 3, first_at: "2026-10-06T13:00:00Z", last_at: "2026-10-06T15:00:00Z" }),
      alert({ id: "a3", resolved_at: "2026-10-06T15:00:00Z" }),
    ], NOW)!;
    expect(s.n).toBe(2);
    expect(s.tone).toBe("red");
    expect(s.link).toEqual({ label: "Past alerts", href: "/admin/alerts" });
    expect(s.lines.map((l) => l.key)).toEqual(["a2", "a1"]);
    expect(s.lines[0].detail).toBe("\"October restock\": SES throttled · last 9:00 am, first 7:00 am");
    expect(s.lines[1].detail).toBe("AP-1042 · line i1 · 8:15 am");
    expect(s.lines[0].alert).toMatchObject({ id: "a2", count: 3, when: "last 9:00 am, first 7:00 am" });
    expect(alertsSection([], NOW)).toBeNull();
  });

  it("orders to ship: oldest first, late ones red, capped at 5 with the rest counted", () => {
    const s = ordersSection([
      order(43, "2026-10-06T15:12:00Z"), order(38, "2026-10-01T15:00:00Z"), order(40, "2026-10-05T15:00:00Z"),
      order(41, "2026-10-05T16:00:00Z"), order(42, "2026-10-06T13:51:00Z"), order(44, "2026-10-06T15:30:00Z"),
    ], NOW)!;
    expect(s.n).toBe(6);
    expect(s.lines.map((l) => l.mono)).toEqual(["AP-1038", "AP-1040", "AP-1041", "AP-1042", "AP-1043"]);
    expect(s.more).toBe(1);
    expect(s.tone).toBe("red");
    expect(s.link).toEqual({ label: "Orders", href: "/admin/orders?status=paid" });
    expect(s.lines[0]).toMatchObject({
      icon: "clock", tone: "red", title: "Customer 38", href: "/admin/orders?status=paid#AP-1038",
      age: { text: "3 bus. days · late", late: true }, detail: "3 items · $412.00 · paid Thu, Oct 1",
      action: { label: "Pick list", href: "/admin/orders/AP-1038/pick" },
    });
    expect(s.lines[3]).toMatchObject({ icon: "orders", tone: "mut", age: { text: "today", late: false } });
    expect(ordersSection([], NOW)).toBeNull();
  });

  it("stock: shown strengths that are out (first, red) or low (amber); hidden ones never", () => {
    const s = stockSection([
      row({ slug: "ghk-cu", name: "GHK-Cu", variantId: "50mg", strength: "50 mg", available: 4, lowAt: 5, stock: "low" }),
      row({ slug: "tb-500", name: "TB-500", available: 0, held: 2, stock: "out" }),
      row({ available: 7, stock: "low" }),
      row({ slug: "x", name: "Hidden", available: 0, stock: "out", shown: false }),
      row({ slug: "y", name: "Fine" }),
    ])!;
    expect(s.n).toBe(3);
    expect(s.lines.map((l) => l.title)).toEqual(["TB-500 · 10 mg", "GHK-Cu · 50 mg", "BPC-157 · 10 mg"]);
    expect(s.lines[0]).toMatchObject({ tone: "red", detail: "Out of stock · 0 available · 2 held in open checkouts", chip: { tone: "refund", text: "Out" }, href: "/admin/catalog/tb-500" });
    expect(s.lines[1]).toMatchObject({ tone: "amb", detail: "4 available · low at 5", chip: { tone: "paused", text: "Low" } });
    expect(s.tone).toBe("red");
    expect(stockSection([row({})])).toBeNull();
  });

  it("lots: drafts ready to go live, missing a certificate, or with nothing to sell; one line for lots waiting to announce", () => {
    const label = (slug: string, v: string) => `${slug.toUpperCase()} ${v}`;
    const s = lotsSection([
      lot({}),
      lot({ id: "l2", lot_number: "AP-GHK-2612", slug: "ghk-cu", variant_id: "50mg", coa_path: null, counted_qty: 80, sellable: 80, received_at: "2026-10-05T18:00:00Z" }),
      lot({ id: "l3", lot_number: "AP-TB5-2613", sellable: 0, received_at: "2026-10-06T10:00:00Z" }),
      lot({ id: "l4", lot_number: "AP-LIVE", status: "live" }),
    ], label, [
      { compoundName: "Semaglutide", slug: "semaglutide", strengths: "5 mg", lot: "AP-SEM-2609", purityPct: 99.2, method: "HPLC+MS", testedOn: "2026-09-30", coaFile: "/coa/a.pdf" },
      { compoundName: "BPC-157", slug: "bpc-157", strengths: "10 mg", lot: "AP-BPC-2610", purityPct: 99.4, method: "HPLC+MS", testedOn: "2026-10-01", coaFile: "/coa/b.pdf" },
    ])!;
    expect(s.n).toBe(5);
    expect(s.lines.map((l) => l.title)).toEqual([
      "TB-500 10mg is ready to put live", "GHK-CU 50mg is missing its certificate", "TB-500 10mg has nothing to sell", "2 lots waiting to announce",
    ]);
    expect(s.lines[0]).toMatchObject({ mono: "AP-TB5-2611", tone: "slate", detail: "Certificate and receiving check done · 120 vials", action: { label: "Open lot", href: "/admin/catalog/tb-500" } });
    expect(s.lines[1]).toMatchObject({ tone: "amb", detail: "Draft · received Oct 5 · 80 vials counted" });
    expect(s.lines[3]).toMatchObject({ icon: "send", detail: "AP-SEM-2609 · Semaglutide 5 mg · and 1 more", action: { label: "Announce", announce: true } });
    expect(lotsSection([lot({ status: "live" })], label, [])).toBeNull();
  });

  it("email: a late hourly run, rates at half of Amazon's limit, a campaign sending; nothing when healthy", () => {
    expect(emailSection({ lastRun: healthyRun, overview, sending: null }, NOW)).toBeNull();
    const s = emailSection({
      lastRun: { ...healthyRun, started_at: "2026-10-06T12:00:00Z", finished_at: "2026-10-06T12:01:00Z" },
      overview: { ...overview, bounces_30d: 41, complaints_30d: 2 },
      sending: { id: "k1", name: "October restock", recipients: 2198, started_at: "2026-10-06T15:00:00Z" },
    }, NOW)!;
    expect(s.lines.map((l) => l.key)).toEqual(["run", "bounce", "complaint", "sending:k1"]);
    expect(s.n).toBe(4);
    expect(s.lines[0]).toMatchObject({ tone: "red", action: { label: "Run history", href: "/admin/email/runs" } });
    expect(s.lines[0].title).toMatch(/may have stopped/);
    expect(s.lines[1]).toMatchObject({ tone: "amb", title: "Bounce rate is 2.8% · past half of Amazon's 5% limit", detail: "41 bounced of 1,460 sent in 30 days" });
    expect(s.lines[2]).toMatchObject({ tone: "red", title: "Complaint rate is 0.1% · at or over Amazon's 0.1% limit", detail: "2 complaints of 1,460 sent in 30 days" });
    expect(s.lines[3]).toMatchObject({ title: "Campaign \"October restock\" is sending", detail: "2,198 recipients · started 9:00 am", action: { label: "Open", href: "/admin/email/campaigns/k1" } });
  });

  it("partners: applications waiting and payouts queued, counted together", () => {
    const s = partnersSection(
      [
        { id: "p1", code: "NORTH", created_at: "2026-10-05T16:00:00Z", customers: { full_name: "Ann North", organization: "Northwind Research" } },
        { id: "p2", code: "RCAST", created_at: "2026-10-04T16:00:00Z", customers: { full_name: "R. Castillo", organization: null } },
      ],
      [{ id: "y1", run_date: "2026-10-01", cash_cents: 18420, method: "zelle", partners: { code: "HELIX", payout_method: "zelle" } }],
    )!;
    expect(s.n).toBe(3);
    expect(s.link).toBeNull();
    expect(s.lines[0]).toMatchObject({ title: "2 partner applications waiting", detail: "Northwind Research (Oct 5) · R. Castillo (Oct 4)", action: { label: "Review", href: "/admin/partners" } });
    expect(s.lines[1]).toMatchObject({ title: "1 payout queued, not paid yet", detail: "Oct 1 run · HELIX · $184.20 by Zelle", action: { label: "Payouts", href: "/admin/payouts" } });
    expect(partnersSection([], [])).toBeNull();
  });

  it("inquiries: the count of new ones, the newest previewed, Mark seen up to the newest shown", () => {
    const s = inquiriesSection({ count: 5, latest: [
      inq("i1", "2026-10-06T14:03:00Z"),
      inq("i2", "2026-10-05T20:00:00Z", { kind: "affiliate", organization: null, name: "S. Bryant" }),
      inq("i3", "2026-10-05T19:00:00Z"),
    ] }, NOW)!;
    expect(s.n).toBe(5);
    expect(s.more).toBe(2);
    expect(s.seenUpTo).toBe("2026-10-06T14:03:00Z");
    expect(s.lines[0]).toMatchObject({ title: "Wholesale · Meridian Peptide Lab", detail: "\"Do you offer COAs per vial for bulk orders?\" · 8:03 am" });
    expect(s.lines[1].title).toBe("Affiliate · S. Bryant");
    expect(excerpt("x".repeat(70))).toBe(`${"x".repeat(59)}…`);
    expect(inquiriesSection({ count: 0, latest: [] }, NOW)).toBeNull();
  });

  it("the nav count adds up every section's count", () => {
    const sections = [alertsSection([alert({})], NOW), null, ordersSection([order(40, "2026-10-05T15:00:00Z"), order(41, "2026-10-05T16:00:00Z")], NOW)];
    expect(navCount(sections)).toBe(3);
  });
});

describe("Today: disputes section", () => {
  it("chargebacks by deadline and early warnings with their action; red first; submitted ones don't count", () => {
    const s = disputesSection([
      listRow({ id: "d2", evidence_due_by: "2026-10-24T23:59:59Z", reason: "fraudulent", amount_cents: 25800 }, { number: "AP-1036" }),
      listRow({ draft_saved_at: "2026-10-06T15:31:00Z" }),
      listRow({ id: "d3", evidence_submitted: true }, { number: "AP-1050" }),
    ], [warningRow(), warningRow({ id: "w9", resolved_action: "watching", resolved_at: "2026-10-06T00:00:00Z" })], DNOW)!;
    expect(s).toMatchObject({ key: "disputes", title: "Disputes", n: 3, tone: "red", link: { label: "Disputes", href: "/admin/disputes" } });
    expect(s.lines.map((l) => l.mono)).toEqual(["AP-1031", "AP-1044", "AP-1036"]);
    expect(s.lines[0]).toMatchObject({
      title: "respond by Oct 9", detail: "Not received · $412.00 · draft saved", tone: "red", age: { text: "2 days", late: true },
      href: `/admin/disputes/${DISPUTE_ID}`, action: { label: "Respond", href: `/admin/disputes/${DISPUTE_ID}` },
    });
    expect(s.lines[1]).toMatchObject({ title: "Early fraud warning", detail: "Not shipped yet · $184.50 · refund now to avoid a chargeback", tone: "red" });
    expect(s.lines[1].action).toEqual({ label: "Cancel and refund…", warning: { id: WARNING_ID, orderNumber: "AP-1044", kind: "refund", chargedCents: 18450, creditCents: 0 } });
    expect(s.lines[2]).toMatchObject({ title: "respond by Oct 24", detail: "Fraudulent · $258.00 · not started", tone: "mut", age: { text: "17 days", late: false } });
    expect(disputesSection([], [], DNOW)).toBeNull();
  });

  it("a shipped order's warning suggests Watch (amber)", () => {
    const s = disputesSection([], [warningRow({}, { status: "shipped", shippedAt: "2026-09-20T18:00:00Z", number: "AP-1029", totalCents: 9600 })], DNOW)!;
    expect(s.lines[0]).toMatchObject({ tone: "amb", detail: "Shipped Sep 20 · $96.00 · no refund after shipping; watch for a chargeback" });
    expect(s.lines[0].action).toMatchObject({ label: "Watch", warning: { kind: "watch" } });
    expect(s.tone).toBe("amb");
  });
});
