"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuraLockup from "@/components/AuraLockup";
import { GATE_EXEMPT_PATHS, hasCurrentGateHint, isCrawler } from "@/lib/gate-shared";
import { useFocusTrap } from "@/components/store/useFocusTrap";


export default function EntryGate() {
  const [show, setShow] = useState(false);
  const [age21, setAge21] = useState(false);
  const [ruo, setRuo] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstCheckboxRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const isExemptPath = (GATE_EXEMPT_PATHS as readonly string[]).includes(pathname);

  useEffect(() => {
    if (isExemptPath) {
      // The gate links to these policy pages from its own checkbox copy —
      // it can never block the pages it asks a visitor to read.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      setShow(false);
      return;
    }
    // A broken cookie/UA read must never silently admit a visitor — fail
    // toward showing the gate rather than crashing or skipping it.
    let shouldShow = true;
    try {
      shouldShow = !(isCrawler(navigator.userAgent) || hasCurrentGateHint(document.cookie));
    } catch {
      shouldShow = true;
    }
    // Post-mount crawler/cookie check — must not run during SSR or the first
    // client render, so both stay gate-hidden and there is no hydration
    // mismatch. Re-runs on pathname changes (App Router keeps this component
    // mounted across navigations) so leaving an exempt page re-evaluates
    // whether the gate should now show.
    setShow(shouldShow);
  }, [pathname, isExemptPath]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    firstCheckboxRef.current?.focus();
  }, [show]);

  useFocusTrap(formRef, show);

  if (!show) return null;
  const ready = age21 && ruo && dispute && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ age21, ruo, disputePolicy: dispute }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setShow(false);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="s-gate-backdrop">
      <form
        ref={formRef}
        onSubmit={submit}
        // Stops the browser restoring ticked boxes on reload/back, which would
        // show checks the component's state doesn't have (Enter stays disabled).
        autoComplete="off"
        className="pharmacopoeia s-gate"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-eyebrow"
      >
        <AuraLockup size={60} mode="loop" />
        <p id="gate-eyebrow" className="s-micro text-[color:var(--specimen)] mt-6 mb-2.5">Research use only</p>
        <h2>Receipts, not <em>promises.</em></h2>
        <p className="text-sm text-[color:var(--ink-soft)] leading-relaxed mb-[18px]">
          To enter, confirm all three.
        </p>
        <label className="s-chk">
          <input ref={firstCheckboxRef} type="checkbox" checked={age21} onChange={(e) => setAge21(e.target.checked)} />
          <span>I confirm I am <b>21 years of age or older</b>.</span>
        </label>
        <label className="s-chk">
          <input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} />
          <span>I agree these products are <b>for research use only</b> — not for human or animal consumption, and not for medical, veterinary, or diagnostic use.</span>
        </label>
        <label className="s-chk">
          <input type="checkbox" checked={dispute} onChange={(e) => setDispute(e.target.checked)} />
          <span>
            I&apos;ve read the <Link href="/terms" target="_blank">Terms</Link> and <Link href="/refund-policy" target="_blank">Refund &amp; Dispute Policy</Link>, and will contact support before filing a payment dispute.
          </span>
        </label>
        {error && <p className="s-gate-error" role="alert">{error}</p>}
        <button type="submit" className="s-atc !mt-0" disabled={!ready}>{busy ? "Entering…" : "Enter site →"}</button>
        <a href="https://www.google.com" className="block text-center my-3 text-[12.5px] underline text-[color:var(--ink-soft)]">I&apos;m under 21 — leave</a>
        <p className="border-t border-[color:var(--line)] pt-3 text-[11px] leading-normal text-[color:var(--ink-soft)]">
          All products are sold for laboratory research use only. Not for human consumption, veterinary use, or medical applications. You must be 21 or older to purchase. Misuse is strictly prohibited.
        </p>
      </form>
    </div>
  );
}
