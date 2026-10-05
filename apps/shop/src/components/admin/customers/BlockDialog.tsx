"use client";

// Block an account (mock screen 4). Says exactly what will happen.
import { useActionState, useEffect, useRef } from "react";
import { blockAction } from "@/app/admin/customers/actions";
import { usd } from "@/lib/html";
import { Icon } from "@/components/admin/ui";

export default function BlockDialog({ customerId, name, openCheckouts }: { customerId: string; name: string; openCheckouts: Array<{ number: string; totalCents: number }> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(blockAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const n = openCheckouts.length;
  return (
    <>
      <button type="button" className="a-btn danger" onClick={() => ref.current?.showModal()}><Icon name="lock" />Block</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`block-${customerId}`}>
        <form action={action}>
          <input type="hidden" name="customerId" value={customerId} />
          <div className="a-modal-h"><h2 id={`block-${customerId}`}>Block {name}?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <ul className="a-effects">
              <li><Icon name="lock" /><span>Signed out on every device and can&apos;t sign back in. The email can&apos;t be used for a new account.</span></li>
              <li><Icon name="reset" /><span>{n === 0 ? "No open checkouts to cancel." : <>{n} open checkout{n === 1 ? "" : "s"} ({openCheckouts.map((o) => `${o.number}, ${usd(o.totalCents)}`).join("; ")}) {n === 1 ? "is" : "are"} cancelled. Any code or store credit {n === 1 ? "it was" : "they were"} holding is released.</>}</span></li>
              <li><Icon name="check" /><span>Orders, agreements and store credit are kept for disputes. You can unblock at any time.</span></li>
            </ul>
            <div className="a-fld"><label htmlFor={`br-${customerId}`}>Reason <span className="muted" style={{ fontWeight: 400 }}>· required, only you see this</span></label>
              <textarea id={`br-${customerId}`} name="reason" className="a-textarea" maxLength={500} required />
              {state?.fieldErrors?.reason && <div className="a-err" role="alert">{state.fieldErrors.reason}</div>}</div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn danger-fill" disabled={pending}><Icon name="lock" />Block account</button></div></div>
        </form>
      </dialog>
    </>
  );
}
