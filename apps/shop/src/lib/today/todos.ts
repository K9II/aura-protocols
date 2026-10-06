// Today's to-do list: what each section shows, in what order, how many lines
// and how urgent. Pure — lib/today/today.ts feeds it what each module's own
// data functions return.
import type { IconName } from "@/components/admin/ui";
import type { AdminLotRow, AdminRow } from "@/lib/catalog-ops/rules";
import { liveRefusal } from "@/lib/catalog-ops/rules";
import type { AlertLot } from "@/lib/emails-marketing";
import type { Overview } from "@/lib/email/stats";
import { fmtPct, pct, runHealth, type RunRow } from "@/lib/email/health";
import { BOUNCE_LIMIT_PCT, COMPLAINT_LIMIT_PCT, STATS_DAYS } from "@/lib/email/constants";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { EXCERPT_CHARS, RATE_TODO_SHARE, TODO_LINES_MAX } from "@/lib/today/constants";
import { firstLine, type OwnerAlert } from "@/lib/today/alert-rules";
import { dateLabel, paidText, shipAge, whenText } from "@/lib/today/time";
import {
  byDue, dueInfo, efwSuggestion, evidenceChip, needsResponse, reasonLabel, warningActionData,
  type DisputeListRow, type WarningActionData, type WarningListRow,
} from "@/lib/disputes/rules";

export type LineTone = "red" | "amb" | "slate" | "mut";
export type AlertLineData = OwnerAlert & { when: string };
export type TodoAction = { label: string; href: string; icon?: IconName } | { label: string; announce: true } | { label: string; warning: WarningActionData };
export type TodoLine = {
  key: string; icon: IconName; tone: LineTone;
  mono?: string;          // an order or lot number, shown first in mono
  href?: string;          // the number (or, without one, the title) links here
  title: string; detail: string;
  age?: { text: string; late: boolean };
  chip?: { tone: "refund" | "paused"; text: string };
  action?: TodoAction;
  alert?: AlertLineData;  // alerts only: what the Done dialog shows
};
export type SectionKey = "alerts" | "disputes" | "orders" | "stock" | "lots" | "email" | "partners" | "inquiries";
export type TodoSection = {
  key: SectionKey; title: string; icon: IconName;
  n: number;              // the header count; the nav count adds these up
  tone: "red" | "amb" | null;
  link: { label: string; href: string } | null;
  lines: TodoLine[];      // at most TODO_LINES_MAX
  more: number;           // lines (inquiries: inquiries) not shown
  seenUpTo?: string;      // inquiries: Mark seen up to this created_at
};

// Sections load in slots, most urgent first. Stock and Lots share one catalog
// read, so they load — and fail — together as "Stock and lots".
export const SLOT_KEYS = ["alerts", "disputes", "orders", "catalog", "email", "partners", "inquiries"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];
export const SLOT_INFO: Record<SlotKey, { title: string; icon: IconName }> = {
  alerts: { title: "Alerts", icon: "warn" },
  disputes: { title: "Disputes", icon: "shield" },
  orders: { title: "Orders to ship", icon: "orders" },
  catalog: { title: "Stock and lots", icon: "catalog" },
  email: { title: "Email", icon: "mail" },
  partners: { title: "Partners", icon: "partners" },
  inquiries: { title: "Inquiries", icon: "inbox" },
};
export type Slot = { key: SlotKey; title: string; icon: IconName; sections: TodoSection[] | null }; // null = couldn't load

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

// A section shows only when it has something; capped at TODO_LINES_MAX lines.
// Its tone is the most urgent of all its lines (shown or not).
function build(head: Omit<TodoSection, "tone" | "lines" | "more">, all: TodoLine[], more?: number): TodoSection | null {
  if (head.n <= 0 || all.length === 0) return null;
  const lines = all.slice(0, TODO_LINES_MAX);
  const tone = all.some((l) => l.tone === "red") ? "red" : all.some((l) => l.tone === "amb") ? "amb" : null;
  return { ...head, tone, lines, more: more ?? all.length - lines.length };
}

export const navCount = (sections: Array<TodoSection | null>): number => sections.reduce((s, x) => s + (x?.n ?? 0), 0);

export function excerpt(text: string, max = EXCERPT_CHARS): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// ---------- 1. alerts ----------
export function alertsSection(alerts: OwnerAlert[], nowMs: number): TodoSection | null {
  const open = alerts.filter((a) => !a.resolved_at).sort((a, b) => b.last_at.localeCompare(a.last_at));
  const lines = open.map((a): TodoLine => {
    const last = whenText(a.last_at, nowMs);
    const when = a.count > 1 ? `last ${last}, first ${whenText(a.first_at, nowMs)}` : last;
    return { key: a.id, icon: "warn", tone: "red", title: a.title, detail: [firstLine(a.detail), when].filter(Boolean).join(" · "), alert: { ...a, when } };
  });
  return build({ key: "alerts", title: "Alerts", icon: "warn", n: open.length, link: { label: "Past alerts", href: "/admin/alerts" } }, lines);
}

// ---------- 1b. disputes (Part 6) ----------
// Chargebacks waiting for evidence (soonest deadline first) and open early
// fraud warnings with their suggested action; anything red comes first.
export function disputesSection(disputes: DisputeListRow[], warnings: WarningListRow[], nowMs: number): TodoSection | null {
  const open = disputes.filter(needsResponse).sort(byDue);
  const openWarnings = warnings.filter((w) => !w.resolved_at);
  const lines: TodoLine[] = [
    ...open.map((d): TodoLine => {
      const due = dueInfo(d.evidence_due_by, nowMs);
      const href = `/admin/disputes/${d.id}`;
      return {
        key: d.id, icon: "clock", tone: due?.red ? "red" : "mut", mono: d.order.number, href,
        title: due ? `respond by ${due.date}` : "respond", detail: `${reasonLabel(d.reason)} · ${usd(d.amount_cents)} · ${evidenceChip(d).text.toLowerCase()}`,
        age: due ? { text: due.short, late: due.red } : undefined, action: { label: "Respond", href },
      };
    }),
    ...openWarnings.map((w): TodoLine => {
      const s = efwSuggestion(w.order);
      return {
        key: w.id, icon: "warn", tone: s.kind === "refund" ? "red" : "amb", mono: w.order.number, href: "/admin/disputes",
        title: "Early fraud warning", detail: `${s.todo} · ${usd(w.order.totalCents - w.order.creditCents)} · ${s.hint}`,
        action: { label: s.label, warning: warningActionData(w) },
      };
    }),
  ].sort((a, b) => (a.tone === "red" ? 0 : 1) - (b.tone === "red" ? 0 : 1));
  return build({ key: "disputes", title: "Disputes", icon: "shield", n: open.length + openWarnings.length, link: { label: "Disputes", href: "/admin/disputes" } }, lines);
}

// ---------- 2. orders to ship ----------
export type ShipOrder = { order_number: string; ship_name: string; total_cents: number; paid_at: string | null; created_at: string; items: number };
export function ordersSection(orders: ShipOrder[], nowMs: number): TodoSection | null {
  const paidAt = (o: ShipOrder) => o.paid_at ?? o.created_at;
  const lines = [...orders].sort((a, b) => paidAt(a).localeCompare(paidAt(b))).map((o): TodoLine => {
    const age = shipAge(paidAt(o), nowMs);
    return {
      key: o.order_number, icon: age.late ? "clock" : "orders", tone: age.late ? "red" : "mut",
      mono: o.order_number, href: `/admin/orders?status=paid#${o.order_number}`, title: o.ship_name,
      detail: `${plural(o.items, "item")} · ${usd(o.total_cents)} · ${paidText(paidAt(o), nowMs)}`,
      age, action: { label: "Pick list", href: `/admin/orders/${o.order_number}/pick` },
    };
  });
  return build({ key: "orders", title: "Orders to ship", icon: "orders", n: orders.length, link: { label: "Orders", href: "/admin/orders?status=paid" } }, lines);
}

// ---------- 3. stock ----------
// AdminRow.shown already means product shown AND strength shown AND not archived.
export function stockSection(rows: AdminRow[]): TodoSection | null {
  const watch = rows.filter((r) => r.shown && r.stock !== "in")
    .sort((a, b) => (a.stock === b.stock ? a.available - b.available || a.name.localeCompare(b.name) : a.stock === "out" ? -1 : 1));
  const lines = watch.map((r): TodoLine => {
    const base = { key: `${r.slug}:${r.variantId}`, href: `/admin/catalog/${r.slug}`, title: `${r.name} · ${r.strength}` };
    return r.stock === "out"
      ? { ...base, icon: "warn", tone: "red", detail: `Out of stock · 0 available${r.held ? ` · ${r.held} held in open checkouts` : ""}`, chip: { tone: "refund", text: "Out" } }
      : { ...base, icon: "info", tone: "amb", detail: `${r.available} available · low at ${r.lowAt}`, chip: { tone: "paused", text: "Low" } };
  });
  return build({ key: "stock", title: "Stock", icon: "catalog", n: watch.length, link: { label: "Catalog", href: "/admin/catalog" } }, lines);
}

// ---------- 4. lots ----------
export function lotsSection(lots: AdminLotRow[], label: (slug: string, variantId: string) => string, waiting: AlertLot[]): TodoSection | null {
  const drafts = lots.filter((l) => l.status === "draft").sort((a, b) => a.received_at.localeCompare(b.received_at));
  const lines = drafts.map((l): TodoLine => {
    const name = label(l.slug, l.variant_id), href = `/admin/catalog/${l.slug}`;
    const base = { key: l.id, mono: l.lot_number, href, action: { label: "Open lot", href } };
    // The same test the Put live button uses.
    if (!liveRefusal({ status: l.status, coaPath: l.coa_path, sellable: l.sellable })) {
      return { ...base, icon: "check", tone: "slate", title: `${name} is ready to put live`, detail: `Certificate and receiving check done · ${plural(l.sellable, "vial")}` };
    }
    if (!l.coa_path) {
      return { ...base, icon: "info", tone: "amb", title: `${name} is missing its certificate`, detail: `Draft · received ${shortDate(l.received_at)} · ${plural(l.counted_qty, "vial")} counted` };
    }
    return { ...base, icon: "warn", tone: "amb", title: `${name} has nothing to sell`, detail: "Draft · every counted vial is damaged" };
  });
  if (waiting.length) {
    const [w] = waiting;
    lines.push({
      key: "waiting", icon: "send", tone: "slate", title: `${plural(waiting.length, "lot")} waiting to announce`,
      detail: `${w.lot} · ${w.compoundName} ${w.strengths}${waiting.length > 1 ? ` · and ${waiting.length - 1} more` : ""}`,
      action: { label: "Announce", announce: true },
    });
  }
  return build({ key: "lots", title: "Lots", icon: "flask", n: drafts.length + waiting.length, link: { label: "Catalog", href: "/admin/catalog?tab=drafts" } }, lines);
}

// ---------- 5. email ----------
export type EmailInput = {
  lastRun: RunRow | null; overview: Overview;
  sending: { id: string; name: string; recipients: number; started_at: string | null } | null;
};
export function emailSection(i: EmailInput, nowMs: number): TodoSection | null {
  const lines: TodoLine[] = [];
  const run = runHealth(i.lastRun, nowMs); // the same rule as the Email page's run line
  if (run.tone === "red") lines.push({ key: "run", icon: "clock", tone: "red", title: run.title, detail: run.detail, action: { label: "Run history", href: "/admin/email/runs" } });
  const sent = i.overview.sent_30d;
  const rate = (key: "bounce" | "complaint", count: number, limit: number) => {
    const p = pct(count, sent);
    if (p < limit * RATE_TODO_SHARE) return;
    const over = p >= limit;
    lines.push({
      key, icon: over ? "warn" : "info", tone: over ? "red" : "amb",
      title: `${key === "bounce" ? "Bounce" : "Complaint"} rate is ${fmtPct(p)} · ${over ? "at or over" : "past half of"} Amazon's ${limit}% limit`,
      detail: `${key === "bounce" ? `${count.toLocaleString("en-US")} bounced` : plural(count, "complaint")} of ${sent.toLocaleString("en-US")} sent in ${STATS_DAYS} days`,
      action: { label: "Open Email", href: "/admin/email" },
    });
  };
  rate("bounce", i.overview.bounces_30d, BOUNCE_LIMIT_PCT);
  rate("complaint", i.overview.complaints_30d, COMPLAINT_LIMIT_PCT);
  if (i.sending) {
    lines.push({
      key: `sending:${i.sending.id}`, icon: "send", tone: "slate", title: `Campaign "${i.sending.name}" is sending`,
      detail: `${plural(i.sending.recipients, "recipient")}${i.sending.started_at ? ` · started ${whenText(i.sending.started_at, nowMs)}` : ""}`,
      action: { label: "Open", href: `/admin/email/campaigns/${i.sending.id}` },
    });
  }
  return build({ key: "email", title: "Email", icon: "mail", n: lines.length, link: { label: "Email", href: "/admin/email" } }, lines);
}

// ---------- 6. partners ----------
export type AppliedPartner = { id: string; code: string; created_at: string; customers?: { full_name: string; organization: string | null } | null };
export type QueuedPayout = { id: string; run_date: string; cash_cents: number; method: string | null; partners?: { code: string; payout_method: string | null } | null };
const METHOD: Record<string, string> = { ach: "ACH", zelle: "Zelle" };
export function partnersSection(applied: AppliedPartner[], queued: QueuedPayout[]): TodoSection | null {
  const lines: TodoLine[] = [];
  if (applied.length) {
    const who = applied.slice(0, 3).map((p) => `${p.customers?.organization || p.customers?.full_name || p.code} (${shortDate(p.created_at)})`).join(" · ");
    lines.push({
      key: "applied", icon: "partners", tone: "slate", title: `${plural(applied.length, "partner application")} waiting`,
      detail: applied.length > 3 ? `${who} · and ${applied.length - 3} more` : who, action: { label: "Review", href: "/admin/partners" },
    });
  }
  if (queued.length) {
    const [p] = queued;
    const method = p.method ?? p.partners?.payout_method ?? null;
    const first = `${dateLabel(p.run_date)} run · ${p.partners?.code ?? "partner"} · ${usd(p.cash_cents)}${method ? ` by ${METHOD[method] ?? method}` : ""}`;
    lines.push({
      key: "payouts", icon: "payouts", tone: "slate", title: `${plural(queued.length, "payout")} queued, not paid yet`,
      detail: queued.length > 1 ? `${first} · and ${queued.length - 1} more` : first, action: { label: "Payouts", href: "/admin/payouts" },
    });
  }
  return build({ key: "partners", title: "Partners", icon: "partners", n: applied.length + queued.length, link: null }, lines);
}

// ---------- 7. inquiries (until the Inquiries module, Part 7) ----------
export type InquiryPreview = { id: string; kind: "wholesale" | "affiliate"; name: string; organization: string | null; message: string; created_at: string };
const KIND: Record<InquiryPreview["kind"], string> = { wholesale: "Wholesale", affiliate: "Affiliate" };
export function inquiriesSection(i: { count: number; latest: InquiryPreview[] }, nowMs: number): TodoSection | null {
  const lines = i.latest.map((q): TodoLine => ({
    key: q.id, icon: "inbox", tone: "mut", title: `${KIND[q.kind]} · ${q.organization || q.name}`,
    detail: `"${excerpt(q.message)}" · ${whenText(q.created_at, nowMs)}`,
  }));
  return build({ key: "inquiries", title: "Inquiries", icon: "inbox", n: i.count, link: null, seenUpTo: i.latest[0]?.created_at }, lines, Math.max(0, i.count - lines.length));
}
