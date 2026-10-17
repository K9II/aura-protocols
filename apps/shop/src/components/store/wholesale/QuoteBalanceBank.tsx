"use client";

// Balance due on a quote order the customer can pay by bank transfer: the
// bank details with the order number as the reference, and "I've sent it".
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markTransferSentAction } from "@/app/order/quote-actions";
import { usd } from "@/lib/html";

export default function QuoteBalanceBank({ orderNumber, amountCents, bank, transferSent }: {
  orderNumber: string; amountCents: number; transferSent: boolean;
  bank: { accountName: string; bankName: string; routing: string; account: string; note: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (k: string, t: string) => { try { await navigator.clipboard.writeText(t); setCopied(k); setTimeout(() => setCopied(null), 1400); } catch { /* select the text instead */ } };
  const sent = async () => {
    setBusy(true); setError(null);
    try { const r = await markTransferSentAction(orderNumber); if (r.error) setError(r.error); else router.refresh(); } finally { setBusy(false); }
  };
  const row = (k: string, label: string, value: string, copyText?: string, ref?: boolean) => (
    <div className={ref ? "ref" : undefined}><dt>{label}</dt><dd>{value}</dd>{copyText ? <button type="button" onClick={() => copy(k, copyText)}>{copied === k ? "Copied" : "Copy"}</button> : <span />}</div>
  );
  return (
    <div style={{ marginBottom: 14 }}>
      <p className="s-micro" style={{ margin: "10px 0 0" }}>Pay by bank transfer</p>
      <dl className="s-qp-bank">
        {row("name", "Account name", bank.accountName)}
        {row("bank", "Bank", bank.bankName)}
        {row("routing", "Routing number", bank.routing, bank.routing)}
        {row("account", "Account number", bank.account, bank.account)}
        {row("amount", "Amount", usd(amountCents), (amountCents / 100).toFixed(2))}
        {row("ref", "Reference (required)", orderNumber, orderNumber, true)}
      </dl>
      {bank.note && <p className="s-ws-note">{bank.note}</p>}
      {transferSent
        ? <p className="s-qp-done">Thanks — we&apos;re watching for your transfer. We&apos;ll email a receipt when it arrives.</p>
        : <button type="button" className="s-ws-btn-o" style={{ marginTop: 12 }} disabled={busy} onClick={sent}>{busy ? "One moment…" : "I've sent the transfer"}</button>}
      {error && <p role="alert" className="mt-2 text-sm text-[color:var(--specimen)]">{error}</p>}
    </div>
  );
}
