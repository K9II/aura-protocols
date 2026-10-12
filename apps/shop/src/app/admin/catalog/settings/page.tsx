import type { Metadata } from "next";
import { requirePermission } from "@/lib/dal";
import { can } from "@/lib/staff/roles";
import { allPublicCertRows, coaSettings, listLabs } from "@/lib/coa/data";
import { COA_DEFAULTS, visibleCerts, type CoaSettings } from "@/lib/coa/visibility";
import { NOT_RECORDED_LAB } from "@/lib/coa/rules";
import { setCoaSettingAction, setLabActiveAction } from "@/app/admin/catalog/settings/actions";
import { Crumbs, Icon } from "@/components/admin/ui";
import LabDialog from "@/components/admin/catalog/LabDialog";

export const metadata: Metadata = { title: "COA settings", robots: { index: false, follow: false } };

function Switch({ setting, label, hint, on, editable }: { setting: keyof CoaSettings; label: string; hint: React.ReactNode; on: boolean; editable: boolean }) {
  const labelId = `coa-sw-${setting}`;
  return (
    <div className="a-toggle">
      <form action={setCoaSettingAction}>
        <input type="hidden" name="key" value={setting} />
        <input type="hidden" name="on" value={on ? "false" : "true"} />
        <button type="submit" role="switch" aria-checked={on} aria-labelledby={labelId} className={`a-sw${on ? " on" : ""}`} disabled={!editable} />
      </form>
      <div><b className="a-toggle-l" id={labelId}>{label}</b><small>{hint}</small></div>
    </div>
  );
}

export default async function CoaSettingsPage() {
  const staff = await requirePermission("catalog.view");
  const editable = can(staff, "catalog.edit");
  const [settings, labs, allCerts] = await Promise.all([coaSettings(), listLabs(), allPublicCertRows()]);
  const hiddenNow = allCerts.length - visibleCerts(allCerts, COA_DEFAULTS).length;

  return (
    <div className="a-page narrow">
      <Crumbs items={[{ label: "Catalog & lots", href: "/admin/catalog" }, { label: "COA settings" }]} />
      <div className="a-ph"><div><h1>COA settings</h1><p>What customers see on the COA lookup and product pages. Every certificate is always kept here.</p></div></div>

      <section className="a-fsec">
        <div className="a-fsec-h"><h3>What customers see</h3><span>Store-wide · saved as you switch</span></div>
        <div className="a-fsec-b" style={{ display: "grid", gap: 16 }}>
          <Switch setting="showAll" label="Show every certificate" on={settings.showAll} editable={editable} hint={
            <>Off: customers see passing certificates only — the latest of each kind for each lot. On: failed certificates and re-tests show too, marked <b style={{ display: "inline", fontWeight: 600 }}>Failed</b> with your note. {hiddenNow} certificate{hiddenNow === 1 ? "" : "s"} {hiddenNow === 1 ? "is" : "are"} hidden by this right now.</>
          } />
          <Switch setting="showMeasured" label="Show measured amount" on={settings.showMeasured} editable={editable} hint={
            <>Shows the lab&apos;s measured mg next to the label strength, e.g. &quot;10.42 mg · 104% of label&quot;.</>
          } />
        </div>
      </section>

      <section className="a-fsec">
        <div className="a-fsec-h"><h3>Labs</h3><span>Pick one on every certificate</span>{editable && <LabDialog />}</div>
        <div className="a-fsec-b">
          <table className="a-t" style={{ border: 0 }}>
            <thead><tr><th>Lab</th><th>Verify link</th><th>ISO/IEC 17025</th><th className="num">Certificates</th><th></th></tr></thead>
            <tbody>
              {labs.map((lab) => {
                // The placeholder holding migrated old test-lot certificates:
                // never pickable, so it gets no verify link and no actions.
                if (lab.name === NOT_RECORDED_LAB) {
                  return (
                    <tr key={lab.id} className="a-old">
                      <td><b>{lab.name}</b><div className="muted">Old test lots · inactive</div></td>
                      <td className="muted">—</td>
                      <td><span className="a-chip c-draft">No</span></td>
                      <td className="num">{lab.certificates}</td>
                      <td></td>
                    </tr>
                  );
                }
                const sub = [lab.city, lab.active ? null : "inactive"].filter(Boolean).join(" · ");
                return (
                  <tr key={lab.id} className={lab.active ? undefined : "a-old"}>
                    <td><b>{lab.name}</b><div className="muted">{sub || "—"}</div></td>
                    <td className={lab.verify_url_template ? "a-mono" : "muted"} style={{ fontSize: 11.5 }}>
                      {lab.verify_url_template ? lab.verify_url_template.replace(/^https:\/\//, "") : "No verify link"}
                      {lab.verify_hint && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{lab.verify_hint}</div>}
                    </td>
                    <td><span className={`a-chip ${lab.iso17025 ? "c-live" : "c-draft"}`}>{lab.iso17025 ? "Yes" : "No"}</span></td>
                    <td className="num">{lab.certificates}</td>
                    <td className="num">
                      {editable && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <LabDialog lab={lab} />
                          <form action={setLabActiveAction}>
                            <input type="hidden" name="labId" value={lab.id} />
                            <input type="hidden" name="active" value={lab.active ? "false" : "true"} />
                            <button type="submit" className="a-btn sm">{lab.active ? "Deactivate" : "Activate"}</button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="a-callout info" style={{ marginTop: 12 }}><Icon name="info" /><div>
            ISO/IEC 17025 = the lab holds the accreditation. Certificates from these labs say &quot;Tested by an ISO/IEC 17025-accredited US lab&quot; — never that a certificate or result is accredited. The verify link must contain {"{report}"}; it&apos;s replaced with each certificate&apos;s report number.
          </div></div>
        </div>
      </section>
    </div>
  );
}
