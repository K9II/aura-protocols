"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "@/app/auth/actions";
import PasswordField from "@/components/account/PasswordField";

export default function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updatePasswordAction, undefined);
  return (
    <form action={action}>
      <label htmlFor="rp-password" className="s-micro block mb-1.5">New password</label>
      <PasswordField id="rp-password" autoComplete="new-password" minLength={10} />
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-3">{state.error}</p>}
      <button type="submit" className="s-atc !mt-0" disabled={pending}>Save password →</button>
    </form>
  );
}
