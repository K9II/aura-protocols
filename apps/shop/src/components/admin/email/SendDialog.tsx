"use client";
import { useActionState, useRef } from "react";
import { sendNowAction } from "@/app/admin/email/actions";
import { Icon } from "@/components/admin/ui";

export default function SendDialog({ id, from, name, subject, audienceLabel, recipients, lastTest, disabled, triggerLabel = "Send now…" }: { id: string; from: "draft" | "scheduled"; name: string; subject: string; audienceLabel: string; recipients: number; lastTest: string | null; disabled: boolean; triggerLabel?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(sendNowAction, null);
  const n = recipients.toLocaleString("en-US");
  return (
    <>
      <button type="button" className="a-btn primary" disabled={disabled} onClick={() => ref.current?.showModal()}><Icon name="send" />{triggerLabel}</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`send-${id}`}>
        <form action={action}>
          <input type="hidden" name="id" value={id} /><input type="hidden" name="from" value={from} />
          <div className="a-modal-h"><h2 id={`send-${id}`}>Send now?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            {state?.ok ? <div className="a-callout ok" role="status"><Icon name="check" /><span>{state.ok}</span></div> : <>
              <div className="a-confirm-big">{n} <small>{recipients === 1 ? "person" : "people"} will get this email</small></div>
              <dl className="a-dl"><dt>Campaign</dt><dd>{name}</dd><dt>Subject</dt><dd>{subject}</dd><dt>Audience</dt><dd>{audienceLabel} (confirmed subscribers)</dd><dt>Test sent</dt><dd>{lastTest ?? "Not yet. Send yourself a test first."}</dd></dl>
              <div className="a-callout info"><Icon name="info" /><span>Sending starts now. If the list is too long to finish at once, the rest go out on the next hourly run. Nobody gets it twice.</span></div>
            </>}
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r">
            {state?.ok ? <button type="button" className="a-btn" onClick={() => { ref.current?.close(); location.reload(); }}>Done</button> : <>
              <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending}><Icon name="send" />{pending ? "Sending…" : `Send to ${n} ${recipients === 1 ? "person" : "people"}`}</button>
            </>}
          </div></div>
        </form>
      </dialog>
    </>
  );
}
