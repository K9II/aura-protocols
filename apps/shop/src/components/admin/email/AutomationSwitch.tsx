"use client";

import { useActionState, useEffect, useRef } from "react";
import { setAutomationAction } from "@/app/admin/email/actions";
import { Icon } from "@/components/admin/ui";

const RESUME_TEXT = {
  welcome: "Welcome emails continue one file at a time for people still inside their window. Nothing goes out in a burst.",
  cart: "When you turn them back on, reminders that came due while paused are skipped, not sent late.",
} as const;

export default function AutomationSwitch({ automation, label, paused }: { automation: "welcome" | "cart"; label: string; paused: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(setAutomationAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const verb = paused ? `Turn ${label} back on` : `Pause ${label}`;
  return (
    <span className="a-swcell">
      <button type="button" className={`a-sw${paused ? "" : " on"}`} aria-label={verb} onClick={() => ref.current?.showModal()} />
      <span className={`a-chip ${paused ? "paused" : "on"}`}>{paused ? "Paused" : "On"}</span>
      <dialog ref={ref} className="a-modal" aria-labelledby={`sw-${automation}`}>
        <form action={action}>
          <input type="hidden" name="automation" value={automation} />
          <input type="hidden" name="paused" value={paused ? "0" : "1"} />
          <div className="a-modal-h"><h2 id={`sw-${automation}`}>{paused ? `Turn ${label.toLowerCase()} back on?` : `Pause ${label.toLowerCase()}?`}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <ul className="a-effects">
              {!paused && <li><Icon name="pause" /><span>No {label.toLowerCase()} go out from the next hourly run.</span></li>}
              <li><Icon name="reset" /><span>{RESUME_TEXT[automation]}</span></li>
              <li><Icon name="info" /><span>Orders, checkouts and the other emails aren&apos;t affected.</span></li>
            </ul>
            <div className="a-fld"><label htmlFor={`swn-${automation}`}>Note <span className="muted" style={{ fontWeight: 400 }}>· optional, shown in the activity log</span></label>
              <textarea id={`swn-${automation}`} name="note" className="a-textarea" maxLength={300} placeholder="e.g. fixing the certificate link in reminder 2" /></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}><Icon name={paused ? "play" : "pause"} />{paused ? "Turn back on" : `Pause ${label.toLowerCase()}`}</button></div></div>
        </form>
      </dialog>
    </span>
  );
}
