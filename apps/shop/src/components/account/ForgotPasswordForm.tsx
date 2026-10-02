"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type AuthFormState } from "@/app/auth/actions";

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordResetAction, undefined);
  if (state?.ok) return <p role="status" className="text-[15px] text-[color:var(--ink-soft)]">{state.message}</p>;
  return (
    <form action={action}>
      <label htmlFor="fp-email" className="s-micro block mb-1.5">Email</label>
      <input id="fp-email" name="email" type="email" autoComplete="email" required className="w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4" />
      <button type="submit" className="s-atc !mt-0" disabled={pending}>Send reset link →</button>
    </form>
  );
}
