"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "@/app/auth/actions";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, undefined);
  return (
    <form action={action}>
      <label htmlFor="rp-password" className="s-micro block mb-1.5">New password</label>
      <input id="rp-password" name="password" type="password" autoComplete="new-password" minLength={10} required className="w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4" />
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-3">{state.error}</p>}
      <button type="submit" className="s-atc !mt-0" disabled={pending}>Save password →</button>
    </form>
  );
}
