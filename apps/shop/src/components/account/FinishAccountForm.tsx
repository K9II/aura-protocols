"use client";

import { useActionState } from "react";
import { finishAccountAction, type FinishState } from "@/app/finish-account/actions";
import { MARKETING_NOTICE } from "@/lib/gate-shared";
import { FIELD } from "@/components/account/PasswordField";
import AgreementText from "@/components/account/AgreementText";

const field = `${FIELD} mb-4`;

export default function FinishAccountForm({ next, suggestedName }: { next: string; suggestedName: string }) {
  const [state, action, pending] = useActionState<FinishState, FormData>(finishAccountAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="fa-name" className="s-micro block mb-1.5">Full name</label>
      <input id="fa-name" name="fullName" autoComplete="name" required maxLength={100} defaultValue={suggestedName} className={field} />
      <label htmlFor="fa-org" className="s-micro block mb-1.5">Organization (optional)</label>
      <input id="fa-org" name="organization" autoComplete="organization" maxLength={200} className={field} />
      <label className="s-chk"><input type="checkbox" name="agree" required /><AgreementText /></label>
      <p className="text-[12.5px] text-[color:var(--ink-soft)] mb-4">{MARKETING_NOTICE}</p>
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-3">{state.error}</p>}
      <button type="submit" className="s-atc" disabled={pending}>Finish creating account →</button>
      <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-3">
        Google has already confirmed your email, so you can order right away.
      </p>
    </form>
  );
}
