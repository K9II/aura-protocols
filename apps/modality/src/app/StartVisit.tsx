"use client";

import { useState, type FormEvent } from "react";

type Props = {
  category: string;
  productId: string;
  /** The specific chosen product's name — drives the modal heading. */
  label: string;
  /** Channel sub-account id (from utm_source) carried into the hand-off for attribution. */
  sub?: number;
  open: boolean;
  onClose: () => void;
  /** Injectable for tests; defaults to a full-page navigation so the browser
   *  follows the /go route's 302 out to the hosted intake. */
  navigate?: (url: string) => void;
};

export default function StartVisit({ category, productId, label, sub, open, onClose, navigate }: Props) {
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

  if (!open) return null;

  return (
    <div className="m-scrim" role="presentation" onClick={onClose}>
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
        <p className="hint">Interested in more than one? Your clinician can add other protocols during your visit.</p>

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

        <p className="fine">
          By continuing you agree to receive protocol updates from Modality. Modality is a referral
          partner, not a medical provider — a licensed clinician reviews every request. See our{" "}
          <a href="/disclosures">telehealth disclosures</a>. Unsubscribe anytime.
        </p>
      </div>
    </div>
  );
}
