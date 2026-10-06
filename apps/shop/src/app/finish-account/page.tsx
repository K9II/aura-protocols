import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccountState, getUnfinishedUser, safeNext } from "@/lib/dal";
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { signOutToSignInAction } from "@/app/auth/actions";
import GoogleMark from "@/components/account/GoogleMark";
import FinishAccountForm from "@/components/account/FinishAccountForm";

export const metadata: Metadata = { title: "Finish your account", robots: { index: false, follow: false } };

// First Google sign-in only (spec 2026-10-05-google-signin-design): the same
// agreement as email sign-up before they can browse or buy.
export default async function FinishAccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext, "/");
  const state = await getAccountState();
  if (state.customer) redirect(next);
  if (state.blocked) redirect("/sign-in?error=closed");
  const user = await getUnfinishedUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  // Signed in without Google and no customers row (e.g. made straight through
  // Supabase's sign-up API): never finished here — that would skip the email
  // sign-up checks (deliverability, IP limit, device flag) and verification.
  if (!user.viaGoogle) return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <div style={{ maxWidth: 520 }}>
          <p className="s-micro text-[color:var(--specimen)] mb-2.5">Account not set up</p>
          <h1 className="s-h1 mb-5" style={{ fontSize: 44 }}>Create your account <em>with email.</em></h1>
          <p className="text-[15px] text-[color:var(--ink-soft)] mb-5">Signed in as <b>{user.email}</b>, but this sign-in can&apos;t be finished here. Sign out, then create your account with your email on the sign-in page.</p>
          <form action={signOutToSignInAction}><button type="submit" className="s-atc">Sign out →</button></form>
        </div>
      </div>
    </div>
  );
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <div style={{ maxWidth: 520 }}>
          <p className="s-micro text-[color:var(--specimen)] mb-2.5">One last step</p>
          <h1 className="s-h1 mb-5" style={{ fontSize: 44 }}>Finish your <em>account.</em></h1>
          <p className="text-[15px] text-[color:var(--ink-soft)] mb-5">New accounts save <b className="text-[color:var(--specimen)]">{OFFER_PCT_TEXT}</b> on a first order placed within {OFFER_DAYS_TEXT}.</p>
          {/* "Not you?" is its own form, outside the finish form (never nested). */}
          <div className="s-finish-who">
            <GoogleMark />
            <span className="s-finish-who-text">Signed in with Google as <b>{user.email}</b></span>
            <form action={signOutToSignInAction}><button type="submit">Not you?</button></form>
          </div>
          <FinishAccountForm next={next} suggestedName={user.suggestedName} />
        </div>
      </div>
    </div>
  );
}
