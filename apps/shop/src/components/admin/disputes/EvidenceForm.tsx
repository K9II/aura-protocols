"use client";

// The evidence form on a chargeback (mock screens 2, 3 and 6). One form:
// Save draft submits it to saveDisputeDraftAction; the Submit dialog sits
// inside the same form (it has no form of its own — never nest forms) and its
// button submits it to submitDisputeAction with formAction.
import { useActionState, useEffect, useRef, useState } from "react";
import { saveDisputeDraftAction, submitDisputeAction } from "@/app/admin/disputes/actions";
import { EDITABLE_FIELDS, FIELD_LABEL, FIELD_MAX, type EditableField, type EvidenceDraft } from "@/lib/disputes/fields";
import { BANK_DECISION_DAYS } from "@/lib/disputes/constants";
import { Icon } from "@/components/admin/ui";

export type EvidenceFormProps = {
  id: string;                          // our dispute id (the form's hidden id)
  initial: EvidenceDraft;              // the saved draft, or the evidence built from the records
  letterFor: string;                   // "not received", "fraud", …
  scanOk: boolean;                     // the shown text passed the compliance scan on the server
  agreement: Array<[string, string]>;  // the agreement record, read-only
  policy: string;                      // refund policy disclosure, read-only
  savedText: string;                   // "Draft saved to Stripe Oct 6, 9:31 am · …"
  summary: { chargeback: string; shipping: string; pdfPages: number };
  pdfHref: string;
};

export default function EvidenceForm(p: EvidenceFormProps) {
  const [f, setF] = useState<EvidenceDraft>(p.initial);
  const [last, setLast] = useState<"save" | "submit">("save");
  const [saveState, save, saving] = useActionState(saveDisputeDraftAction, null);
  const [submitState, submit, submitting] = useActionState(submitDisputeAction, null);
  const dialog = useRef<HTMLDialogElement>(null);
  const state = last === "submit" ? submitState : saveState;
  const fe = state?.fieldErrors ?? {};
  // A field error on the fields behind the dialog is invisible while it's
  // open: close it so the highlighted field shows.
  useEffect(() => {
    if (last === "submit" && submitState?.fieldErrors) dialog.current?.close();
  }, [last, submitState]);
  const other = Object.entries(fe).filter(([k]) => !(EDITABLE_FIELDS as readonly string[]).includes(k));
  const set = (k: EditableField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const err = (k: EditableField) => (fe[k] ? <div className="a-err" role="alert">{fe[k]}</div> : null);
  const input = (k: EditableField, mono = false) => (
    <div className="a-fld">
      <label htmlFor={`ev-${k}`}>{FIELD_LABEL[k]}</label>
      <input id={`ev-${k}`} name={k} className={`a-input${mono ? " mono" : ""}`} value={f[k]} maxLength={FIELD_MAX[k]} onChange={set(k)} />
      {err(k)}
    </div>
  );
  const msg = state?.error
    ? <span className="msg err" role="alert"><Icon name="warn" />{state.error}</span>
    : state?.ok
      ? <span className="msg" role="status"><Icon name="check" />{state.ok} · the bank sees nothing until you submit</span>
      : <span className="msg"><Icon name="info" />{p.savedText}</span>;

  return (
    <form action={save} className="a-ev">
      <input type="hidden" name="id" value={p.id} />
      <div className="a-fsec">
        <div className="a-fsec-h"><h3>Cover letter</h3><span>written for &quot;{p.letterFor}&quot; · goes to the bank</span></div>
        <div className="a-fsec-b"><div className="a-fld">
          <textarea name="uncategorized_text" aria-label="Cover letter" className="a-textarea letter" value={f.uncategorized_text} maxLength={FIELD_MAX.uncategorized_text} onChange={set("uncategorized_text")} />
          <div className="help">{p.scanOk ? "Compliance scan passed · edit freely; it is checked again when you save and submit." : "The compliance scan checks this when you save and submit."}</div>
          {err("uncategorized_text")}
        </div></div>
      </div>

      <div className="a-fsec">
        <div className="a-fsec-h"><h3>Shipping</h3><span>from the order and the carrier</span></div>
        <div className="a-fsec-b">
          <div className="a-row">{input("shipping_carrier")}{input("shipping_tracking_number", true)}</div>
          <div className="a-row">{input("shipping_date")}{input("shipping_address")}</div>
        </div>
      </div>

      <div className="a-fsec">
        <div className="a-fsec-h"><h3>Customer and account</h3><span>from the account and its signed agreement</span></div>
        <div className="a-fsec-b">
          <div className="a-row">{input("customer_name")}{input("customer_email_address")}</div>
          <div className="a-fld">
            <span className="lbl">Agreement record <span className="src">· not editable</span></span>
            <dl className="a-agr">{p.agreement.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </div>
        </div>
      </div>

      <div className="a-fsec">
        <div className="a-fsec-h"><h3>Products and policy</h3></div>
        <div className="a-fsec-b">
          <div className="a-fld">
            <label htmlFor="ev-product_description">{FIELD_LABEL.product_description}</label>
            <textarea id="ev-product_description" name="product_description" className="a-textarea" value={f.product_description} maxLength={FIELD_MAX.product_description} onChange={set("product_description")} />
            {err("product_description")}
          </div>
          <div className="a-fld">
            <span className="lbl">Refund policy shown to the customer <span className="src">· from the policy they agreed to</span></span>
            <div className="a-ta ro">{p.policy}</div>
          </div>
        </div>
      </div>

      {other.length > 0 && <div className="a-err" role="alert">{other.map(([k, v]) => <div key={k}>{v}</div>)}</div>}
      <div className="a-savebar">
        {msg}
        <div className="r">
          <a className="a-btn" href={p.pdfHref}><Icon name="download" />Download PDF</a>
          <button type="submit" className="a-btn" disabled={saving || submitting} onClick={() => setLast("save")}>{saving ? "Saving…" : "Save draft"}</button>
          <button type="button" className="a-btn primary" disabled={saving || submitting} onClick={() => dialog.current?.showModal()}><Icon name="send" />Submit to Stripe…</button>
        </div>
      </div>

      <dialog ref={dialog} className="a-modal" aria-labelledby={`submit-${p.id}`}>
        <div className="a-modal-h"><h2 id={`submit-${p.id}`}>Submit evidence to Stripe?</h2><button type="button" className="x" aria-label="Close" onClick={() => dialog.current?.close()}>×</button></div>
        <div className="a-modal-b">
          <dl className="a-dl">
            <dt>Chargeback</dt><dd>{p.summary.chargeback}</dd>
            <dt>Cover letter</dt><dd>{f.uncategorized_text.length.toLocaleString("en-US")} characters</dd>
            <dt>Shipping</dt><dd>{p.summary.shipping}</dd>
            <dt>Attached</dt><dd>Evidence PDF · {p.summary.pdfPages} page{p.summary.pdfPages === 1 ? "" : "s"}</dd>
          </dl>
          <div className="a-callout warn"><Icon name="lock" /><span>Evidence can&apos;t be changed after it&apos;s submitted. The bank usually decides within {BANK_DECISION_DAYS[0]}–{BANK_DECISION_DAYS[1]} days; you&apos;ll get an alert when it does.</span></div>
          {last === "submit" && submitState?.error && <div className="a-err" role="alert">{submitState.error}</div>}
        </div>
        <div className="a-modal-f"><div className="r">
          <button type="button" className="a-btn" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="a-btn primary" formAction={submit} disabled={submitting} onClick={() => setLast("submit")}><Icon name="send" />{submitting ? "Submitting…" : "Submit evidence"}</button>
        </div></div>
      </dialog>
    </form>
  );
}
