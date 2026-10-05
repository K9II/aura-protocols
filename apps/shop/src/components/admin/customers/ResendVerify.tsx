"use client";
import { useActionState } from "react";
import { resendVerifyAdminAction } from "@/app/admin/customers/actions";
import { Icon } from "@/components/admin/ui";

export default function ResendVerify({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(resendVerifyAdminAction, null);
  return (
    <form action={action} style={{ display: "contents" }}>
      <input type="hidden" name="customerId" value={customerId} />
      <button type="submit" className="a-btn" disabled={pending}><Icon name="mail" />Resend verification</button>
      {(state?.ok || state?.error) && <span className={state.ok ? "a-ok" : "a-err"} role="status">{state.ok ?? state.error}</span>}
    </form>
  );
}
