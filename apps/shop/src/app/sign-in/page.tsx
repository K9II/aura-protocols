import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignInForm from "@/components/account/SignInForm";
import SignUpForm from "@/components/account/SignUpForm";
import GoogleButton, { OrEmail } from "@/components/account/GoogleButton";
import { getAccountState, safeNext } from "@/lib/dal";
import { ACCOUNT_CLOSED_MESSAGE } from "@/lib/constants";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used — sign in, or request a new one.",
  google: "We couldn't sign you in with Google — please try again, or use your email below.",
  closed: ACCOUNT_CLOSED_MESSAGE,
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext, "/account");
  const { customer, unfinished } = await getAccountState();
  if (customer) redirect(next);
  if (unfinished) redirect(`/finish-account?next=${encodeURIComponent(next)}`);
  const message = error && Object.hasOwn(ERRORS, error) ? ERRORS[error] : null;
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <div style={{ maxWidth: 900 }}>
          {message && <p role="alert" className="text-sm text-[color:var(--specimen)] mb-6">{message}</p>}
          <p className="s-micro text-[color:var(--specimen)] mb-2.5">New or returning</p>
          <GoogleButton next={next} />
          <OrEmail />
          <div className="grid gap-12 md:grid-cols-2">
            <SignInForm next={next} />
            <SignUpForm next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}
