"use client";

import "./account-gate.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isCrawler, isGateExempt } from "@/lib/gate-shared";
import { FOCUSABLE_SELECTOR, useFocusTrap } from "@/components/store/useFocusTrap";
import GateCarousel from "./GateCarousel";
import GateSteps, { TITLE_ID, type Step } from "./GateSteps";

type Status = "unknown" | "anon" | "ok" | "verify";
type Phase = "off" | "mounted" | "in" | "rv";
type Scenes = typeof import("./scenes.generated");

const ENTER_AFTER_MS = 3500;   // owner (2026-10-04): 3.5 s on desktop and phone, so the page registers first
const REVEAL_DESK_MS = ENTER_AFTER_MS + 500;   // form column fades up once the 1.2 s slide is under way (mock: +0.5 s)
const REVEAL_PHONE_MS = ENTER_AFTER_MS + 400;  // mock: +0.4 s
const media = (q: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(q).matches;

function useDesktop(): boolean {
  const [desk, setDesk] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setDesk(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desk;
}

// Oath-style account gate over every page (spec 2026-10-04-account-gate-design).
// The page underneath stays server-rendered (crawlable); this overlay is
// display only — checkout and account pages authorize in lib/dal.ts.
export default function AccountGate() {
  const pathname = usePathname();
  const exempt = isGateExempt(pathname);
  const desktop = useDesktop();
  const desktopRef = useRef(desktop);
  useEffect(() => { desktopRef.current = desktop; }, [desktop]);
  const [status, setStatus] = useState<Status>("unknown");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("1");
  const [scenes, setScenes] = useState<Scenes | null>(null);
  const [phase, setPhase] = useState<Phase>("off");
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);

  // Who is this? Asked once per page load. A failed check shows the gate (fail closed).
  useEffect(() => {
    let cancelled = false;
    let crawler = false;
    try { crawler = isCrawler(navigator.userAgent); } catch { crawler = false; }
    if (crawler) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- crawlers read the page under the gate
      setStatus("ok");
      return;
    }
    fetch("/api/me/gate", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { state: "anon" }))
      .then((d: { state?: string; email?: string }) => {
        if (cancelled) return;
        if (d.state === "ok") setStatus("ok");
        else if (d.state === "verify") { setEmail(d.email ?? ""); setStep("verify"); setStatus("verify"); }
        else setStatus("anon");
      })
      .catch(() => { if (!cancelled) setStatus("anon"); });
    return () => { cancelled = true; };
  }, []);

  const wanted = !exempt && (status === "anon" || status === "verify");

  // Entrance: mounted off-screen at once, enters at 3.5 s, form fades up after.
  useEffect(() => {
    if (!wanted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leaving to an exempt page hides it
      setPhase("off");
      return;
    }
    let cancelled = false;
    import("./scenes.generated").then((m) => { if (!cancelled) setScenes(m); }).catch(() => { /* art is decoration; the gate works without it */ });
    if (media("(prefers-reduced-motion: reduce)")) { setPhase("rv"); return () => { cancelled = true; }; }
    setPhase("mounted");
    const t1 = setTimeout(() => setPhase("in"), ENTER_AFTER_MS);
    const t2 = setTimeout(() => setPhase("rv"), desktopRef.current ? REVEAL_DESK_MS : REVEAL_PHONE_MS);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); };
  }, [wanted]);

  const shown = phase === "in" || phase === "rv";
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [shown]);
  // On reveal and on every step: the first field, else the first control in the
  // form column (the verify step has no field), else the dialog itself.
  useEffect(() => {
    if (phase !== "rv") return;
    const root = rootRef.current;
    if (!root) return;
    const col = root.querySelector<HTMLElement>(".a-col, .pc-body") ?? root;
    const target =
      col.querySelector<HTMLElement>("input:not([readonly])") ??
      col.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      root.querySelector<HTMLElement>('[role="dialog"]') ??
      root;
    target.focus({ preventScroll: true });
  }, [phase, step]);
  useEffect(() => { if (cardRef.current) cardRef.current.scrollTop = 0; }, [step]);
  useFocusTrap(rootRef, shown, { captureOutside: true });

  if (phase === "off") return null;
  const cls = `${shown ? " in" : ""}${phase === "rv" ? " rv" : ""}`;
  // Before it enters, the gate is off-screen/transparent: inert (no Tab stops) and not yet a modal dialog.
  const dialog = shown ? ({ role: "dialog", "aria-modal": true, "aria-labelledby": TITLE_ID, tabIndex: -1 } as const) : {};
  const steps = <GateSteps variant={desktop ? "a" : "pc"} step={step} email={email} onStep={setStep} onEmail={setEmail} onDone={() => window.location.reload()} />;

  if (desktop) {
    return (
      <div ref={rootRef} className={`ag ag-desk${cls}`} data-step={step} inert={!shown} {...dialog}>
        <div className="a">
          <GateCarousel scenes={scenes?.DESK_SCENES ?? null} running={shown} />
          <section className="a-side"><div className="a-col">{steps}</div></section>
        </div>
      </div>
    );
  }
  return (
    <div ref={rootRef} className={`ag ag-phone${cls}`} data-step={step} inert={!shown}>
      <div className="pc-dim" aria-hidden="true" />
      <div className="pc-stage">
        <section ref={cardRef} className="pc-card" {...dialog}>
          <div className="pc-strip">
            {scenes && <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: step === "1" ? scenes.PHONE_STRIP : scenes.PHONE_MINI }} />}
            {step === "1" && <span className="pc-dots" aria-hidden="true"><i className="on" /><i /><i /></span>}
          </div>
          {step === "1" && <div className="pc-cap"><b>Tested before it’s listed.</b><small>Every lot’s certificate is published under its lot number.</small></div>}
          <div className="pc-body">{steps}</div>
        </section>
      </div>
    </div>
  );
}
