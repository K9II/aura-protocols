import "server-only";
import { codeStatsById, listCodes } from "@/lib/discounts/data";
import { codeStatus, customerSummary, describeRule, termsFromRow } from "@/lib/discounts/rules";
import { shortDate } from "@/lib/discounts/time";
import type { RenderCode } from "@/lib/email/campaigns/render";

// Codes a promotion may link: single codes (not batch codes), not ended or
// used up — unless it's the campaign's own current code, kept so the editor
// can still show it.
export async function promotionCodes(keepId: string | null = null): Promise<{ options: Array<{ id: string; label: string }>; render: Record<string, RenderCode> }> {
  const [codes, stats] = await Promise.all([listCodes(), codeStatsById()]);
  const options: Array<{ id: string; label: string }> = [];
  const render: Record<string, RenderCode> = {};
  for (const r of codes) {
    if (r.batch_id) continue;
    const s = stats.get(r.id);
    const status = codeStatus(r, (s?.uses ?? 0) + (s?.held ?? 0));
    if ((status === "ended" || status === "used_up") && r.id !== keepId) continue;
    const dates = r.starts_at || r.ends_at ? ` · ${r.starts_at ? shortDate(r.starts_at) : "now"} – ${r.ends_at ? shortDate(r.ends_at) : "no end"}` : "";
    options.push({ id: r.id, label: `${r.code} · ${describeRule(termsFromRow(r))}${dates}${r.max_uses ? ` · ${r.max_uses} uses` : ""}` });
    render[r.id] = { code: r.code, summary: customerSummary(termsFromRow(r)), endsAt: r.ends_at, oncePerCustomer: r.once_per_customer, minOrderCents: r.min_order_cents };
  }
  return { options, render };
}
