// The Numbers card on Today: figures, the change vs the period before, the
// bar chart and top strengths. Pure.
import { usd } from "@/lib/html";
import { axisLabels, fillBuckets, PERIOD_LABEL, VS_LABEL, type Period, type PeriodRanges } from "@/lib/today/periods";
import { dateLabel, hourLabel } from "@/lib/today/time";

// One period from admin_sales_summary (today.sql), in cents.
export type SalesSummary = {
  salesCents: number; orders: number; chargedCents: number; shippingCents: number; taxCents: number;
  refundedCents: number; refundedOrders: number; firstTimeOrders: number; repeatOrders: number; newAccounts: number;
  buckets: Array<{ at: string; cents: number }>;
  top: Array<{ name: string; strength: string; vials: number; cents: number }>;
};

export type Change = { dir: "up" | "dn" | "flat"; text: string } | null;

// Percent change; null when there's nothing before to compare with.
export function pctChange(cur: number, prior: number): Change {
  if (prior <= 0) return null;
  const p = Math.round(((cur - prior) / prior) * 100);
  if (p === 0) return { dir: "flat", text: "no change" };
  return { dir: p > 0 ? "up" : "dn", text: `${p > 0 ? "▲" : "▼"} ${Math.abs(p)}%` };
}

// Small counts (Today) read better as "▲ 2" than as a percent.
export function countChange(cur: number, prior: number): Change {
  const d = cur - prior;
  if (d === 0) return { dir: "flat", text: "no change" };
  return { dir: d > 0 ? "up" : "dn", text: `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toLocaleString("en-US")}` };
}

export type Mini = { label: string; short: string; value: string; change: Change; suffix?: string; note?: string };
export type Bar = { key: string; h: number; zero: boolean; now: boolean; tip: string };
export type NumbersView = {
  vs: string;
  sales: string; salesChange: Change; charged: string; shipping: string; tax: string; refund: string | null;
  minis: Mini[];
  chart: { title: string; range: string; bars: Bar[]; axis: string[] };
  topTitle: string;
  top: Array<{ rank: number; label: string; vials: string; sales: string; pct: number }>;
};

const n = (x: number) => x.toLocaleString("en-US");
const plural = (x: number, word: string) => `${n(x)} ${word}${x === 1 ? "" : "s"}`;
const avg = (s: SalesSummary) => (s.orders ? Math.round(s.salesCents / s.orders) : 0);

export function numbersView(p: Period, r: PeriodRanges, cur: SalesSummary, prior: SalesSummary, nowMs: number): NumbersView {
  const count = p === "today" ? countChange : pctChange;
  const cents = fillBuckets(r.keys, cur.buckets);
  const max = Math.max(0, ...cents);
  const day = (k: string) => k.slice(0, 10);
  const topMax = cur.top[0]?.cents ?? 0;
  return {
    vs: VS_LABEL[p],
    sales: usd(cur.salesCents),
    salesChange: pctChange(cur.salesCents, prior.salesCents),
    charged: usd(cur.chargedCents), shipping: usd(cur.shippingCents), tax: usd(cur.taxCents),
    refund: cur.refundedOrders > 0 ? `refunded ${usd(cur.refundedCents)} (${plural(cur.refundedOrders, "order")})` : null,
    minis: [
      { label: "Orders", short: "Orders", value: n(cur.orders), change: count(cur.orders, prior.orders), suffix: p === "today" ? "vs yesterday" : undefined },
      { label: "Average order", short: "Avg order", value: usd(avg(cur)), change: pctChange(avg(cur), avg(prior)) },
      { label: "New accounts", short: "New accounts", value: n(cur.newAccounts), change: count(cur.newAccounts, prior.newAccounts) },
      {
        label: "First-time · repeat", short: "First · repeat", value: `${n(cur.firstTimeOrders)} · ${n(cur.repeatOrders)}`, change: null,
        note: p === "today" || cur.orders === 0 ? "orders" : `${Math.round((cur.repeatOrders / cur.orders) * 100)}% repeat`,
      },
    ],
    chart: {
      title: r.bucket === "hour" ? "Sales by hour" : "Sales by day",
      range: r.bucket === "hour" ? `through ${hourLabel(nowMs)}` : `${dateLabel(day(r.keys[0]))} – ${dateLabel(day(r.keys[r.keys.length - 1]))}`,
      bars: cents.map((c, i) => ({
        key: r.keys[i], zero: c === 0, now: i === r.nowIndex,
        h: c > 0 && max > 0 ? Math.max(2, Math.round((c / max) * 100)) : 1,
        tip: `${r.bucket === "hour" ? r.keys[i].slice(11) : dateLabel(day(r.keys[i]))} · ${usd(c)}`,
      })),
      axis: axisLabels(p, r.keys),
    },
    topTitle: `Top strengths · ${p === "today" ? "today" : PERIOD_LABEL[p].toLowerCase()}`,
    top: cur.top.map((t, i) => ({
      rank: i + 1, label: `${t.name} · ${t.strength}`, vials: plural(t.vials, "vial"), sales: usd(t.cents),
      pct: topMax > 0 ? Math.round((t.cents / topMax) * 100) : 0,
    })),
  };
}
