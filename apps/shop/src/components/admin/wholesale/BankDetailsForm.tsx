"use client";

// Admin → Wholesale → Settings → Bank transfer: the account quote-order
// customers send deposits and balances to. Empty = bank transfer can't be offered.
import { useActionState } from "react";
import { saveBankDetailsAction } from "@/app/admin/wholesale/actions";
import type { BankDetails } from "@/lib/wholesale/quote";

export default function BankDetailsForm({ b }: { b: BankDetails | null }) {
  const [state, action, pending] = useActionState(saveBankDetailsAction, null);
  const e = state?.fieldErrors ?? {};
  const err = (k: string) => (e[k] ? <div className="a-err" role="alert">{e[k]}</div> : null);
  return (
    <form action={action} className="a-card" style={{ maxWidth: 720, marginTop: 18 }}>
      <div className="a-card-h"><h3>Bank transfer</h3><span className="sub">for quote orders · shown to the customer on their order page</span></div>
      <div className="a-card-b">
        <div className="a-qo-grid2">
          <div className="a-fld"><label htmlFor="bk-name">Account name</label><input id="bk-name" name="bankAccountName" className="a-qo-in" defaultValue={b?.accountName ?? ""} placeholder="Aura Protocols LLC" maxLength={120} />{err("bankAccountName")}</div>
          <div className="a-fld"><label htmlFor="bk-bank">Bank</label><input id="bk-bank" name="bankName" className="a-qo-in" defaultValue={b?.bankName ?? ""} maxLength={120} />{err("bankName")}</div>
          <div className="a-fld"><label htmlFor="bk-routing">Routing number</label><input id="bk-routing" name="bankRouting" className="a-qo-in" defaultValue={b?.routing ?? ""} inputMode="numeric" maxLength={11} style={{ fontFamily: "var(--mono)" }} />{err("bankRouting")}</div>
          <div className="a-fld"><label htmlFor="bk-acct">Account number</label><input id="bk-acct" name="bankAccount" className="a-qo-in" defaultValue={b?.account ?? ""} inputMode="numeric" maxLength={20} style={{ fontFamily: "var(--mono)" }} />{err("bankAccount")}</div>
          <div className="a-fld full"><label htmlFor="bk-note">Note for the customer <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><input id="bk-note" name="bankNote" className="a-qo-in" defaultValue={b?.note ?? ""} maxLength={300} placeholder="For wires from outside the US, reply to your order email first." />{err("bankNote")}</div>
        </div>
        <div className="a-qo-help">Until all four are filled in, quote orders can only be paid by card. Clear every field to stop offering bank transfer.</div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="a-btn primary" disabled={pending}>Save bank details</button>
          {state?.ok && <span className="a-flash" role="status">{state.ok}</span>}
          {state?.error && <span className="a-err" role="alert">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}
