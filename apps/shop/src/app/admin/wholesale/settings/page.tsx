import type { Metadata } from "next";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { currentMs } from "@/lib/clock";
import { dateLabel, localDate } from "@/lib/today/time";
import { getWholesaleSettings } from "@/lib/wholesale/data";
import { CUTOFF_ANCHOR, cutoffFor } from "@/lib/wholesale/rules";
import { Crumbs } from "@/components/admin/ui";
import SettingsForm from "@/components/admin/wholesale/SettingsForm";

export const metadata: Metadata = { title: "Wholesale settings", robots: { index: false, follow: false } };

// Owner edits; the Assistant sees the values (mock a6).
export default async function WholesaleSettingsPage() {
  const staff = await requirePermission("wholesale.view");
  const s = await getWholesaleSettings();
  const auto = cutoffFor(localDate(currentMs()), { runDays: s.runDays, override: null });
  const tiers = s.tiers.map((t, i) => `${t.minKits}${s.tiers[i + 1] ? `–${s.tiers[i + 1].minKits - 1}` : "+"} kits ${t.pct}%`).join(" · ");
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Wholesale", href: "/admin/wholesale" }, { label: "Settings" }]} />
      <div className="a-ph"><div><h1>Wholesale settings</h1><p>Changes apply to new orders. Orders already placed keep their prices and dates. Runs close every {s.runDays} days counted from Monday {dateLabel(CUTOFF_ANCHOR)}, unless you set the next date.</p></div></div>
      {can(staff, "wholesale.manage") ? <SettingsForm s={s} autoCutoffLabel={dateLabel(auto)} /> : (
        <div className="a-card" style={{ maxWidth: 720 }}><div className="a-card-b"><dl className="a-facts2">
          <dt>Ordering</dt><dd>{s.open ? "Open" : "Off — inquiry form only"}</dd>
          <dt>Minimum</dt><dd>{s.minKits} kits</dd><dt>Tiers</dt><dd>{tiers}</dd>
          <dt>Deposit</dt><dd>{s.depositPct}%</dd><dt>Balance due within</dt><dd>{s.balanceDays} days</dd>
          <dt>Runs</dt><dd>every {s.runDays} days · next order-by {dateLabel(s.nextCutoffOverride ?? auto)}</dd><dt>Order-by → ships</dt><dd>{s.leadDays} days</dd>
        </dl></div></div>
      )}
    </div>
  );
}
