"use client";

import "./account-gate.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isCrawler, isGateExempt } from "@/lib/gate-shared";
import { FOCUSABLE_SELECTOR, useFocusTrap } from "@/components/store/useFocusTrap";
import GateCarousel from "./GateCarousel";
import GateSteps, { TITLE_ID, type Step } from "./GateSteps";

type Status = "unknown" | "anon" | "ok" | "verify" | "closed" | "finish";
type Phase = "off" | "mounted" | "in" | "rv";
type Scenes = typeof import("./scenes.generated");

const ENTER_AFTER_MS = 3500;   // owner (2026-10-04): 3.5 s on desktop and phone, so the page registers first
const REVEAL_DESK_MS = ENTER_AFTER_MS + 1600; // form items float up midway through the slow 3.2 s fade
const KEYBOARD_MIN_PX = 120;    // visual viewport this much shorter than the window = keyboard open
const KEYBOARD_SETTLE_MS = 300; // the keyboard's slide-up
const FIELD_TOP_GAP_PX = 12;    // breathing room above a focused field
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

  // Who is this? Asked on every page change: the gate lives in the root layout and
  // survives client-side navigations (incl. sign-in/sign-out redirects), so a status
  // from an earlier page may be stale. A failed check shows the gate (fail closed).
  useEffect(() => {
    let cancelled = false;
    let crawler = false;
    try { crawler = isCrawler(navigator.userAgent); } catch { crawler = false; }
    if (crawler) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- crawlers read the page under the gate
      setStatus("ok");
      return;
    }
    setStatus("unknown");   // never act on the previous page's answer
    if (exempt) return;     // no gate here; the next non-exempt page checks again
    fetch("/api/me/gate", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { state: "anon" }))
      .then((d: { state?: string; email?: string }) => {
        if (cancelled) return;
        if (d.state === "ok") setStatus("ok");
        else if (d.state === "verify") { setEmail(d.email ?? ""); setStep("verify"); setStatus("verify"); }
        else if (d.state === "closed") { setStep("closed"); setStatus("closed"); }
        else if (d.state === "finish") {
          // Signed in with Google, account not finished: the gate stays up until the finish page loads.
          setStatus("finish");
          window.location.assign(`/finish-account?next=${encodeURIComponent(pathname)}`);
        }
        else { setStep((s) => (s === "verify" || s === "closed" ? "1" : s)); setStatus("anon"); }
      })
      .catch(() => { if (!cancelled) setStatus("anon"); });
    return () => { cancelled = true; };
  }, [pathname, exempt]);

  // While a re-check is in flight, a gate already on screen (or counting down) stays
  // as it is — no flicker; it closes if the answer is "ok". Nothing new opens on "unknown".
  const holding = status === "unknown" && phase !== "off";
  const wanted = !exempt && (status === "anon" || status === "verify" || status === "closed" || status === "finish" || holding);

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
    // On a phone, step 1 appears on its own: focusing the email field would pop
    // the keyboard over the card before the visitor has read it.
    const phoneStart = !desktopRef.current && step === "1";
    const target =
      (phoneStart ? root.querySelector<HTMLElement>('[role="dialog"]') : null) ??
      col.querySelector<HTMLElement>('input:not([readonly]):not([type="hidden"])') ??
      col.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      root.querySelector<HTMLElement>('[role="dialog"]') ??
      root;
    target.focus({ preventScroll: true });
  }, [phase, step]);
  useEffect(() => { if (cardRef.current) cardRef.current.scrollTop = 0; }, [step]);
  useFocusTrap(rootRef, shown, { captureOutside: true });

  // Phone keyboard (Kearney 2026-10-04: fields must never sit under it). iOS
  // doesn't shrink the layout when the keyboard opens, so the card is sized
  // to the visual viewport (the part above the keyboard), pinned to its top,
  // and a focused field is scrolled to the top of the card.
  useEffect(() => {
    if (desktop || !shown) return;
    const root = rootRef.current, vv = window.visualViewport;
    if (!root || !vv) return;
    const fit = () => {
      root.style.setProperty("--ag-vh", `${vv.height}px`);
      root.style.setProperty("--ag-vt", `${vv.offsetTop}px`);
      root.classList.toggle("kb", window.innerHeight - vv.height > KEYBOARD_MIN_PX);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => { vv.removeEventListener("resize", fit); vv.removeEventListener("scroll", fit); };
  }, [desktop, shown]);
  useEffect(() => {
    const card = cardRef.current;
    if (desktop || !shown || !card) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el.tagName !== "INPUT" || (el as HTMLInputElement).type === "checkbox") return;
      clearTimeout(timer);
      // After the keyboard has slid up and the card has been resized.
      timer = setTimeout(() => {
        const field = el.closest<HTMLElement>(".fld") ?? el;
        const top = field.getBoundingClientRect().top - card.getBoundingClientRect().top + card.scrollTop - FIELD_TOP_GAP_PX;
        if (typeof card.scrollTo === "function") card.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        else card.scrollTop = Math.max(0, top); // older browsers
      }, KEYBOARD_SETTLE_MS);
    };
    card.addEventListener("focusin", onFocus);
    return () => { clearTimeout(timer); card.removeEventListener("focusin", onFocus); };
  }, [desktop, shown]);

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
