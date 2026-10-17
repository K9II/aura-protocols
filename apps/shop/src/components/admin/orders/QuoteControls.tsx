"use client";

// Quote-order controls on the admin order page (mocks 2026-10-17, screen 3):
// Copy pay link, and Record bank transfer… for the deposit or the balance.
import { useActionState, useEffect, useRef, useState } from "react";
import { recordBankTransferAction } from "@/app/admin/orders/quote/actions";
import { usd } from "@/lib/html";

export function CopyPayLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt?.("Copy the pay link:", url); }
  };
  return <button type="button" className="a-btn" onClick={copy}>{copied ? "Link copied" : "Copy pay link"}</button>;
}

export function RecordTransferDialog({ orderId, orderNumber, payment, dueCents, today, blocked }: {
  orderId: string; orderNumber: string; payment: "deposit" | "balance"; dueCents: number; today: string; blocked: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, run, pending] = useActionState(recordBankTransferAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? <div className="a-err" role="alert">{fe[k]}</div> : null);
  const id = `rbt-${orderId}`;
  const due = (dueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <>
      <button type="button" className="a-btn primary" onClick={() => ref.current?.showModal()}>Record bank transfer…</button>
      {state?.ok && <span className="a-flash" role="status">{state.ok}</span>}
      <dialog ref={ref} className="a-modal a-qo-dlg" aria-labelledby={id}>
        <form action={run}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="payment" value={payment} />
          <div className="a-modal-h"><h2 id={id}>Record bank transfer <span style={{ whiteSpace: "nowrap" }}>· {orderNumber}</span></h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            {blocked ? <div className="a-callout warn"><span>{blocked}</span></div> : <>
              <div><span style={{ display: "block", fontWeight: 500, marginBottom: 5 }}>For</span>
                <div className="a-qo-seg">
                  <label className={payment === "deposit" ? "on" : "off"}>Deposit{payment === "deposit" ? ` · ${usd(dueCents)}` : ""}</label>
                  <label className={payment === "balance" ? "on" : "off"}>Balance{payment === "balance" ? ` · ${usd(dueCents)}` : " · after the lot passes"}</label>
                </div></div>
              <div className="a-qo-grid2">
                <div className="a-fld"><label htmlFor={`${id}-amt`}>Amount received</label>
                  <span className={`a-input${fe.amount ? " err" : ""}`}><span className="affix l">$</span><input id={`${id}-amt`} name="amount" defaultValue={due} inputMode="decimal" style={{ font: "500 13px var(--mono)" }} /></span>{err("amount")}</div>
                <div className="a-fld"><label htmlFor={`${id}-on`}>Arrived on</label>
                  <input id={`${id}-on`} name="receivedOn" type="date" className="a-qo-in" defaultValue={today} max={today} />{err("receivedOn")}</div>
              </div>
              <div className="a-fld"><label htmlFor={`${id}-ref`}>Bank reference <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label>
                <input id={`${id}-ref`} name="reference" className="a-qo-in" maxLength={120} style={{ fontFamily: "var(--mono)" }} />{err("reference")}</div>
              <div className="a-callout warn"><span>Check the money is in the business account before you record it. {payment === "deposit"
                ? <>Recording moves the order to <b>Deposit paid</b>, puts it in its production run and emails the customer a receipt.</>
                : <>Recording moves the order to <b>Paid</b> (ready to ship) and emails the customer a receipt.</>}</span></div>
              {state?.error && <div className="a-err" role="alert">{state.error}</div>}
            </>}
          </div>
          <div className="a-modal-f"><div className="r">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            {!blocked && <button type="submit" className="a-btn primary" disabled={pending}>{pending ? "Recording…" : `Record ${payment} ${usd(dueCents)}`}</button>}
          </div></div>
        </form>
      </dialog>
    </>
  );
}
