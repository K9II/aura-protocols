// Shared command-center bits, ported from the approved mocks (2026-10-04).
import Link from "next/link";
import type { CodeStatus } from "@/lib/discounts/rules";
import { STATUS_LABEL } from "@/lib/discounts/rules";

const PATHS = {
  search: <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></>,
  today: <path d="M2 8h3l2-5 2 10 2-5h3" />,
  orders: <><path d="M2.5 4.5 8 2l5.5 2.5v7L8 14l-5.5-2.5z" /><path d="M2.5 4.5 8 7l5.5-2.5M8 7v7" /></>,
  customers: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 14c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5" /></>,
  discounts: <><path d="M2 2h6l6 6-6 6-6-6z" /><circle cx="5.5" cy="5.5" r="1" /></>,
  catalog: <><path d="M6 2h4M7 2v4L3.5 13h9L9 6V2" /><path d="M5 10h6" /></>,
  mail: <><path d="M2 3.5h12v9H2z" /><path d="m2 4 6 5 6-5" /></>,
  partners: <><circle cx="5" cy="6" r="2" /><circle cx="11" cy="6" r="2" /><path d="M1.5 13c.4-2 1.7-3 3.5-3s3.1 1 3.5 3M7.5 13c.4-2 1.7-3 3.5-3s3.1 1 3.5 3" /></>,
  payouts: <><path d="M1.5 4h13v8h-13z" /><path d="M1.5 7h13" /><path d="M4 10h2" /></>,
  inbox: <><path d="M2 9V3h12v6" /><path d="M2 9h3.5l1 2h3l1-2H14v4H2z" /></>,
  gear: <><circle cx="8" cy="8" r="2" /><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" /></>,
  ext: <path d="M9 2.5h4.5V7M13.5 2.5 7 9M11 9.5V13.5H2.5V5H6.5" />,
  plus: <path d="M8 3v10M3 8h10" />,
  layers: <><path d="M8 2 14 5 8 8 2 5z" /><path d="m2 8 6 3 6-3M2 11l6 3 6-3" /></>,
  download: <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />,
  copy: <><path d="M5 5h8.5v8.5H5z" /><path d="M11 5V2.5H2.5V11H5" /></>,
  warn: <><path d="M8 2 14.5 13.5h-13z" /><path d="M8 6.5v3.5M8 11.8v.01" /></>,
  check: <path d="m3 8.5 3 3 7-7" />,
  lock: <><path d="M3.5 7.5h9v6.5h-9z" /><path d="M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5" /></>,
  pause: <path d="M5.5 3v10M10.5 3v10" />,
  play: <path d="M5 3l8 5-8 5z" />,
  stop: <path d="M3.5 3.5h9v9h-9z" />,
  edit: <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5v-3z" />,
  menu: <path d="M2 4h12M2 8h12M2 12h12" />,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7v4.5M8 4.8v.01" /></>,
  reset: <><path d="M3 3v4h4" /><path d="M3.5 7A5 5 0 1 1 4 11" /></>,
  book: <path d="M2.5 3h4a1.5 1.5 0 0 1 1.5 1.5V14a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3h-4A1.5 1.5 0 0 0 8 4.5V14a1.5 1.5 0 0 1 1.5-1.5h4z" />,
  arrow: <path d="M3 8h10M9 4l4 4-4 4" />,
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return <svg className="a-i" viewBox="0 0 16 16" aria-hidden>{PATHS[name]}</svg>;
}

const CHIP_CLASS: Record<CodeStatus, string> = { active: "active", scheduled: "sched", paused: "paused", ended: "ended", used_up: "usedup" };
export function StatusChip({ status }: { status: CodeStatus }) {
  return <span className={`a-chip ${CHIP_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}
export function Chip({ tone, children }: { tone: "active" | "sched" | "paused" | "ended" | "usedup" | "held" | "released" | "refund"; children: React.ReactNode }) {
  return <span className={`a-chip ${tone}`}>{children}</span>;
}

export function Meter({ used, max }: { used: number; max: number | null }) {
  if (max == null) return <div className="a-meter">{used} · no limit</div>;
  const pct = Math.min(100, Math.round((used / max) * 100));
  return <div className="a-meter"><span className={`a-bar${pct >= 100 ? " full" : ""}`}><i style={{ width: `${pct}%` }} /></span>{used} / {max}</div>;
}

export function Kpis({ items }: { items: Array<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> }) {
  return (
    <div className="a-kpis" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((k) => <div key={k.label} className="a-kpi"><div className="l">{k.label}</div><div className="v">{k.value}</div>{k.sub && <div className="d">{k.sub}</div>}</div>)}
    </div>
  );
}

export function Tabs({ items }: { items: Array<{ href: string; label: string; n?: number; on: boolean }> }) {
  return (
    <div className="a-tabs">
      {items.map((t) => <Link key={t.href} href={t.href} className={t.on ? "on" : undefined} aria-current={t.on ? "page" : undefined}>{t.label}{t.n != null && <span className="n">{t.n}</span>}</Link>)}
    </div>
  );
}

export function Crumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="a-crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i}>{i > 0 && <span className="sep">/</span>}{c.href ? <Link href={c.href}>{c.label}</Link> : <b>{c.label}</b>}</span>
      ))}
    </nav>
  );
}

export const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
