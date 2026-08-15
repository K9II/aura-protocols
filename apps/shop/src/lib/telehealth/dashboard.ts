import type { TelehealthEvent } from "./types";

type SubStat = { leads: number; orders: number; commission: number };
export type DashboardSummary = {
  leads: number;
  enriched: number;
  orders: number;
  commission: number;
  bySub: Record<string, SubStat>;
};

function sub(bySub: Record<string, SubStat>, id: string): SubStat {
  return (bySub[id] ??= { leads: 0, orders: 0, commission: 0 });
}

export function aggregateEvents(events: TelehealthEvent[]): DashboardSummary {
  const s: DashboardSummary = { leads: 0, enriched: 0, orders: 0, commission: 0, bySub: {} };
  for (const e of events) {
    const p = e.payload as { data?: { lead?: { subId?: string }; order?: { amount?: number; commission?: number; subAccount?: string } } };
    if (e.event === "lead.created") { s.leads++; if (p.data?.lead?.subId) sub(s.bySub, p.data.lead.subId).leads++; }
    else if (e.event === "lead.enriched") { s.enriched++; }
    else if (e.event === "order.created") {
      s.orders++;
      const c = p.data?.order?.commission ?? 0;
      s.commission += c;
      const id = p.data?.order?.subAccount;
      if (id) { const st = sub(s.bySub, id); st.orders++; st.commission += c; }
    }
  }
  return s;
}
