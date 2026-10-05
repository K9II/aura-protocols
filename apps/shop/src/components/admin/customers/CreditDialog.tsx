"use client";

// Adjust store credit (mock screen 3; bottom sheet on a phone via CSS).
import { useActionState, useEffect, useRef, useState } from "react";
import { adjustCreditAction } from "@/app/admin/customers/actions";
import { CATEGORY_LABEL, CREDIT_CATEGORIES } from "@/lib/customers/rules";
import { usd } from "@/lib/html";
import { Icon } from "@/components/admin/ui";

export default function CreditDialog({ customerId, balanceCents, small }: { customerId: string; balanceCents: number; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(adjustCreditAction, null);
  const [dir, setDir] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const cents = Math.max(0, Math.round((Number(amount) || 0) * 100));
  const next = balanceCents + (dir === "add" ? cents : -cents);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <button type="button" className={`a-btn${small ? " sm" : ""}`} onClick={() => ref.current?.showModal()}><Icon name="plus" />Adjust credit</button>
      {state?.ok && <span className="a-ok" role="status">{state.ok}</span>}
      <dialog ref={ref} className="a-modal" aria-labelledby={`credit-${customerId}`}>
        <form action={action}>
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="direction" value={dir} />
          <div className="a-modal-h"><h2 id={`credit-${customerId}`}>Adjust store credit</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-seg2" role="group" aria-label="Add or remove">
              <button type="button" className={dir === "add" ? "on" : undefined} aria-pressed={dir === "add"} onClick={() => setDir("add")}>Add credit</button>
              <button type="button" className={dir === "remove" ? "on" : undefined} aria-pressed={dir === "remove"} onClick={() => setDir("remove")}>Remove credit</button>
            </div>
            <div className="a-row">
              <div className="a-fld"><label htmlFor="cr-amount">Amount</label>
                <div className="a-input"><span className="affix l">$</span><input id="cr-amount" name="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
                {fe.amount && <div className="a-err" role="alert">{fe.amount}</div>}</div>
              <div className="a-fld"><label htmlFor="cr-cat">Reason</label>
                <div className="a-input"><select id="cr-cat" name="category" defaultValue="goodwill" style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                  {CREDIT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select></div>
                {fe.category && <div className="a-err" role="alert">{fe.category}</div>}</div>
            </div>
            <div className="a-fld"><label htmlFor="cr-note">Note <span className="muted" style={{ fontWeight: 400 }}>· only you see this</span></label>
              <div className="a-input"><input id="cr-note" name="note" maxLength={300} /></div>
              {fe.note ? <div className="a-err" role="alert">{fe.note}</div> : <div className="help">Other needs a note.</div>}</div>
            {dir === "add" && <>
              <label className="a-cbrow"><input type="checkbox" name="email" defaultChecked aria-label="Email the customer" /><span><b>Email the customer</b><small>&quot;{cents ? usd(cents) : "$X"} store credit has been added to your account&quot; with the new balance.</small></span></label>
              <div className="a-fld"><label htmlFor="cr-msg">Message in the email <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label>
                <textarea id="cr-msg" name="message" className="a-textarea" maxLength={300} /></div>
            </>}
            <div className="a-balance">Balance <span className="from">{usd(balanceCents)}</span><Icon name="arrow" /><span className="to">{usd(Math.max(0, next))}</span></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><span className="muted a-only-desk" style={{ fontSize: 12 }}>Logged with your name</span>
            <div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending || !cents}>{dir === "add" ? "Add" : "Remove"} {usd(cents)}</button></div></div>
        </form>
      </dialog>
    </>
  );
}
