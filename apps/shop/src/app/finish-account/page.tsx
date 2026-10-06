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
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16">
        <div style={{ maxWidth: 520 }}>
          <p className="s-micro text-[color:var(--specimen)] mb-2.5">One last step</p>
          <h1 className="s-h1 mb-5" style={{ fontSize: 44 }}>Finish your <em>account.</em></h1>
          <p className="text-[15px] text-[color:var(--ink-soft)] mb-5">New accounts save <b className="text-[color:var(--specimen)]">{OFFER_PCT_TEXT}</b> on a first order placed within {OFFER_DAYS_TEXT}.</p>
          {/* "Not you?" is its own form, outside the finish form (never nested). */}
          <div className="s-finish-who">
            {user.viaGoogle && <GoogleMark />}
            <span className="s-finish-who-text">{user.viaGoogle ? "Signed in with Google as " : "Signed in as "}<b>{user.email}</b></span>
            <form action={signOutToSignInAction}><button type="submit">Not you?</button></form>
          </div>
          <FinishAccountForm next={next} suggestedName={user.suggestedName} viaGoogle={user.viaGoogle} />
        </div>
      </div>
    </div>
  );
}
