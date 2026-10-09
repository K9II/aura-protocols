"use client";

// Customer page → Wholesale card (mock a8): turn wholesale off (reason
// required, kept in the activity) or allow it again.
import { useActionState, useEffect, useRef } from "react";
import { setCustomerWholesaleAction } from "@/app/admin/customers/actions";

export default function WholesaleDialog({ customerId, name, off }: { customerId: string; name: string; off: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(setCustomerWholesaleAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  if (off) {
    return (
      <form action={action} style={{ display: "inline" }}>
        <input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="on" value="true" />
        <button type="submit" className="a-btn sm" disabled={pending}>Allow wholesale again</button>
        {state?.error && <div className="a-err" role="alert">{state.error}</div>}
      </form>
    );
  }
  return (
    <>
      <button type="button" className="a-btn sm" onClick={() => ref.current?.showModal()}>Turn off wholesale…</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`ws-off-${customerId}`}>
        <form action={action}>
          <input type="hidden" name="customerId" value={customerId} /><input type="hidden" name="on" value="false" />
          <div className="a-modal-h"><h2 id={`ws-off-${customerId}`}>Turn off wholesale for {name}?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-fld"><label htmlFor={`ws-why-${customerId}`}>Why <span className="muted" style={{ fontWeight: 400 }}>· required, kept in the customer&apos;s activity</span></label>
              <textarea id={`ws-why-${customerId}`} name="reason" className="a-textarea" rows={3} maxLength={500} required />
              {state?.fieldErrors?.reason && <div className="a-err" role="alert">{state.fieldErrors.reason}</div>}</div>
            <div className="a-callout info"><span>They see &ldquo;Wholesale ordering is switched off for your account&rdquo; on /wholesale. Orders already placed carry on; single vials are unaffected. Turn it back on here any time.</span></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn danger-fill" disabled={pending}>Turn off</button></div></div>
        </form>
      </dialog>
    </>
  );
}
