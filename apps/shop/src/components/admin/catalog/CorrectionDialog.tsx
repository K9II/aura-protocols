"use client";
// A correction note on a locked (live-lot) certificate: the certificate
// itself can't change, but a note can say what was wrong and what's right.
import { useActionState, useEffect, useRef } from "react";
import { correctCertificateAction } from "@/app/admin/catalog/actions";
import { CORRECTION_MAX } from "@/lib/coa/rules";

export default function CorrectionDialog({ certId, report }: { certId: string; report: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(correctCertificateAction, null);
  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <button type="button" className="a-linkbtn" onClick={() => ref.current?.showModal()}>Correction note</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`corr-${certId}`}>
        <form action={action}>
          <input type="hidden" name="certId" value={certId} />
          <div className="a-modal-h"><h2 id={`corr-${certId}`}>Correction note · {report}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-fld"><label htmlFor={`corr-note-${certId}`}>What was wrong and what&apos;s right</label>
              <textarea id={`corr-note-${certId}`} name="correction" className="a-textarea" maxLength={CORRECTION_MAX} required />
              {fe.correction && <div className="a-err" role="alert">{fe.correction}</div>}</div>
            <p className="muted" style={{ fontSize: 12 }}>Customers see it on the certificate. The certificate itself can&apos;t change.</p>
          </div>
          <div className="a-modal-f"><span />
            <div className="r">
              <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending}>Add correction</button>
            </div>
          </div>
        </form>
      </dialog>
      {state?.ok && <span className="a-ok" role="status">{state.ok}</span>}
    </>
  );
}
