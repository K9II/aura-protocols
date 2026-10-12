import Link from "next/link";
import { TEST_KEYS, TEST_LABEL } from "@/lib/coa/rules";
import type { CertRow, CoaSettings } from "@/lib/coa/visibility";
import { certKind, visibleCerts } from "@/lib/coa/visibility";
import { coaPublicUrl } from "@/lib/catalog-live";
import { certVerifyUrl } from "@/lib/coa/rules";
import { deleteCertificateAction } from "@/app/admin/catalog/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import CertificateDialog from "@/components/admin/catalog/CertificateDialog";
import CorrectionDialog from "@/components/admin/catalog/CorrectionDialog";
import type { LabOption } from "@/components/admin/catalog/CertificateFields";

const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export type CertListProps = {
  certs: CertRow[]; lot: { id: string; lot_number: string; status: string }; labs: LabOption[]; settings: CoaSettings;
  canEdit: boolean; title: string; strength: string;
};

// The <li>s themselves (mock a1): result chip, lab, report, date, purity,
// tests, file + verify links, and whether it's on the store. Factored out of
// CertList so the admin phone card (a-plot) can reuse the same rows inside
// its own <ul> instead of the desktop <tr>/<td colSpan> wrapper.
export function CertListItems({ certs, lot, labs, settings, canEdit, title, strength }: CertListProps) {
  const onStore = new Set(visibleCerts(certs, settings).map((c) => c.id));
  const draft = lot.status === "draft";
  return <>{certs.map((c) => {
    const verify = certVerifyUrl(c.lab.verify_url_template, c.report_number, c.verify_code);
    const hidden = lot.status !== "draft" && !onStore.has(c.id);
    return (
      <li key={c.id} className={c.result === "fail" ? "fail" : undefined}>
        <span className={`a-chip ${c.result === "fail" ? "c-out" : "c-live"}`}>{c.result === "fail" ? "Failed" : "Pass"}</span>
        {c.result === "pass" && TEST_KEYS.some((k) => c[k] === "fail") && <span className="a-chip c-disc" title="A test on this report failed; you set the result to Pass">Test failed</span>}
        <b>{c.lab.name}</b><span className="a-mono">{c.report_number}</span><span className="muted">tested {day(c.tested_on)}</span>
        {c.purity_pct != null && <span>{c.purity_pct}% · {c.method}{c.measured_mg != null ? ` · ${c.measured_mg} mg` : ""}</span>}
        <span className="a-tests">{TEST_KEYS.filter((k) => c[k] !== "not_tested" || k === "endotoxin").map((k) => (
          <i key={k} className={c[k] === "pass" ? "ok" : c[k] === "fail" ? "bad" : undefined}>{c[k] === "not_tested" ? `${TEST_LABEL[k]} not tested` : TEST_LABEL[k]}</i>
        ))}</span>
        <span className="lk">
          <a className="a-coa" href={coaPublicUrl(c.coa_path)} target="_blank" rel="noopener noreferrer">Certificate</a>
          {verify && <a className="a-coa" href={verify} target="_blank" rel="noopener noreferrer">Verify ↗</a>}
          {canEdit && draft && <CertificateDialog lotId={lot.id} lotNumber={lot.lot_number} title={title} strength={strength} labs={labs} lotLive={false}
            cert={{ id: c.id, draft: { labId: c.lab_id, reportNumber: c.report_number, verifyCode: c.verify_code ?? "", testedOn: c.tested_on, purity: c.purity_pct?.toString() ?? "", method: c.method ?? "HPLC+MS",
              measured: c.measured_mg?.toString() ?? "", coaPath: c.coa_path, certNote: c.note ?? "", result: c.result,
              tests: { identity: c.identity, endotoxin: c.endotoxin, sterility: c.sterility, heavy_metals: c.heavy_metals, fentanyl: c.fentanyl } } }} />}
          {canEdit && draft && <form action={deleteCertificateAction}><input type="hidden" name="certId" value={c.id} />
            <ConfirmSubmit className="a-linkbtn" message={`Delete certificate ${c.report_number}?`}>Delete</ConfirmSubmit></form>}
          {canEdit && !draft && <CorrectionDialog certId={c.id} report={c.report_number} />}
        </span>
        {(c.note || c.correction_note || hidden) && <div className="a-certnote">
          {c.note && <><b>Your note · </b>{c.note}</>}
          {c.correction_note && <><b> Correction · </b>{c.correction_note}</>}
          {hidden && <span className="muted"> · Not on the store — {c.result === "fail" ? <Link href="/admin/catalog/settings">Show every certificate</Link> : `a newer ${certKind(c) === "purity" ? "purity" : "report"} replaces it`}{c.result === "fail" ? " is off" : ""}</span>}
        </div>}
      </li>
    );
  })}</>;
}

// Certificate rows under a lot, desktop table (mock a1).
export default function CertList(props: CertListProps) {
  if (!props.certs.length) return null;
  return (
    <tr className="a-certrow"><td colSpan={5}><ul className="a-certs"><CertListItems {...props} /></ul></td></tr>
  );
}
