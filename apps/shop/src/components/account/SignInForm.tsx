"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/app/auth/actions";
import PasswordField, { FIELD } from "@/components/account/PasswordField";

export default function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signInAction, undefined);
  return (
    <form action={action}>
      <p className="s-micro text-[color:var(--specimen)] mb-2.5">Returning researcher</p>
      <h1 className="s-h1 mb-6" style={{ fontSize: 44 }}>Sign <em>in.</em></h1>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="si-email" className="s-micro block mb-1.5">Email</label>
      <input id="si-email" name="email" type="email" autoComplete="email" required className={`${FIELD} mb-4`} />
      <label htmlFor="si-password" className="s-micro block mb-1.5">Password</label>
      <PasswordField id="si-password" autoComplete="current-password" />
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-3">{state.error}</p>}
      <button type="submit" className="s-atc !mt-0" disabled={pending}>Sign in →</button>
      <Link href="/forgot-password" className="block text-center my-3 text-[12.5px] underline text-[color:var(--ink-soft)]">Forgot password?</Link>
    </form>
  );
}
