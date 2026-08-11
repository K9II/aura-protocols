"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type Props = {
  category: string;
  productId: string;
  /** Lane label, used for the modal heading and the button's accessible name. */
  label: string;
  /** Channel sub-account id (from utm_source) carried into the hand-off for attribution. */
  sub?: number;
  className?: string;
  children: ReactNode;
  /** Injectable for tests; defaults to a full-page navigation so the browser
   *  follows the /go route's 302 out to the hosted intake. */
  navigate?: (url: string) => void;
};

export default function StartVisit({ category, productId, label, sub, className, children, navigate }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goUrl = `/go/${category}/${productId}${sub ? `?sub=${sub}` : ""}`;
  const go = navigate ?? ((url: string) => { window.location.href = url; });

  async function handleContinue(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Best-effort capture — a save failure must never block the visit.
    try {
      await fetch("/api/optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category }),
      });
    } catch {
      // swallow — proceed to the hand-off regardless
    }
    go(goUrl);
  }

  return (
    <>
      <button type="button" className={className} aria-label={`Start a visit for ${label}`} onClick={() => setOpen(true)}>
        {children}
      </button>

      {open && (
        <div className="m-scrim" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="m-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Save your ${label} match`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mtag">Before your visit</p>
            <h2>Save your {label} match</h2>
            <p>We&apos;ll keep your protocol and check in on your progress — then connect you with a licensed clinician.</p>

            <form onSubmit={handleContinue}>
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? "One moment…" : "Continue to my visit →"}
              </button>
            </form>

            <button type="button" className="skip" onClick={() => go(goUrl)}>
              Skip and continue
            </button>

            <p className="fine">
              By continuing you agree to receive protocol updates from Modality. Modality is a referral
              partner, not a medical provider — a licensed clinician reviews every request. See our{" "}
              <a href="/disclosures">telehealth disclosures</a>. Unsubscribe anytime.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
