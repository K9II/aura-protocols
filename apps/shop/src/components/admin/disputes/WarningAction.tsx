"use client";

// The suggested action on an early fraud warning (mock screens 1, 3, 5): not
// shipped → Cancel and refund (dialog); shipped → Watch; already refunded or
// cancelled → Close. The dialog has its own form and is never inside another.
import { useActionState, useRef } from "react";
import { refundEarlyWarningAction, watchEarlyWarningAction } from "@/app/admin/disputes/actions";
import { DISPUTE_FEE_CENTS } from "@/lib/disputes/constants";
import type { WarningActionData } from "@/lib/disputes/rules";
import { usd } from "@/lib/html";
import { Icon } from "@/components/admin/ui";

// dialogKey keeps DOM ids unique when the same warning shows twice on a page
// (desktop table + phone list); the submitted id is always the real one.
export default function WarningAction({ w, dialogKey }: { w: WarningActionData; dialogKey?: string }) {
  if (w.kind === "refund") return <RefundDialog w={w} dialogKey={dialogKey ?? w.id} />;
  return (
    <form action={watchEarlyWarningAction}>
      <input type="hidden" name="id" value={w.id} />
      <button type="submit" className="a-btn sm">{w.kind === "watch" ? "Watch" : "Close"}</button>
    </form>
  );
}

function RefundDialog({ w, dialogKey }: { w: WarningActionData; dialogKey: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(refundEarlyWarningAction, null);
  const id = `efw-${dialogKey}`;
  return (
    <>
      <button type="button" className="a-btn sm danger" onClick={() => ref.current?.showModal()}>Cancel and refund…</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={id}>
        <form action={action}>
          <input type="hidden" name="id" value={w.id} />
          <div className="a-modal-h"><h2 id={id}>Cancel and refund {w.orderNumber}?</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            {state?.ok ? <div className="a-callout ok" role="status"><Icon name="check" /><span>{state.ok}</span></div> : <>
              <div className="a-confirm-big">{usd(w.chargedCents)} <small>back to the card</small></div>
              <ul className="a-effects">
                <li><Icon name="check" /><span>The order is cancelled and its vials go back to stock.</span></li>
                <li><Icon name="check" /><span>Refunding now avoids the {usd(DISPUTE_FEE_CENTS)} dispute fee and keeps this off your dispute rate.</span></li>
                {w.creditCents > 0 && <li><Icon name="info" /><span>{usd(w.creditCents)} of store credit goes back to their account.</span></li>}
                <li><Icon name="info" /><span>The customer is emailed that the order was cancelled and refunded.</span></li>
              </ul>
            </>}
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r">
            {state?.ok ? <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Done</button> : <>
              <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Keep the order</button>
              <button type="submit" className="a-btn danger-fill" disabled={pending}>{pending ? "Refunding…" : "Cancel and refund"}</button>
            </>}
          </div></div>
        </form>
      </dialog>
    </>
  );
}
