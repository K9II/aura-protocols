import "server-only";
import { cache } from "react";
import { catalogContent } from "@/data/catalog";
import { currentMs } from "@/lib/clock";
import { listOrdersForOwner } from "@/lib/orders";
import { fetchAdminOps } from "@/lib/catalog-ops/data";
import { adminRows } from "@/lib/catalog-ops/rules";
import { sendingCampaign, waitingLots } from "@/lib/email/campaigns/data";
import { listRuns } from "@/lib/email/admin-data";
import { emailOverview } from "@/lib/email/stats";
import { listPartners } from "@/lib/partners/data";
import { listQueuedPayouts } from "@/lib/partners/ledger";
import { listOpenAlerts } from "@/lib/today/alerts";
import { salesSummary } from "@/lib/today/data";
import { openInquiryTodos } from "@/lib/inquiries/data";
import { openDisputeTodos } from "@/lib/disputes/data";
import {
  alertsSection, disputesSection, emailSection, inquiriesSection, lotsSection, navCount, ordersSection, partnersSection, stockSection,
  SLOT_INFO, SLOT_KEYS, type Slot, type SlotKey, type TodoSection,
  wholesaleSection,
} from "@/lib/today/todos";
import { wholesaleTodos } from "@/lib/wholesale/runs-data";
import { numbersView, type NumbersView } from "@/lib/today/numbers";
import { periodRanges, type Period } from "@/lib/today/periods";

const shown = (xs: Array<TodoSection | null>): TodoSection[] => xs.filter((x): x is TodoSection => !!x);

// Each slot is its own async function, so even a synchronous throw while a
// query is being built becomes that slot's rejection — never an orphaned
// promise and never another section's failure. They reuse each module's own
// data functions (which throw on a DB error).
const LOADERS: Record<SlotKey, (nowMs: number) => Promise<TodoSection[]>> = {
  alerts: async (nowMs) => shown([alertsSection(await listOpenAlerts(), nowMs)]),
  disputes: async (nowMs) => {
    const { disputes, warnings } = await openDisputeTodos();
    return shown([disputesSection(disputes, warnings, nowMs)]);
  },
  orders: async (nowMs) => {
    const orders = await listOrdersForOwner("paid", { oldestFirst: true });
    return shown([ordersSection(orders.map((o) => ({
      order_number: o.order_number, ship_name: o.ship_name, total_cents: o.total_cents, paid_at: o.paid_at, created_at: o.created_at,
      items: (o.order_items ?? []).reduce((s, i) => s + i.quantity, 0),
    })), nowMs)]);
  },
  wholesale: async (nowMs) => shown([wholesaleSection(await wholesaleTodos(nowMs))]),
  catalog: async () => {
    const [ops, waiting] = await Promise.all([fetchAdminOps(), waitingLots()]);
    const names = new Map(catalogContent.map((c) => [c.slug, c.name]));
    const strengths = new Map(ops.variants.map((v) => [`${v.slug}:${v.variant_id}`, v.strength]));
    const label = (slug: string, variantId: string) => `${names.get(slug) ?? slug} ${strengths.get(`${slug}:${variantId}`) ?? variantId}`;
    return shown([stockSection(adminRows(catalogContent, ops)), lotsSection(ops.lots, label, waiting)]);
  },
  email: async (nowMs) => {
    const [runs, overview, sending] = await Promise.all([listRuns(1), emailOverview(), sendingCampaign()]);
    return shown([emailSection({ lastRun: runs[0] ?? null, overview, sending }, nowMs)]);
  },
  partners: async () => {
    const [applied, queued] = await Promise.all([listPartners("applied"), listQueuedPayouts()]);
    return shown([partnersSection(applied, queued)]);
  },
  inquiries: async (nowMs) => shown([inquiriesSection(await openInquiryTodos(), nowMs)]),
};

// Every section loads on its own (allSettled): a failure is logged and shows
// "Couldn't load" in that section only — never zeros. React cache: the admin
// layout (nav count) and the Today page share one load per request.
export const loadTodos = cache(async (): Promise<Slot[]> => {
  const nowMs = currentMs();
  const results = await Promise.allSettled(SLOT_KEYS.map((k) => LOADERS[k](nowMs)));
  return SLOT_KEYS.map((key, i) => {
    const r = results[i];
    if (r.status === "rejected") console.error(`today: ${key} section failed:`, r.reason);
    return { key, ...SLOT_INFO[key], sections: r.status === "fulfilled" ? r.value : null };
  });
});

// The Today nav badge. Cosmetic: a failure logs and shows no badge rather
// than breaking every admin page (e.g. before today.sql is applied).
export async function todayNavCount(): Promise<number> {
  try {
    return navCount((await loadTodos()).flatMap((s) => s.sections ?? []));
  } catch (err) {
    console.error("today nav count failed:", err);
    return 0;
  }
}

export type NumbersResult = { ok: true; view: NumbersView } | { ok: false };
export async function loadNumbers(p: Period): Promise<NumbersResult> {
  const nowMs = currentMs();
  const r = periodRanges(p, nowMs);
  try {
    const [cur, prior] = await Promise.all([salesSummary(r.cur, r.bucket), salesSummary(r.prior, r.bucket)]);
    return { ok: true, view: numbersView(p, r, cur, prior, nowMs) };
  } catch (err) {
    console.error("today: numbers failed:", err);
    return { ok: false };
  }
}
