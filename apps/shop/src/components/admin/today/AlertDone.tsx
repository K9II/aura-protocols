"use client";

import { useActionState, useEffect, useRef } from "react";
import { resolveAlertAction } from "@/app/admin/actions";
import { Icon } from "@/components/admin/ui";
import { ALERT_NOTE_MAX } from "@/lib/today/constants";
import type { AlertLineData } from "@/lib/today/todos";

// The Done button and its dialog. The dialog's form is the only form in the
// row — never nested inside another form.
export default function AlertDone({ alert }: { alert: AlertLineData }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(resolveAlertAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const id = `alert-${alert.id}`;
  return (
    <>
      <button type="button" className="a-btn sm" onClick={() => ref.current?.showModal()}>Done</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={id}>
        <form action={action}>
          <input type="hidden" name="id" value={alert.id} />
          <div className="a-modal-h"><h2 id={id}>Mark this alert done?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <dl className="a-dl">
              <dt>Alert</dt><dd>{alert.title}</dd>
              <dt>Detail</dt><dd className="a-alert-detail">{alert.detail || "—"}</dd>
              <dt>Seen</dt><dd>{alert.count} time{alert.count === 1 ? "" : "s"} · {alert.when}</dd>
            </dl>
            <div className="a-fld">
              <label htmlFor={`${id}-note`}>Note <span className="muted" style={{ fontWeight: 400 }}>· optional, kept with the alert</span></label>
              <textarea id={`${id}-note`} name="note" className="a-textarea" maxLength={ALERT_NOTE_MAX} placeholder="e.g. moved the sold vials to the shipped lot in Catalog" />
            </div>
            <div className="a-callout info"><Icon name="info" /><span>If the same problem happens again, the alert comes back on Today.</span></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}><Icon name="check" />Mark done</button>
          </div></div>
        </form>
      </dialog>
    </>
  );
}
