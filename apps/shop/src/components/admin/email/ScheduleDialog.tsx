"use client";
import { useActionState, useEffect, useRef } from "react";
import { scheduleAction } from "@/app/admin/email/actions";
import { Icon } from "@/components/admin/ui";

export default function ScheduleDialog({ id, defaultLocal, disabled }: { id: string; defaultLocal: string; disabled: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(scheduleAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  return (
    <>
      <button type="button" className="a-btn" disabled={disabled} onClick={() => ref.current?.showModal()}><Icon name="clock" />Schedule…</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`sch-${id}`}>
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <div className="a-modal-h"><h2 id={`sch-${id}`}>Schedule</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-fld"><label htmlFor={`at-${id}`}>Date and time</label>
              <input id={`at-${id}`} name="at" type="datetime-local" step={3600} defaultValue={defaultLocal} className="a-input" required />
              <div className="help">Mountain time (shop time), on the hour.</div>
              {state?.fieldErrors?.at && <div className="a-err" role="alert">{state.fieldErrors.at}</div>}</div>
            <div className="a-callout info"><Icon name="clock" /><span>The hourly email run sends it at that time. The audience is counted then, so new subscribers before then are included. You can unschedule it until it starts.</span></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}><Icon name="clock" />Schedule</button></div></div>
        </form>
      </dialog>
    </>
  );
}
