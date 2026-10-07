"use client";

// Refund dialogs (mock 2026-10-07-admin-refunds r2, r3, r5 right, r6).
// mode "cancel" = before shipping, the policy's Cancel and refund (money back
// where it came from); mode "exception" = after shipping, a recorded
// exception (store credit by default, note and confirm required). Posts to
// refundOrderAction; field errors show under their fields, a `form` error as
// the red banner; on ok the dialog closes and the page refreshes.
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { refundOrderAction, type RefundState } from "@/app/admin/orders/actions";
import { REFUND_NOTE_MAX, REFUND_REASONS, REFUND_REASON_LABEL, type RefundDestination, type RefundMode } from "@/lib/refunds/rules";
import { usd } from "@/lib/html";
import { Icon } from "@/components/admin/ui";

export type RefundSplit = { cardCents: number; creditBackCents: number; cardToCreditCents: number; totalCents: number };
export type RefundDialogProps = {
  dialogId: string; orderId: string; orderNumber: string; mode: RefundMode;
  firstName: string; vials: number;
  // "The LABNOTES commission ($19.20) is reversed." / "No partner on this order."
  commission: string;
  splits: Record<RefundDestination, RefundSplit>;
  // "Visa ••4242"; null = the order has no card payment.
  paymentLabel: string | null;
  replaceHref: string;
  // Render the "Cancel and refund" header button (desktop; phones use the ⋯ menu).
  button?: boolean;
};

function Confirm({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="a-btn danger-fill" disabled={pending}>{children}</button>;
}

const possessive = (name: string) => `${name}'s`;

function Lines({ split, label, firstName }: { split: RefundSplit; label: string | null; firstName: string }) {
  const credit = split.creditBackCents + split.cardToCreditCents;
  return (
    <div className="a-refund-lines">
      {split.cardCents > 0 && <div className="rl"><span>Back to {label ?? "the card"}<small>usually 5–10 business days, depending on the bank</small></span><span>{usd(split.cardCents)}</span></div>}
      {credit > 0 && <div className="rl"><span>Back to {possessive(firstName)} store credit<small>{split.cardCents === 0 && !label ? "paid fully with store credit · available right away" : "available right away"}</small></span><span>{usd(credit)}</span></div>}
      <div className="rl tot"><span>Refunded in full</span><span>{usd(split.totalCents)}</span></div>
    </div>
  );
}

export default function RefundDialog(p: RefundDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<RefundState, FormData>(refundOrderAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const cancel = p.mode === "cancel";
  const hasCard = p.paymentLabel !== null;
  const [dest, setDest] = useState<RefundDestination>(cancel && hasCard ? "card" : "store_credit");
  const err = state?.errors ?? {};
  const split = p.splits[dest];
  const close = () => ref.current?.close();
  const title = cancel ? <>Cancel and refund<span className="a-hide-640"> {p.orderNumber}</span>?</> : <>Refund<span className="a-hide-640"> {p.orderNumber}</span>? It has shipped.</>;
  const confirmText = cancel
    ? `Cancel and refund ${usd(split.totalCents)}`
    : `Refund ${usd(split.totalCents)} to ${dest === "card" ? p.paymentLabel : "store credit"}`;
  const vialsText = `${p.vials} vial${p.vials === 1 ? "" : "s"}`;

  return (
    <>
      {p.button && <button type="button" className="a-btn a-hide-640" onClick={() => ref.current?.showModal()}>Cancel and refund</button>}
      <dialog ref={ref} id={p.dialogId} className="a-modal a-sheet" aria-labelledby={id("h")}>
        <form action={action}>
          <input type="hidden" name="orderId" value={p.orderId} />
          <input type="hidden" name="mode" value={p.mode} />
          {cancel && <input type="hidden" name="destination" value={dest} />}
          <div className="a-modal-h"><h2 id={id("h")}>{title}</h2><button type="button" className="x" aria-label="Close" onClick={close}>×</button></div>
          {err.form ? (
            <>
              <div className="a-modal-b">
                <div className="a-err-banner" role="alert"><Icon name="warn" /><div>{err.form}</div></div>
                <Lines split={split} label={p.paymentLabel} firstName={p.firstName} />
              </div>
              <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={close}>Close</button></div></div>
            </>
          ) : (
            <>
              <div className="a-modal-b">
                {cancel ? (
                  <Lines split={split} label={p.paymentLabel} firstName={p.firstName} />
                ) : (
                  <>
                    <div className="a-callout warn"><Icon name="warn" /><div><b>Your policy:</b> after shipping the sale is final. Lost or damaged items get a free replacement, not cash.
                      <div style={{ marginTop: 8 }}><Link className="a-btn sm" href={p.replaceHref}>Send a replacement instead</Link></div></div></div>
                    <div className="a-fld" role="radiogroup" aria-labelledby={id("dest")}><label id={id("dest")}>Refund to</label>
                      <div className="a-dest">
                        <label className={`opt${dest === "store_credit" ? " on" : ""}`}>
                          <input type="radio" name="destination" value="store_credit" checked={dest === "store_credit"} onChange={() => setDest("store_credit")} className="sr-only" />Store credit
                          <small>{usd(p.splits.store_credit.totalCents)} to {possessive(p.firstName)} balance{hasCard ? " · the card charge stays" : ""}</small>
                        </label>
                        <label className={`opt${dest === "card" ? " on" : ""}${hasCard ? "" : " dis"}`}>
                          <input type="radio" name="destination" value="card" checked={dest === "card"} disabled={!hasCard} onChange={() => setDest("card")} className="sr-only" />{p.paymentLabel ?? "Card"}
                          <small>{hasCard
                            ? `${usd(p.splits.card.cardCents)} back to the card${p.splits.card.creditBackCents > 0 ? ` · ${usd(p.splits.card.creditBackCents)} to store credit` : ""}`
                            : "No card payment on this order"}</small>
                        </label>
                      </div>
                      {err.destination && <div className="a-err" role="alert">{err.destination}</div>}</div>
                  </>
                )}
                {cancel && (
                  <ul className="a-rfacts">
                    <li>{vialsText} go{p.vials === 1 ? "es" : ""} back to stock.</li>
                    <li>{p.commission}</li>
                    <li>{p.firstName} gets the &quot;cancelled and refunded&quot; email.</li>
                  </ul>
                )}
                <div className="a-fld"><label htmlFor={id("reason")}>Reason</label>
                  <div className="a-input"><select id={id("reason")} name="reason" defaultValue={cancel ? "customer_cancelled" : ""} style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                    {!cancel && <option value="" disabled>Choose a reason</option>}
                    {REFUND_REASONS.map((r) => <option key={r} value={r}>{REFUND_REASON_LABEL[r]}</option>)}
                  </select></div>
                  {err.reason && <div className="a-err" role="alert">{err.reason}</div>}</div>
                <div className="a-fld"><label htmlFor={id("note")}>Note <span className="muted" style={{ fontWeight: 400 }}>{cancel ? "(optional — only you see it)" : "(required)"}</span></label>
                  <textarea id={id("note")} name="note" className="a-textarea" maxLength={REFUND_NOTE_MAX} placeholder={cancel ? "e.g. \"Ordered the wrong strength — Q-1049\"" : "Why this order is an exception — only you see it"} />
                  {err.note && <div className="a-err" role="alert">{err.note}</div>}</div>
                {!cancel && (
                  <>
                    <ul className="a-rfacts">
                      <li>Vials stay out of stock — they&apos;ve shipped.</li>
                      <li>{p.commission}</li>
                      <li>{p.firstName} gets a &quot;refunded&quot; email with the amount and where it went.</li>
                    </ul>
                    <div>
                      <label className="a-chkline"><input type="checkbox" name="confirm" /><span>I&apos;m making an exception to the refund policy for this order.</span></label>
                      {err.confirm && <div className="a-err" role="alert">{err.confirm}</div>}
                    </div>
                  </>
                )}
              </div>
              <div className="a-modal-f"><div className="r">
                <button type="button" className="a-btn keep" onClick={close}>Keep order</button>
                <Confirm>{confirmText}</Confirm>
              </div></div>
            </>
          )}
        </form>
      </dialog>
    </>
  );
}
