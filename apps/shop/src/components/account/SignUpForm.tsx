"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthFormState } from "@/app/auth/actions";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";

export default function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUpAction, undefined);
  if (state?.ok) {
    return (
      <div role="status">
        <p className="s-micro text-[color:var(--specimen)] mb-2.5">Almost there</p>
        <h2 className="s-h2 mb-4">Check your <em>email.</em></h2>
        <p className="text-[15px] text-[color:var(--ink-soft)]">{state.message}</p>
      </div>
    );
  }
  return (
    <form action={action} autoComplete="on">
      <p className="s-micro text-[color:var(--specimen)] mb-2.5">New account</p>
      <h2 className="s-h2 mb-6">Create an <em>account.</em></h2>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="su-name" className="s-micro block mb-1.5">Full name</label>
      <input id="su-name" name="fullName" autoComplete="name" required className={field} />
      <label htmlFor="su-email" className="s-micro block mb-1.5">Email</label>
      <input id="su-email" name="email" type="email" autoComplete="email" required className={field} />
      <label htmlFor="su-password" className="s-micro block mb-1.5">Password</label>
      <input id="su-password" name="password" type="password" autoComplete="new-password" minLength={10} required className={field} />
      <label htmlFor="su-org" className="s-micro block mb-1.5">Organization (optional)</label>
      <input id="su-org" name="organization" autoComplete="organization" className={field} />
      <label className="s-chk"><input type="checkbox" name="agree" required /><span>I am 21 or older, I am buying for in-vitro laboratory research use only (not for human or animal use), and I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and the <Link href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund &amp; Dispute Policy</Link>.</span></label>
      <label className="s-chk"><input type="checkbox" name="emailOptIn" /><span>Email me promotions, research news and new lots.</span></label>
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-3">{state.error}</p>}
      <button type="submit" className="s-atc" disabled={pending}>Create account →</button>
      <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">We&apos;ll email a link to confirm your address before your first order.</p>
    </form>
  );
}
