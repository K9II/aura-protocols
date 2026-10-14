"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { letterStatusAction, subscribeLetterAction, type LetterStatus } from "@/app/letter-actions";

// "The Aura letter" (home, above the footer; mock "Option B · Engraved plate
// steps + journal masthead", approved 2026-10-14). Promotions, research
// updates, store news and lot releases — never pitched as lots only.

const CONTENTS: Array<[React.ReactNode, string]> = [
  ["Promotions & member pricing", "i"],
  ["Research updates", "ii"],
  [<>New compounds &amp; lot releases, <span key="c" className="s-letter-proof">with certificates</span></>, "iii"],
  ["Store news", "iv"],
];

const norm = (e: string) => e.trim().toLowerCase();

export default function AuraLetter() {
  const [status, setStatus] = useState<LetterStatus | null>(null);
  const [email, setEmail] = useState<string | null>(null); // null = untouched: shows the account email
  const [sentTo, setSentTo] = useState<string | null>(null); // a different address that was sent a confirm link
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    letterStatusAction().then((s) => { if (live) setStatus(s); }).catch(() => { if (live) setStatus(null); });
    return () => { live = false; };
  }, []);

  function submit(formData: FormData) {
    setError(null);
    setSentTo(null);
    startTransition(async () => {
      const r = await subscribeLetterAction(formData);
      if (!r.ok) { setError(r.message); return; }
      if (r.state === "check_inbox") { setSentTo(r.email); return; }
      const state = r.state;
      setStatus((s) => (s?.signedIn ? { ...s, state, verified: state === "confirmed" || s.verified } : s));
    });
  }

  const signedIn = status?.signedIn === true ? status : null;
  const value = email ?? signedIn?.email ?? "";
  // The account's own list state applies only while the box holds the account email.
  const isAccount = !!signedIn && norm(value) === norm(signedIn.email);
  const onList = isAccount && signedIn?.state === "confirmed";
  const waiting = isAccount && signedIn?.state === "pending" && !signedIn.verified;
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
                name="email" type="email" autoComplete="email" required
                value={value} placeholder="you@yourlab.org" disabled={!signedIn}
                onChange={(e) => { setEmail(e.target.value); setSentTo(null); setError(null); }}
              />
            </label>
            <p className="s-letter-hint">Your account email is filled in — change it to use another address.</p>
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
            {sentTo && <p className="s-letter-done" role="status"><b>Check {sentTo}.</b> We sent a link to confirm it — the address joins the list once it&apos;s clicked.</p>}
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
