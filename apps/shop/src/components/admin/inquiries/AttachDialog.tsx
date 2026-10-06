"use client";

// Unmatched → Attach to inquiry: pick the conversation by its Q-number.
import { useActionState, useEffect, useRef } from "react";
import { attachUnmatchedAction } from "@/app/admin/inquiries/actions";

export default function AttachDialog({ id, from, primary }: { id: string; from: string; primary?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(attachUnmatchedAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  return (
    <>
      <button type="button" className={`a-btn sm${primary ? " primary" : ""}`} onClick={() => ref.current?.showModal()}>Attach to inquiry…</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`att-${id}`}>
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <div className="a-modal-h"><h2 id={`att-${id}`}>Attach to an inquiry</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <p>The email from {from} is added to that conversation as a customer message. Its attachments aren&apos;t kept.</p>
            <div className="a-fld"><label htmlFor={`att-ref-${id}`}>Q-number</label><input id={`att-ref-${id}`} name="ref" className="a-iq-in" placeholder="Q-1047" required /></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}>Attach</button></div></div>
        </form>
      </dialog>
    </>
  );
}
