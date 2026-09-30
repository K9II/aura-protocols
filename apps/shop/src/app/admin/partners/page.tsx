import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/dal";
import { countPartners, listPartners, type PartnerStatus } from "@/lib/partners/data";
import { payableByPartner } from "@/lib/partners/ledger";
import { AUDIENCE_SIZES, PARTNER_TYPES, PUBLISH_CHANNELS } from "@/lib/partners/codes";
import { usd } from "@/lib/html";
import { setPartnerStatusAction } from "@/app/admin/partners/actions";

export const metadata: Metadata = { title: "Partners", robots: { index: false, follow: false } };

const TABS: Array<[PartnerStatus, string]> = [["applied", "Applications"], ["approved", "Active"], ["suspended", "Suspended"], ["declined", "Declined"]];
const th: React.CSSProperties = { textAlign: "left", padding: "0 18px 8px 0" };
const td: React.CSSProperties = { padding: "13px 18px 13px 0", verticalAlign: "top" };
const primary: React.CSSProperties = { padding: "8px 14px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: 0 };
const outline: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };
const typeLabel = (id: string) => PARTNER_TYPES.find((t) => t.id === id)?.label ?? id;
const sizeLabel = (id: string) => AUDIENCE_SIZES.find((a) => a.id === id)?.label ?? id;
const PREF = { cash: "Cash", credit: "Credit", split: "Split" } as const;

function StatusButton({ id, to, label, main }: { id: string; to: string; label: string; main?: boolean }) {
  return (
    <form action={setPartnerStatusAction}>
      <input type="hidden" name="partnerId" value={id} /><input type="hidden" name="to" value={to} />
      <button type="submit" className={main ? "p-btn-primary" : undefined} style={main ? primary : outline}>{label}</button>
    </form>
  );
}

export default async function AdminPartnersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireOwner();
  const { tab: raw } = await searchParams;
  const tab = (TABS.find(([s]) => s === raw)?.[0] ?? "applied") as PartnerStatus;
  const [counts, partners, payable] = await Promise.all([countPartners(), listPartners(tab), tab === "approved" ? payableByPartner() : Promise.resolve({} as Record<string, number>)]);

  return (
    <div className="pharmacopoeia">
      <div className="p-container py-14">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Owner · visible only to your account</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 48 }}>Partners.</h1>
        <nav aria-label="Partner status" style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="mb-6">
          {TABS.map(([s, label]) => (
            <Link key={s} href={`/admin/partners?tab=${s}`} aria-current={s === tab ? "page" : undefined}
              style={s === tab ? { background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink)", padding: "7px 12px", fontSize: 12.5 } : { border: "1px solid var(--line)", padding: "7px 12px", fontSize: 12.5 }}>
              {label} · {counts[s]}
            </Link>
          ))}
          <Link href="/admin/payouts" style={{ border: "1px solid var(--line)", padding: "7px 12px", fontSize: 12.5 }}>Payouts →</Link>
        </nav>
        {partners.length === 0 ? <p className="text-[color:var(--ink-soft)]">Nothing here.</p> : tab === "applied" ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className="s-micro text-[color:var(--ink-soft)]"><th style={th}>Applicant</th><th style={th}>Type</th><th style={th}>Publishes at</th><th style={th}>Audience</th><th style={th}>Code</th><th /></tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}><span className="p-serif text-[17px]">{p.customers?.full_name ?? "—"}{p.customers?.organization ? ` · ${p.customers.organization}` : ""}</span>
                      <details className="text-[12.5px] mt-1"><summary className="underline cursor-pointer text-[color:var(--ink-soft)]">View application</summary>
                        <p className="mt-1" style={{ whiteSpace: "pre-wrap" }}>{p.application.promotion}</p></details></td>
                    <td style={td} className="text-sm">{typeLabel(p.partner_type)}</td>
                    <td style={td} className="text-sm"><span style={{ overflowWrap: "anywhere" }}>
                      {[...PUBLISH_CHANNELS.filter((c) => p.application.channels?.[c.id]).map((c) => `${c.label}: ${p.application.channels[c.id]}`),
                        ...(p.application.other ? [`Other: ${p.application.other}`] : [])].map((l) => <span key={l} className="block">{l}</span>)}
                    </span></td>
                    <td style={td} className="text-sm">{sizeLabel(p.application.audienceSize)}</td>
                    <td style={td}><span className="s-micro">{p.code}</span></td>
                    <td style={{ padding: "13px 0", textAlign: "right", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <StatusButton id={p.id} to="approved" label="Approve" main /><StatusButton id={p.id} to="declined" label="Decline" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">Approving activates the code and emails the partner their link and the rules. Declining sends a short email.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr className="s-micro text-[color:var(--ink-soft)]"><th style={th}>Code</th><th style={th}>Type</th><th style={{ ...th, textAlign: "right" }}>Tier</th><th style={{ ...th, textAlign: "right" }}>Lifetime sales</th><th style={{ ...th, textAlign: "right" }}>Payable</th><th style={th}>Paid as</th><th style={th}>Tax form</th><th /></tr></thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={td}><span className="p-serif text-[17px]">{p.code}</span></td>
                    <td style={td} className="text-sm">{typeLabel(p.partner_type)}</td>
                    <td style={{ ...td, textAlign: "right" }} className="text-sm">{p.tier_pct}%</td>
                    <td style={{ ...td, textAlign: "right" }} className="text-sm">{usd(p.lifetime_cents)}</td>
                    <td style={{ ...td, textAlign: "right" }} className="text-sm">{usd(payable[p.id] ?? 0)}</td>
                    <td style={td} className="text-sm">{PREF[p.payout_pref]}{p.payout_pref === "split" ? ` ${p.split_cash_pct}/${100 - p.split_cash_pct}` : ""}{p.payout_method ? ` · ${p.payout_method.toUpperCase()}` : ""}</td>
                    <td style={td}><span className="s-micro" style={{ color: p.w9_checked_at ? "#2F5D3A" : "var(--specimen)" }}>W-9 {p.w9_checked_at ? "Checked" : p.w9_path ? "Uploaded" : "Not uploaded"}</span></td>
                    <td style={{ padding: "13px 0", textAlign: "right", verticalAlign: "top" }}>
                      {p.status === "approved" && <StatusButton id={p.id} to="suspended" label="Suspend" />}
                      {p.status === "suspended" && <StatusButton id={p.id} to="approved" label="Reinstate" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">Suspending disables the code and link at once and forfeits unpaid commission. Store credit already issued stays spendable.</p>
          </div>
        )}
      </div>
    </div>
  );
}
