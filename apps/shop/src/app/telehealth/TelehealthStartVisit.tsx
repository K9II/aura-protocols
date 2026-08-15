"use client";

import { useState, type FormEvent } from "react";
import { categoryLabel } from "@/lib/telehealth/config";

type Props = {
  category: string;
  productId: string;
  /** Channel sub-account id (from utm_source) carried into the hand-off for attribution. */
  sub?: number;
  /** Injectable for tests; defaults to a full-page navigation so the browser
   *  follows the /go route's 302 out to the hosted intake. */
  navigate?: (url: string) => void;
};

export default function TelehealthStartVisit({ category, productId, sub, navigate }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const goUrl = `/telehealth/go/${category}/${productId}${sub ? `?sub=${sub}` : ""}`;
  const go = navigate ?? ((url: string) => { window.location.href = url; });
  const label = categoryLabel(category);

  async function handleContinue(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Best-effort capture — a save failure must never block the visit.
    try {
      await fetch("/api/telehealth/optin", {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-btn-primary text-xs py-2 px-4"
      >
        Start visit
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="pharmacopoeia w-full max-w-sm rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Save your ${label} match`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--specimen)] font-semibold">
              Before your visit
            </p>
            <h3 className="p-serif text-xl text-[color:var(--ink)] mt-1 mb-2">
              Save your {label} match to Aura
            </h3>
            <p className="text-sm text-[color:var(--ink-soft)] mb-4">
              We&apos;ll keep your protocol and check in on your progress — then connect you with a licensed clinician.
            </p>

            <form onSubmit={handleContinue}>
              <input
                type="email"
                required
                aria-label="Email address"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-sm border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-[color:var(--ink)]"
              />
              <button
                type="submit"
                disabled={submitting}
                className="p-btn-primary mt-3 w-full py-2.5 text-sm disabled:opacity-60"
              >
                {submitting ? "One moment…" : "Continue to my visit →"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => go(goUrl)}
              className="mt-3 block w-full text-center text-xs text-[color:var(--ink-faint)] hover:text-[color:var(--ink-soft)]"
            >
              Skip and continue
            </button>

            <p className="mt-4 text-[11px] leading-snug text-[color:var(--ink-faint)]">
              By continuing you agree to receive protocol updates from Aura and to our{" "}
              <a href="/privacy" className="underline">Privacy Policy</a>. Aura is a referral partner, not a
              medical provider &mdash; a licensed clinician reviews every request. Unsubscribe anytime.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
