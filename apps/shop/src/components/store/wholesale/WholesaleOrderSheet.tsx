"use client";

import { Fragment, useMemo, useState } from "react";
import HumanCheck from "@/components/account/HumanCheck";
import KitBox from "@/components/store/wholesale/KitBox";
import TierTable from "@/components/store/wholesale/TierTable";
import { startWholesaleCheckoutAction } from "@/app/wholesale/actions";
import { KIT_VIALS, MAX_KITS_PER_LINE, kitTitle, nextTier, priceWholesale, type KitSheetRow, type PricingSettings } from "@/lib/wholesale/rules";
import type { Rejection } from "@/lib/pricing";
import { usd } from "@/lib/html";
import MinimumKits from "@/components/store/wholesale/MinimumKits";

type Addr = { name: string; line1: string; line2: string; city: string; state: string; zip: string };

const key = (r: { slug: string; variantId: string }) => `${r.slug}/${r.variantId}`;
const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";

// Mock w4 (sheet) → w5 (checkout). Prices here are a preview; the server re-prices every order.
export default function WholesaleOrderSheet({ rows, pricing, cutoffLabel, ship, email }: {
  rows: KitSheetRow[]; pricing: PricingSettings; cutoffLabel: string;
  ship: { name: string; line1: string; line2: string | null; city: string; state: string; zip: string } | null; email: string;
}) {
  const [kits, setKits] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"sheet" | "checkout">("sheet");
  const [addr, setAddr] = useState<Addr>({
    name: ship?.name ?? "", line1: ship?.line1 ?? "", line2: ship?.line2 ?? "", city: ship?.city ?? "", state: ship?.state ?? "", zip: ship?.zip ?? "",
  });
  const [ruo, setRuo] = useState(false);
  const [humanToken, setHumanToken] = useState<string | null>(null);
  const [humanReset, setHumanReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<Rejection[]>([]);
  const verified = !!humanToken;

  const lines = useMemo(() => rows.filter((r) => (kits[key(r)] ?? 0) > 0).map((r) => ({ slug: r.slug, variantId: r.variantId, kits: kits[key(r)] })), [rows, kits]);
  const q = useMemo(() => priceWholesale(lines, rows, pricing), [lines, rows, pricing]);
  const next = nextTier(q.kits, pricing.tiers);
  const setN = (r: KitSheetRow, n: number) => setKits((k) => ({ ...k, [key(r)]: Math.min(MAX_KITS_PER_LINE, Math.max(0, n)) }));
  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const classes = [...new Set(rows.map((r) => r.chemicalClass))];

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    let leaving = false;
    try {
      const r = await startWholesaleCheckoutAction({ lines, ship: addr, ruoConfirmed: ruo, humanToken: humanToken ?? undefined });
      if (r.url) { leaving = true; window.location.assign(r.url); return; }
      setError(r.error ?? "Something went wrong — please try again.");
      setRejected(r.rejected ?? []);
      if (r.rejected?.length) setStep("sheet");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      // A human-check token works once: staying here means getting a fresh one.
      if (!leaving) { setBusy(false); setHumanReset((n) => n + 1); }
    }
  }

  const progress = q.belowMinimum
    ? { width: (q.kits / pricing.minKits) * 100, text: `${q.kitsToMinimum} more kit${q.kitsToMinimum === 1 ? "" : "s"} to reach the ${pricing.minKits}-kit minimum` }
    : next ? { width: (q.kits / (q.kits + next.kitsNeeded)) * 100, text: `${next.kitsNeeded} more kit${next.kitsNeeded === 1 ? "" : "s"} for ${next.pct}% off` }
    : { width: 100, text: "Top tier" };

  const summary = (
    <div className="s-ws-sum">
      <p className="s-micro">Your order</p>
      <p style={{ margin: "6px 0" }} data-testid="ws-count">{q.kits} kit{q.kits === 1 ? "" : "s"} · {q.kits * KIT_VIALS} vials{q.belowMinimum ? "" : ` · ${q.tier.pct}% off`}</p>
      {step === "sheet" && <>
        <div className="s-ws-bar"><i style={{ width: `${Math.min(100, progress.width)}%` }} /></div>
        <p className="s-ws-note" style={{ margin: "0 0 10px" }}>{progress.text}</p>
      </>}
      {q.items.map((i) => {
        const t = kitTitle(rows.find((r) => r.slug === i.compoundSlug && r.variantId === i.variantId) ?? { name: i.compoundName, designation: null });
        return <div key={key({ slug: i.compoundSlug, variantId: i.variantId })} className="s-ws-ln"><span>{t.title}{t.scientific ? ` (${t.scientific})` : ""} {i.strength} × {i.quantity}</span><span>{usd(i.lineTotalCents)}</span></div>;
      })}
      <div className="s-ws-ln t b"><span>Deposit today · {pricing.depositPct}%</span><span data-testid="ws-deposit">{usd(q.depositCents)}</span></div>
      <div className="s-ws-ln s"><span>Balance when your lot passes</span><span>{usd(q.balanceBeforeTaxCents)} + tax</span></div>
      <div className="s-ws-ln s"><span>Shipping</span><span>{q.shippingCents ? usd(q.shippingCents) : "Free"}</span></div>
      {step === "sheet"
        ? <button type="button" className="s-ws-btn" disabled={q.belowMinimum || rejected.length > 0} onClick={() => { setError(null); setStep("checkout"); }}>
            {q.belowMinimum ? `Minimum ${pricing.minKits} kits` : "Continue to checkout"}</button>
        : <>
            {verified && error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
            <button type="submit" className="s-ws-btn" disabled={!verified || !ruo || busy}>{busy ? "Starting secure payment…" : `Pay deposit ${usd(q.depositCents)} →`}</button>
          </>}
      <p className="s-ws-note" style={{ marginTop: 8 }}>Deposit refundable until {cutoffLabel}. Prices are final — no codes or offers.</p>
      {step === "checkout" && <p className="s-ws-ruo">For research use only · Not for human consumption · 21+</p>}
    </div>
  );

  if (step === "sheet") {
    return (
      <>
        <TierTable tiers={pricing.tiers} activePct={q.belowMinimum ? null : q.tier.pct} />
        <MinimumKits minKits={pricing.minKits} />
        {error && <p role="alert" className="mb-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        <div className="s-ws-grid">
          <table className="s-ws-sheet">
            <thead><tr><th /><th /><th>Compound</th><th className="s-ws-kp">Kit · {KIT_VIALS} vials</th><th>Kits</th></tr></thead>
            <tbody>
              {classes.map((c) => (
                <Fragment key={c}>
                  <tr className="grp"><td colSpan={5}><span className="s-ws-cls">— {c}</span></td></tr>
                  {rows.filter((r) => r.chemicalClass === c).map((r) => {
                    const n = kits[key(r)] ?? 0;
                    const t = kitTitle(r);
                    const unit = Math.round(r.priceUsd * 100 * KIT_VIALS * (1 - q.tier.pct / 100));
                    const flagged = rejected.some((x) => x.slug === r.slug && x.variantId === r.variantId);
                    const label = `${t.title} ${r.strength}`;
                    return (
                      <tr key={key(r)} className={n ? "on" : "off"}>
                        <td className="cbx"><input type="checkbox" className="s-ws-cb" checked={n > 0} aria-label={`Order ${label} kits`}
                          onChange={(e) => setN(r, e.target.checked ? 1 : 0)} /></td>
                        <td className="pic"><KitBox title={t.title} strength={r.strength} art={r.art} width={92} /></td>
                        <td>
                          <span className="s-ws-nm">{t.title}</span> <span className="s-ws-pv s-ws-inl">· {t.scientific ? `${t.scientific} · ` : ""}{r.strength}</span>
                          {/* phones (mock w8): strength and kit price on their own line */}
                          <span className="s-ws-kp-m s-ws-pv">{t.scientific ? `${t.scientific} · ` : ""}{r.strength} · {usd(unit)} kit</span>
                          {flagged && <span className="s-ws-pv" style={{ display: "block", color: "var(--specimen)" }}>No longer offered as a kit — remove it to continue.</span>}
                        </td>
                        <td className="s-ws-kp">{usd(unit)}<br /><span className="s-ws-pv">{usd(Math.round(unit / KIT_VIALS))} / vial</span></td>
                        <td>
                          <span className={n ? "s-ws-step" : "s-ws-step dis"}>
                            <button type="button" aria-label={`Remove a ${label} kit`} disabled={n === 0} onClick={() => { setN(r, n - 1); if (flagged && n === 1) setRejected((x) => x.filter((y) => key(y) !== key(r))); }}>−</button>
                            <span className="n" aria-live="polite">{n}</span>
                            <button type="button" aria-label={`Add a ${label} kit`} onClick={() => setN(r, n + 1)}>+</button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
          {summary}
        </div>
      </>
    );
  }

  return (
    <form onSubmit={pay} className="s-ws-grid">
      <div>
        <button type="button" className="p-link text-xs mb-3" onClick={() => setStep("sheet")}>← Edit kits</button>
        <div className={verified ? "s-human done" : "s-human"} aria-live="polite">
          {verified ? <p className="s-micro">✓ Verified</p> : (
            <>
              <p className="s-micro text-[color:var(--specimen)]">Step 1 · One moment</p>
              <h2 className="s-human-h">Confirming you are NOT an <em>Alien</em> — or even worse, a <em>bot.</em></h2>
            </>
          )}
          <HumanCheck onToken={setHumanToken} resetKey={humanReset} />
          {!verified && error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        </div>
        <fieldset disabled={!verified} aria-label="Shipping" className={verified ? "s-co-form" : "s-co-form s-co-locked"}>
          <p className="s-micro mb-3">Ship to</p>
          <label htmlFor="ws-name" className="s-micro block mb-1.5">Full name</label>
          <input id="ws-name" value={addr.name} onChange={set("name")} required autoComplete="shipping name" className={field} />
          <label htmlFor="ws-line1" className="s-micro block mb-1.5">Street address</label>
          <input id="ws-line1" value={addr.line1} onChange={set("line1")} required autoComplete="shipping address-line1" className={field} />
          <label htmlFor="ws-line2" className="s-micro block mb-1.5">Apt, suite (optional)</label>
          <input id="ws-line2" value={addr.line2} onChange={set("line2")} autoComplete="shipping address-line2" className={field} />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
            <div><label htmlFor="ws-city" className="s-micro block mb-1.5">City</label><input id="ws-city" value={addr.city} onChange={set("city")} required autoComplete="shipping address-level2" className={field} /></div>
            <div><label htmlFor="ws-state" className="s-micro block mb-1.5">State</label><input id="ws-state" value={addr.state} onChange={set("state")} maxLength={2} required autoComplete="shipping address-level1" className={field} /></div>
            <div><label htmlFor="ws-zip" className="s-micro block mb-1.5">ZIP</label><input id="ws-zip" value={addr.zip} onChange={set("zip")} required autoComplete="shipping postal-code" className={field} /></div>
          </div>
          <p className="text-[12.5px] text-[color:var(--ink-soft)] mb-4">US addresses only. Signed in as {email}.</p>
          <label className="s-chk"><input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} /><span>I confirm these compounds are for <b>laboratory research use only</b> and not for human or animal consumption.</span></label>
        </fieldset>
      </div>
      {summary}
    </form>
  );
}
