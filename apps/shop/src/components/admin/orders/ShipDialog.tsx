"use client";

// Ship an order (mock screen 2): carrier + tracking. Errors come back from
// the action and show in the dialog; on success it closes and the page
// refreshes through revalidatePath.
import { useActionState, useEffect, useId, useRef } from "react";
import { markShippedAction } from "@/app/admin/orders/actions";
import { CARRIERS } from "@/lib/emails";

export default function ShipDialog({ orderId, orderNumber, summary, small }: { orderId: string; orderNumber: string; summary: string; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(markShippedAction, null);
  useEffect(() => { if (state && "ok" in state) ref.current?.close(); }, [state]);
  const err = state && "error" in state ? state : null;
  // useId, not orderId: the same order's row renders this dialog twice (desktop
  // table + phone card), and htmlFor targets must stay unique across both.
  const id = `ship-${useId()}`;
  return (
    <>
      <button type="button" className={`a-btn primary${small ? " sm" : ""}`} onClick={() => ref.current?.showModal()}>Ship</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={id}>
        <form action={action}>
          <input type="hidden" name="orderId" value={orderId} />
          <div className="a-modal-h"><h2 id={id}>Ship {orderNumber}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="muted">{summary}</div>
            <div className="a-row" style={{ gridTemplateColumns: "140px 1fr" }}>
              <div className="a-fld"><label htmlFor={`${id}-carrier`}>Carrier</label>
                <div className="a-input"><select id={`${id}-carrier`} name="carrier" defaultValue="usps" style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                  {CARRIERS.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select></div></div>
              <div className="a-fld"><label htmlFor={`${id}-tracking`}>Tracking number</label>
                <div className={`a-input mono${err?.field === "tracking" ? " err" : ""}`}><input id={`${id}-tracking`} name="tracking" required autoComplete="off" /></div>
                {err?.field === "tracking" && <div className="a-err" role="alert">{err.error}</div>}</div>
            </div>
            {err && !err.field && <div className="a-err" role="alert">{err.error}</div>}
            <div className="a-callout info">The customer gets the shipped email with this tracking number. Any partner commission starts clearing.</div>
          </div>
          <div className="a-modal-f"><div className="r">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}>Mark shipped</button>
          </div></div>
        </form>
      </dialog>
    </>
  );
}
