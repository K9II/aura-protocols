"use client";
// Add / Edit certificate (mock a2). A live lot's certificates are locked —
// the dialog says so and the footer offers no edit after it's added; edit a
// draft lot's certificate on its own row (CertList), or see CorrectionDialog.
import { useActionState, useEffect, useRef, useState } from "react";
import { saveCertificateAction } from "@/app/admin/catalog/actions";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { Icon } from "@/components/admin/ui";
import CertificateFields, { EMPTY_CERT, type CertDraft, type LabOption } from "@/components/admin/catalog/CertificateFields";
import { useLotMessage } from "@/components/admin/catalog/LotRowMessages";

// idPrefix: the phone lot card renders a second copy of this dialog; a
// distinct prefix keeps its element ids (and label targets) unique.
export default function CertificateDialog({ lotId, lotNumber, title, strength, labs, lotLive, cert, idPrefix = "", productNames, canAddLab }: {
  lotId: string; lotNumber: string; title: string; strength: string; labs: LabOption[]; lotLive: boolean;
  cert?: { id: string; draft: CertDraft }; idPrefix?: string; productNames?: string[]; canAddLab?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveCertificateAction, null);
  const [v, setV] = useState<CertDraft>(cert?.draft ?? EMPTY_CERT);
  // Bumped on every successful save so CertificateFields remounts: it only
  // reads its `initial` prop once, so without a fresh key it keeps showing
  // the just-submitted values (e.g. the report number) after the reset above.
  const [formKey, setFormKey] = useState(0);
  const scope = `${idPrefix}${cert ? `edit-${cert.id}` : `add-${lotId}`}`;
  const report = useLotMessage();
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      if (!cert) setV(EMPTY_CERT);
      setFormKey((k) => k + 1);
      report?.(`${state.ok}${state.warning ? ` ${state.warning}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only reacts to a fresh action result
  }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      {cert
        ? <button type="button" className="a-linkbtn" onClick={() => ref.current?.showModal()}>Edit</button>
        : <button type="button" className="a-btn sm" onClick={() => ref.current?.showModal()}><Icon name="plus" />Add certificate</button>}
      {/* No onClose/onCancel/onSubmit/onKeyDown here — the Add lab dialog is
          portalled out of this form, and React bubbles its events through
          this tree, so a handler added here would also fire for Add lab. */}
      <dialog ref={ref} className="a-modal wide" aria-labelledby={`cert-${scope}`}>
        <form action={action}>
          <input type="hidden" name="lotId" value={lotId} />
          {cert && <input type="hidden" name="certId" value={cert.id} />}
          <div className="a-modal-h"><h2 id={`cert-${scope}`}>{cert ? `Edit certificate · ${title}` : `Add a certificate · ${title}`}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <CertificateFields key={formKey} idSuffix={scope} lotNumber={lotNumber} strength={strength} labs={labs} initial={v} fieldErrors={fe} onChange={setV} productNames={productNames} canAddLab={canAddLab} />
            <ul className="a-checks">
              <li className={v.coaPath ? "" : "no"}><Icon name="check" />Certificate attached</li>
              {v.purity.trim() !== "" && <li className={Number(v.purity) >= PURITY_FLOOR_PCT ? "" : "no"}><Icon name="check" />Purity at or above the {PURITY_FLOOR_PCT}% shown on the site</li>}
            </ul>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f">
            <span className="muted" style={{ fontSize: 12 }}>{lotLive ? "This lot is live — once added, the certificate can't be changed, only given a correction note." : "Logged as added by you, now"}</span>
            <div className="r">
              <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending}>{cert ? "Save certificate" : "Add certificate"}</button>
            </div>
          </div>
        </form>
      </dialog>
      {!report && state?.ok && <span className="a-ok" role="status">{state.ok}{state.warning ? ` ${state.warning}` : ""}</span>}
    </>
  );
}
