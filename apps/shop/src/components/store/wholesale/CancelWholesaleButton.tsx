"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelWholesaleOrderAction } from "@/app/wholesale/actions";

// Mock w6: shown only until the order-by date.
// failedLot: a strength in the order failed testing (mock b2) — the buyer may
// cancel after the cutoff for a full deposit refund.
export default function CancelWholesaleButton({ orderNumber, cutoffLabel, depositLabel, failedLot = false }: { orderNumber: string; cutoffLabel: string; depositLabel: string; failedLot?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function cancel() {
    if (!window.confirm(`Cancel order ${orderNumber}? Your deposit of ${depositLabel} will be refunded to the way you paid.`)) return;
    setBusy(true); setError(null);
    try {
      const r = await cancelWholesaleOrderAction(orderNumber);
      if (r.ok) { router.refresh(); return; }
      setError(r.error ?? "Something went wrong — please try again.");
    } catch {
      setError("Something went wrong — please try again.");
    } finally { setBusy(false); }
  }
  return (
    <div style={{ marginTop: 20 }}>
      <button type="button" onClick={cancel} disabled={busy} className="s-ws-btn-o">{busy ? "Cancelling…" : failedLot ? "Cancel for a full refund" : "Cancel order"}</button>
      <p className="s-ws-note mt-2">{failedLot ? <>Your deposit of {depositLabel} goes back to the way you paid.</> : <>Full deposit refund until {cutoffLabel}. After that the deposit is kept unless your lot fails testing.</>}</p>
      {error && <p role="alert" className="mt-2 text-sm text-[color:var(--specimen)]">{error}</p>}
    </div>
  );
}
