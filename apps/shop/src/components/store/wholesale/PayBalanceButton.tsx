"use client";

import { useState } from "react";
import { payBalanceAction } from "@/app/wholesale/actions";

// Order page (mock b1): a fresh Stripe page for the balance on every click.
export default function PayBalanceButton({ orderNumber, label }: { orderNumber: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    setBusy(true); setError(null);
    let leaving = false;
    try {
      const r = await payBalanceAction(orderNumber);
      if (r.url) { leaving = true; window.location.assign(r.url); return; }
      setError(r.error ?? "Something went wrong — please try again.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      if (!leaving) setBusy(false);
    }
  }
  return (
    <>
      <button type="button" className="s-ws-btn" onClick={pay} disabled={busy}>{busy ? "Starting secure payment…" : `Pay balance ${label} →`}</button>
      {error && <p role="alert" className="mt-2 text-sm text-[color:var(--specimen)]">{error}</p>}
    </>
  );
}
