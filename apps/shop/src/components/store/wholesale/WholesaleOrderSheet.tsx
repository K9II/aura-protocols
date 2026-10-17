"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CLASS_COLOR } from "@/lib/class-colors";
import type { ChemicalClass } from "@/data/catalog";
import HumanCheck from "@/components/account/HumanCheck";
import Vial from "@/components/store/Vial";
import TierTable from "@/components/store/wholesale/TierTable";
import TrustRow from "@/components/store/TrustRow";
import QuoteRequested, { type RequestedKit } from "@/components/store/wholesale/QuoteRequested";
import { startWholesaleCheckoutAction } from "@/app/wholesale/actions";
import { KIT_VIALS, MAX_KITS_PER_LINE, VOLUME_QUOTE_ANCHOR, VOLUME_QUOTE_EVENT, VOLUME_QUOTE_MIN_KITS, VOLUME_QUOTE_SENT_EVENT, kitTitle, nextTier, priceWholesale, volumeNudge, volumeQuoteMessage, type KitSheetRow, type PricingSettings, type Tier } from "@/lib/wholesale/rules";
import { PROTECTION_LABEL } from "@/lib/shipping-protection";
import type { Rejection } from "@/lib/pricing";
import { usd } from "@/lib/html";

type Addr = { name: string; line1: string; line2: string; city: string; state: string; zip: string };

const key = (r: { slug: string; variantId: string }) => `${r.slug}/${r.variantId}`;
const clsVar = (c: string) => ({ "--cls": CLASS_COLOR[c as ChemicalClass] ?? "var(--ink)" }) as CSSProperties;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// Order sheet → checkout, ported from the approved mock "Wholesale Order Sheet Refresh"
// (Option A + checkout step, 2026-10-16). Prices here are a preview; the server re-prices every order.
export default function WholesaleOrderSheet({ rows, pricing, cutoffLabel, nextCutoffLabel, ship, email }: {
  rows: KitSheetRow[]; pricing: PricingSettings; cutoffLabel: string; nextCutoffLabel: string;
  ship: { name: string; line1: string; line2: string | null; city: string; state: string; zip: string } | null; email: string;
}) {
  const [kits, setKits] = useState<Record<string, number>>({});
  // What the buyer is typing in a kit count box, until they leave it (an empty box mid-edit
  // mustn't flip the row back to "Add kit").
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [cls, setCls] = useState<string | null>(null);   // class filter (Alvester: less scrolling); kits in other classes stay in the order
  const [step, setStep] = useState<"sheet" | "checkout" | "quoted">("sheet");
  // The request handed to the inquiry form, and — once it's sent unchanged — "Quote requested".
  type Asked = { message: string; kits: Record<string, number>; items: RequestedKit[]; tier: Tier };
  const asked = useRef<Asked | null>(null);
  const [quoted, setQuoted] = useState<(Asked & { ref: string | null; firstName: string }) | null>(null);
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
  const nudge = volumeNudge(q.kits);
  const setN = (r: KitSheetRow, n: number) => setKits((k) => ({ ...k, [key(r)]: Math.min(MAX_KITS_PER_LINE, Math.max(0, n)) }));
  const set = (k: keyof Addr) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const classes = [...new Set(rows.map((r) => r.chemicalClass))];
  const rowOf = (i: { compoundSlug: string; variantId: string }) => rows.find((r) => r.slug === i.compoundSlug && r.variantId === i.variantId);

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
    : nudge?.kind === "near" ? { width: (q.kits / VOLUME_QUOTE_MIN_KITS) * 100, text: `${nudge.kitsNeeded} more kit${nudge.kitsNeeded === 1 ? "" : "s"} and you can ask for a volume quote` }
    : { width: 100, text: "Top tier" };
  // Hands the sheet to the inquiry form below (the buyer reviews it and presses Send).
  const askForQuote = () => {
    const message = volumeQuoteMessage(q.items);
    asked.current = {
      message, kits: { ...kits }, tier: q.tier,
      items: q.items.map((i) => ({ key: key({ slug: i.compoundSlug, variantId: i.variantId }), chemicalClass: i.chemicalClass, strength: i.strength, kits: i.quantity,
        ...kitTitle(rowOf(i) ?? { name: i.compoundName, designation: null }) })),
    };
    window.dispatchEvent(new CustomEvent(VOLUME_QUOTE_EVENT, { detail: message }));
  };
  // Sent as handed over → the sheet is cleared and "Quote requested" takes its place. An edited
  // message (other kits, a custom compound) only gets the form's own thank-you line.
  useEffect(() => {
    const norm = (t: string) => t.replace(/\r\n/g, "\n").trim();
    const onSent = (e: Event) => {
      const d = (e as CustomEvent<{ ref: string | null; name: string; message: string }>).detail;
      const a = asked.current;
      if (!a || !d || norm(d.message) !== norm(a.message)) return;
      setQuoted({ ...a, ref: d.ref, firstName: d.name.trim().split(/\s+/)[0] ?? "" });
      setKits({}); setDraft({}); setRejected([]); setError(null);
      setStep("quoted");
      window.scrollTo?.({ top: 0 });
    };
    window.addEventListener(VOLUME_QUOTE_SENT_EVENT, onSent);
    return () => window.removeEventListener(VOLUME_QUOTE_SENT_EVENT, onSent);
  }, []);
  const orderNow = () => {
    if (quoted) setKits(quoted.kits);
    asked.current = null; setQuoted(null); setStep("sheet");
    window.scrollTo?.({ top: 0 });
  };
  const toCheckout = () => { setError(null); setStep("checkout"); window.scrollTo?.({ top: 0 }); };
  const payLabel = busy ? "Starting secure payment…" : !verified ? "Complete the human check" : !ruo ? "Confirm research use" : `Pay deposit ${usd(q.depositCents)} →`;

  const totals = (
    <>
      <div className="s-wo-tot">
        <div><span>Kits{q.belowMinimum ? "" : ` · ${q.tier.pct}% off`}</span><span>{usd(q.subtotalCents)}</span></div>
        <div><span>Shipping</span><span>{q.shippingCents ? usd(q.shippingCents) : "Free"}</span></div>
        {q.insuranceCents > 0 && <div><span>{PROTECTION_LABEL}</span><span>{usd(q.insuranceCents)}</span></div>}
        <div className="s-wo-total"><span className="s-micro">Total before tax</span><b>{usd(q.totalBeforeTaxCents)}</b></div>
      </div>
      <div className="s-wo-dep">
        <div><b>Deposit today · {pricing.depositPct}%</b><b data-testid="ws-deposit">{usd(q.depositCents)}</b></div>
        <div className="s"><span>Balance when your lot passes</span><span>{usd(q.balanceBeforeTaxCents)} + tax</span></div>
      </div>
    </>
  );

  if (step === "quoted" && quoted) {
    return <QuoteRequested inquiryRef={quoted.ref} firstName={quoted.firstName} email={email} items={quoted.items} tier={quoted.tier}
      depositPct={pricing.depositPct} cutoffLabel={cutoffLabel} nextCutoffLabel={nextCutoffLabel} onOrderNow={orderNow} />;
  }

  if (step === "sheet") {
    return (
      <>
        <TierTable tiers={pricing.tiers} activePct={q.belowMinimum ? null : q.tier.pct} quoteActive={q.kits >= VOLUME_QUOTE_MIN_KITS} />
        {error && <p role="alert" className="mb-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        <div className={q.kits >= VOLUME_QUOTE_MIN_KITS ? "s-ws-grid s-wo-grid s-wo-q" : "s-ws-grid s-wo-grid"}>
          <div className="s-wo-list">
            <div className="s-kc-pills s-wo-pills" role="group" aria-label="Show kits by class">
              <button type="button" aria-pressed={cls === null} onClick={() => setCls(null)}>All {rows.length}</button>
              {classes.map((c) => (
                <button key={c} type="button" aria-pressed={cls === c} onClick={() => setCls(c)} style={clsVar(c)}><i />{c}</button>
              ))}
            </div>
            {classes.filter((c) => cls === null || c === cls).map((c) => (
              <section key={c} className="s-wo-panel" style={clsVar(c)} aria-label={c}>
                <p className="s-wo-cls"><i />{c}</p>
                {rows.filter((r) => r.chemicalClass === c).map((r) => {
                  const n = kits[key(r)] ?? 0;
                  const t = kitTitle(r);
                  const unit = Math.round(r.priceUsd * 100 * KIT_VIALS * (1 - q.tier.pct / 100));
                  const flagged = rejected.some((x) => x.slug === r.slug && x.variantId === r.variantId);
                  const label = `${t.title} ${r.strength}`;
                  const vl = r.art.vialLines ?? [r.art.vialLabel];
                  return (
                    <div key={key(r)} className={n ? "s-wo-row on" : "s-wo-row"}>
                      <div className="s-wo-pic" aria-hidden="true">
                        <Vial id={`ws-${r.slug}-${r.variantId}`} label={vl[0]} label2={vl[1]} cap={r.art.cap} rule={CLASS_COLOR[r.chemicalClass as ChemicalClass]} parts={r.art.parts} strength={r.strength} tilt={0} width={70} />
                      </div>
                      <div className="s-wo-txt">
                        <span className="s-ws-nm">{t.title}</span>
                        <span className="s-wo-sub">{t.scientific ? `${t.scientific} · ` : ""}{r.strength} · {KIT_VIALS} vials</span>
                        {flagged && <span className="s-wo-sub" style={{ color: "var(--specimen)" }}>No longer offered as a kit — remove it to continue.</span>}
                      </div>
                      <div className="s-wo-kp">{usd(unit)} <span>kit</span><small>{usd(Math.round(unit / KIT_VIALS))} / vial</small></div>
                      <div className="s-wo-ctl">
                        {n === 0 && draft[key(r)] === undefined
                          ? <button type="button" className="s-wo-add" aria-label={`Add a ${label} kit`} onClick={() => setN(r, 1)}>+ Add kit</button>
                          : <>
                              <span className="s-wo-step">
                                <button type="button" aria-label={`Remove a ${label} kit`} onClick={() => { setN(r, n - 1); if (flagged && n === 1) setRejected((x) => x.filter((y) => key(y) !== key(r))); }}>−</button>
                                <input className="n" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} aria-label={`${label} kits`}
                                  value={draft[key(r)] ?? String(n)}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "");
                                    setDraft((d) => ({ ...d, [key(r)]: v }));
                                    if (v !== "") setN(r, Number(v));
                                  }}
                                  onBlur={() => {
                                    if (draft[key(r)] === "") setN(r, 0);
                                    setDraft((d) => { const c = { ...d }; delete c[key(r)]; return c; });
                                  }}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                                <button type="button" aria-label={`Add a ${label} kit`} onClick={() => setN(r, n + 1)}>+</button>
                              </span>
                              <span className="s-wo-sub">Line {usd(unit * n)}</span>
                            </>}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
          <aside className="s-wo-side" id="ws-summary">
            <div className={q.belowMinimum ? "s-wo-sum" : "s-wo-sum ok"}>
              <p className="s-micro">Your order</p>
              <p className="s-wo-count" data-testid="ws-count">{q.kits} kit{q.kits === 1 ? "" : "s"} · {q.kits * KIT_VIALS} vials{q.belowMinimum ? "" : ` · ${q.tier.pct}% off`}</p>
              <div className={q.belowMinimum ? "s-wo-bar" : "s-wo-bar ok"}><i style={{ width: `${Math.min(100, progress.width)}%` }} /></div>
              <p className="s-wo-prog">{progress.text}</p>
              {nudge?.kind === "quote" && (
                <div className="s-ws-vq" data-testid="ws-volume-quote">
                  <span className="s-micro" style={{ color: "var(--specimen)" }}>{VOLUME_QUOTE_MIN_KITS}+ kits</span>
                  <b>This order qualifies for a volume quote.</b>
                  <span className="s-ws-note">Send it to us as it stands and we&apos;ll reply with prices for these kits before you pay anything.</span>
                  <a href={`#${VOLUME_QUOTE_ANCHOR}`} onClick={askForQuote}>Ask for a volume quote →</a>
                </div>
              )}
              <div className="s-wo-lines">
                {q.items.length === 0 && <p className="s-wo-sub">No kits yet — add kits from the list.</p>}
                {q.items.map((i) => {
                  const r = rowOf(i);
                  const t = kitTitle(r ?? { name: i.compoundName, designation: null });
                  return <div key={key({ slug: i.compoundSlug, variantId: i.variantId })} style={clsVar(i.chemicalClass)}><span><i />{t.title} {i.strength} × {i.quantity}</span><span>{usd(i.lineTotalCents)}</span></div>;
                })}
              </div>
              {totals}
              <button type="button" className="s-ws-btn" disabled={q.belowMinimum || rejected.length > 0} onClick={toCheckout}>
                {q.belowMinimum ? `Minimum ${pricing.minKits} kits` : "Continue to checkout"}</button>
              <p className="s-wo-note">Deposit refundable until {cutoffLabel}. Prices are final — no codes or offers.</p>
            </div>
            <TrustRow className="s-trust--co" only={["usa", "coa"]} />
          </aside>
        </div>
        {/* phones: the summary sits below the list, so a bar keeps the count and the way on in view */}
        <div className="s-wo-mbar" aria-hidden="true">
          <div><span className="s-micro">{plural(q.kits, "kit")}{q.belowMinimum ? ` · min ${pricing.minKits}` : ` · ${q.tier.pct}% off`}</span><span>Deposit <b>{usd(q.depositCents)}</b></span></div>
          <button type="button" tabIndex={-1} disabled={q.belowMinimum || rejected.length > 0} onClick={toCheckout}>{q.belowMinimum ? `Min ${pricing.minKits} kits` : "Checkout →"}</button>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={pay} className="s-ws-grid s-wo-grid s-wo-co">
      <header className="s-wo-cohd">
        <p className="s-micro s-eyebrow">Wholesale · Checkout</p>
        <h1 className="s-h1">Ship and pay your <em>deposit.</em></h1>
      </header>
      <div className="s-wo-list">
        <button type="button" className="s-wo-back" onClick={() => setStep("sheet")}>← Edit kits</button>
        <div className={verified ? "s-human done" : "s-human"} aria-live="polite">
          {verified ? <><p className="s-micro">✓ Verified human</p><p className="s-human-ok">Check passed. It protects our checkout from automated card testing.</p></> : (
            <>
              <p className="s-micro text-[color:var(--specimen)]">Step 1 · One moment</p>
              <h2 className="s-human-h">Confirming you are NOT an <em>Alien</em> — or even worse, a <em>bot.</em></h2>
            </>
          )}
          <HumanCheck onToken={setHumanToken} resetKey={humanReset} />
          {!verified && error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
        </div>
        <fieldset disabled={!verified} aria-label="Shipping" className={verified ? "s-co-form" : "s-co-form s-co-locked"}>
          <div className="s-co-panel">
            <p className="s-micro mb-3">{verified ? "" : "Step 2 · "}Ship to</p>
            <label htmlFor="ws-name" className="s-micro block mb-1.5">Full name</label>
            <input id="ws-name" value={addr.name} onChange={set("name")} required autoComplete="shipping name" className="s-wo-in" />
            <label htmlFor="ws-line1" className="s-micro block mb-1.5">Street address</label>
            <input id="ws-line1" value={addr.line1} onChange={set("line1")} required autoComplete="shipping address-line1" className="s-wo-in" />
            <label htmlFor="ws-line2" className="s-micro block mb-1.5">Apt, suite (optional)</label>
            <input id="ws-line2" value={addr.line2} onChange={set("line2")} autoComplete="shipping address-line2" className="s-wo-in" />
            <div className="s-wo-csz">
              <div><label htmlFor="ws-city" className="s-micro block mb-1.5">City</label><input id="ws-city" value={addr.city} onChange={set("city")} required autoComplete="shipping address-level2" className="s-wo-in" /></div>
              <div><label htmlFor="ws-state" className="s-micro block mb-1.5">State</label><input id="ws-state" value={addr.state} onChange={set("state")} maxLength={2} required autoComplete="shipping address-level1" className="s-wo-in" /></div>
              <div><label htmlFor="ws-zip" className="s-micro block mb-1.5">ZIP</label><input id="ws-zip" value={addr.zip} onChange={set("zip")} required autoComplete="shipping postal-code" className="s-wo-in" /></div>
            </div>
            <p className="s-wo-sub">US addresses only. Signed in as {email}.</p>
          </div>
          <div className="s-co-panel">
            <p className="s-micro mb-3">Research use</p>
            <label className="s-chk s-wo-ruo"><input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} /><span>I confirm these compounds are for <b>laboratory research use only</b> and not for human or animal consumption.</span></label>
          </div>
        </fieldset>
      </div>
      <aside className="s-wo-side">
        <div className="s-wo-sum ok">
          <div className="s-wo-head"><p className="s-micro">Order summary</p><button type="button" className="s-wo-back" onClick={() => setStep("sheet")}>Edit kits</button></div>
          {q.items.map((i) => {
            const t = kitTitle(rowOf(i) ?? { name: i.compoundName, designation: null });
            return (
              <div key={key({ slug: i.compoundSlug, variantId: i.variantId })} className="s-co-item" style={clsVar(i.chemicalClass)}>
                <span className="s-co-cls"><i />{i.chemicalClass}</span>
                <span className="s-co-name">{t.title}</span>
                <span>{usd(i.lineTotalCents)}</span>
                <span className="s-micro text-[color:var(--ink-soft)]" style={{ gridColumn: "1 / -1" }}>{t.scientific ? `${t.scientific} · ` : ""}{i.strength} · {plural(i.quantity, "kit")} · {i.quantity * KIT_VIALS} vials</span>
              </div>
            );
          })}
          <p className="s-co-lot s-wo-lot">Made and tested as one lot · its certificate ships with your kits</p>
          {totals}
          {verified && error && <p role="alert" className="mt-3 text-sm text-[color:var(--specimen)]">{error}</p>}
          <button type="submit" className="s-ws-btn" disabled={!verified || !ruo || busy}>{payLabel}</button>
          <p className="s-wo-note">Deposit refundable until {cutoffLabel}. Prices are final — no codes or offers.</p>
          <p className="s-micro s-ruo">For research use only · Not for human consumption · 21+</p>
        </div>
        <TrustRow className="s-trust--co" only={["usa", "coa"]} />
      </aside>
    </form>
  );
}
