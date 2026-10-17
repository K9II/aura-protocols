"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelQuoteRequestAction, orderNowAtSheetPriceAction } from "@/app/order/quote-actions";

// The two ways a buyer closes a request that isn't priced yet. Cancel asks once,
// in the page (no browser dialog); Order now goes to the order sheet with the same kits.
export default function QuoteRequestActions({ orderNumber, sheetPct, sheetMinKits }: { orderNumber: string; sheetPct: number; sheetMinKits: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"cancel" | "order" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function orderNow() {
    setBusy("order"); setError(null);
    const r = await orderNowAtSheetPriceAction(orderNumber).catch(() => ({ error: "Something went wrong — please try again." }));
    if ("url" in r && r.url) { window.location.assign(r.url); return; }
    setError(r.error ?? "Something went wrong — please try again.");
    setBusy(null);
  }
  async function cancel() {
    setBusy("cancel"); setError(null);
    const r = await cancelQuoteRequestAction(orderNumber).catch(() => ({ error: "Something went wrong — please try again." }));
    if (r.error) { setError(r.error); setBusy(null); return; }
    router.refresh();
  }

  return (
    <>
      <div className="s-qr-alt">
        <p>Rather not wait? Order these kits now at the order-sheet price: {sheetPct}% off for {sheetMinKits}+ kits. This request closes and your kits go back on the order sheet.</p>
        <button type="button" className="s-qr-lnk" onClick={orderNow} disabled={busy !== null}>{busy === "order" ? "Opening the order sheet…" : <>Order now at the listed price&nbsp;→</>}</button>
      </div>
      <div className="s-qr-cancel">
        {confirming ? (
          <>
            <p>Cancel {orderNumber}? We won&apos;t price it. Nothing has been charged.</p>
            <div className="s-qr-cbtns">
              <button type="button" className="s-qr-lnk danger" onClick={cancel} disabled={busy !== null}>{busy === "cancel" ? "Cancelling…" : "Yes, cancel the request"}</button>
              <button type="button" className="s-qr-lnk" onClick={() => setConfirming(false)} disabled={busy !== null}>Keep it</button>
            </div>
          </>
        ) : (
          <p>Changed your mind? <button type="button" className="s-qr-lnk danger" onClick={() => setConfirming(true)}>Cancel this request</button><br />Nothing has been charged.</p>
        )}
      </div>
      {error && <p role="alert" className="s-qr-err">{error}</p>}
    </>
  );
}
