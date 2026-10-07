"use client";

import { useActionState } from "react";
import { linkAction } from "@/app/admin/inquiries/actions";

// "No account for this email" → link the account the customer uses (they may
// have written from another address).
export default function LinkAccount({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState(linkAction, null);
  return (
    <form action={action} className="a-iq-inline">
      <input type="hidden" name="id" value={inquiryId} />
      <input name="email" type="email" placeholder="Account email" aria-label="Account email" required />
      <button type="submit" className="a-btn sm" disabled={pending}>Link account</button>
      {state?.error && <div className="a-err" role="alert">{state.error}</div>}
    </form>
  );
}
