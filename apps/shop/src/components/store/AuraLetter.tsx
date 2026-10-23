"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { letterStatusAction, subscribeLetterAction, type LetterStatus } from "@/app/letter-actions";

// "The Aura letter" (home, above the footer; mock "Option B · Engraved plate
// steps + journal masthead", approved 2026-10-14). Research updates, store
// news and lot releases — never pitched as lots only. The "Promotions &
// member pricing" line came off the list 2026-10-18; the consent still
// covers promotions. Only the account's own email joins (2026-10-23, single
// opt-in, no confirm email): to use another address, change the account email.

const CONTENTS: Array<[React.ReactNode, string]> = [
  ["Research updates", "i"],
  [<>New compounds &amp; lot releases, <span key="c" className="s-letter-proof">with certificates</span></>, "ii"],
  ["Research news", "iii"],
];

export default function AuraLetter() {
  const [status, setStatus] = useState<LetterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    letterStatusAction().then((s) => { if (live) setStatus(s); }).catch(() => { if (live) setStatus(null); });
    return () => { live = false; };
  }, []);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await subscribeLetterAction(formData);
      if (!r.ok) { setError(r.message); return; }
      const state = r.state;
      setStatus((s) => (s?.signedIn ? { ...s, state, verified: state === "confirmed" || s.verified } : s));
    });
  }

  const signedIn = status?.signedIn === true ? status : null;
  const onList = signedIn?.state === "confirmed";
  const waiting = signedIn?.state === "pending" && !signedIn.verified;
  return (
    <section className="s-letter p-reveal" aria-labelledby="aura-letter">
      <div className="s-letter-head">
        <p className="s-micro">Aura Protocols · by email</p>
        <h2 id="aura-letter" className="s-letter-title">THE AURA <em>Letter</em></h2>
        <div className="s-letter-rule" />
        <p className="s-micro s-letter-dek"><span>Issued when there&apos;s news</span><span>Free · No spam</span></p>
      </div>
      <div className="s-letter-body">
        <div>
          <p className="s-micro s-letter-k">In each letter</p>
          <ol className="s-letter-toc">
            {CONTENTS.map(([label, n]) => (
              <li key={n}><span>{label}</span><i aria-hidden /><b>{n}</b></li>
            ))}
          </ol>
        </div>
        <div className="s-letter-form">
          {/* Box: option B (label printed inside) in option C's colours — chosen 2026-10-14. */}
          <form action={submit}>
            <label className="s-letter-box">
              <span className="s-micro">Email address</span>
              <input
                type="email" readOnly
                value={signedIn?.email ?? ""} placeholder="you@yourlab.org" disabled={!signedIn}
              />
            </label>
            <p className="s-letter-hint">We send to your account email.</p>
            {onList ? (
              <p className="s-letter-done" role="status"><b>● You&apos;re on the list.</b> Promotions and updates go to this address. Unsubscribe from any email.</p>
            ) : waiting ? (
              <p className="s-letter-done" role="status"><b>Almost there.</b> Verify your email — the link is in your inbox — and you&apos;re on the list.</p>
            ) : (
              <label className="s-letter-consent">
                <input type="checkbox" name="consent" required disabled={!signedIn} />
                <span>Email me Aura Protocols promotions, research updates and new arrivals. I can unsubscribe at any time.</span>
              </label>
            )}
            {error && <p className="s-letter-err" role="alert">{error}</p>}
            {status && !status.signedIn ? (
              <Link href="/sign-in" className="s-letter-btn">Sign in to subscribe →</Link>
            ) : (
              <button type="submit" className="s-letter-btn" disabled={pending || !signedIn || onList || waiting}>
                {onList ? "Subscribed ✓" : waiting ? "Waiting on verification" : pending ? "Subscribing…" : "Subscribe →"}
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
