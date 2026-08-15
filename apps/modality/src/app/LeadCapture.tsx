"use client";

import { useState, type FormEvent } from "react";

// Email capture for the "not ready yet" band. Reuses the same /api/optin
// endpoint as the visit flow, tagged category "guide" so these leads are
// distinguishable from in-funnel opt-ins. Best-effort: a save failure still
// shows the confirmation so we never trap the user on an error.
export default function LeadCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    try {
      await fetch("/api/optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, category: "guide" }),
      });
    } catch {
      // swallow — confirm regardless
    }
    setState("done");
  }

  return (
    <div className="capture">
      <div>
        <p className="sec-k">Not ready yet?</p>
        <div className="ct">Join the list for a plain-English guide to compounded care.</div>
      </div>

      {state === "done" ? (
        <p className="done">Thanks — you&apos;re on the list. ✓</p>
      ) : (
        <form onSubmit={submit}>
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
            {state === "saving" ? "One moment…" : "Send it →"}
          </button>
        </form>
      )}

      <p className="fine">
        By subscribing you agree to receive emails from Modality. Modality is a referral partner, not a
        medical provider. Unsubscribe anytime.
      </p>
    </div>
  );
}
