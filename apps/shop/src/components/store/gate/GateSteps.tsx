"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
import GoogleButton, { OrEmail } from "@/components/account/GoogleButton";
import AuraLockup from "@/components/AuraLockup";
import { gateSignInAction, gateSignUpAction, resendVerifyAction } from "@/app/auth/gate-actions";
import { signOutAction } from "@/app/auth/actions";
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
import { MARKETING_NOTICE } from "@/lib/gate-shared";
import { SUPPORT_EMAIL } from "@/lib/constants";

export type Step = "1" | "2a" | "2b" | "verify" | "closed";
type Variant = "a" | "pc";
type Props = { variant: Variant; step: Step; email: string; onStep: (s: Step) => void; onEmail: (e: string) => void; onDone: () => void };

const i = (n: number) => ({ "--i": n }) as CSSProperties;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Every step's heading carries this id; the dialog is aria-labelledby it.
export const TITLE_ID = "ag-title";
const OOPS = "Something went wrong — please try again.";

function Arrow() { return <span className="arr">→</span>; }
function Err({ text }: { text: string | null }) { return text ? <p className="err" role="alert">{text}</p> : null; }

function PasswordBox({ id, value, onChange, autoComplete, describedBy }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="box">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-describedby={describedBy} required />
      <button type="button" className="trail" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
    </span>
  );
}

function EmailReadonly({ email, onChange }: { email: string; onChange: () => void }) {
  return (
    <div className="fld"><span className="box ro" role="group" aria-label="Email">
      <span className="lead pre">Email</span><input type="email" value={email} readOnly aria-label="Email" title={email} />
      <button type="button" className="trail red" onClick={onChange}>Change</button>
    </span></div>
  );
}

export default function GateSteps({ variant, step, email, onStep, onEmail, onDone }: Props) {
  const c = (name: string) => `${variant}-${name}`;
  const back = (n: number) => (
    <p className={`${c("back")} fi`} style={i(n)}><button type="button" className="back" onClick={() => onStep("1")}>← Use a different email</button></p>
  );
  return (
    <>
      <header className={c("brand")}>
        <div className="fi" style={i(0)}><span className="lockup"><AuraLockup size={variant === "a" ? 72 : 60} mode="once" /></span></div>
        <p className="tag fi" style={i(1)}>Proof before product.</p>
      </header>
      {step === "1" && <EmailStep c={c} email={email} onEmail={onEmail} onStep={onStep} />}
      {step === "2a" && <><SignInStep c={c} email={email} onStep={onStep} onDone={onDone} />{back(5)}</>}
      {step === "2b" && <><SignUpStep c={c} variant={variant} email={email} onStep={onStep} onDone={onDone} />{back(variant === "a" ? 5 : 4)}</>}
      {step === "verify" && <VerifyStep c={c} email={email} />}
      {step === "closed" && <ClosedStep c={c} />}
      {step !== "2b" && step !== "closed" && (
        <div className={`trust ${c("trust")} fi`} style={i(5)}>
          <span><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M6 1.5h4M6.6 1.5v4.6L2.4 13a1 1 0 0 0 .9 1.5h9.4a1 1 0 0 0 .9-1.5L9.4 6.1V1.5" /><path d="M4.1 10.2h7.8" /></svg>Independent US lab</span>
          <span><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 1.5h7l3 3v10H3z" /><path d="M10 1.5v3h3" /><path d="M5.5 7.5h5M5.5 10h3" /><path d="M5.2 12.6l1.3-1.6 1.3 1.6" /></svg>Certificate for every lot</span>
          <span><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M1.5 4.5 8 1.5l6.5 3v7L8 14.5l-6.5-3z" /><path d="M1.5 4.5 8 7.5l6.5-3M8 7.5v7" /><path d="M4.8 3 11.2 6" /></svg>Ships from the US</span>
        </div>
      )}
      <footer className={`legal ${c("foot")} fi`} style={i(6)}>
        <span className="copy">© 2026 Aura Protocols LLC</span><span className="sep sep0">·</span>
        <Link href="/privacy">Privacy</Link><span className="sep">·</span><Link href="/terms">Terms</Link><span className="sep">·</span><Link href="/ruo">Research Use Only</Link>
      </footer>
    </>
  );
}

// This page's query string, read in the browser (no useSearchParams: that
// would need a Suspense boundary around the root-layout gate). Re-read on
// every render; the server render has none.
const noSubscribe = () => () => {};
function useSearch(): string {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
}

function EmailStep({ c, email, onEmail, onStep }: { c: (n: string) => string; email: string; onEmail: (e: string) => void; onStep: (s: Step) => void }) {
  const pathname = usePathname();
  const search = useSearch();
  const [value, setValue] = useState(email);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = value.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) { setError("Please enter a valid email address."); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/gate/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: v }) });
      if (r.status === 429) { setError("Too many tries — please wait a few minutes and try again."); return; }
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { next?: string };
      onEmail(v);
      onStep(d.next === "sign-in" ? "2a" : "2b");
    } catch {
      setError(OOPS);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1 id={TITLE_ID} className={`${c("h")} fi`} style={i(2)}>New accounts save <em>{OFFER_PCT_TEXT}</em></h1>
      <p className={`${c("sub")} fi`} style={i(3)}>Create a free account to browse the catalog. New accounts save {OFFER_PCT_TEXT} on a first order placed within {OFFER_DAYS_TEXT}.</p>
      {/* Its own form, a sibling of the email form (never nested). Google brings them back to this page (path + query; safeNext on the server). */}
      <div className="fi" style={i(4)}>
        <GoogleButton next={(pathname || "/") + search} />
        <OrEmail />
      </div>
      <form noValidate className="fi" style={i(4)} onSubmit={submit}>
        <label className="fld"><span className="fld-top"><span className="fld-lab">Email<span className="fld-req">* Required</span></span></span>
          <span className="box"><input type="email" name="email" placeholder="you@institution.org" autoComplete="email" required value={value} onChange={(e) => setValue(e.target.value)} /></span></label>
        <Err text={error} />
        <button className="btn" type="submit" disabled={busy}>Get access <Arrow /></button>
      </form>
    </div>
  );
}

function SignInStep({ c, email, onStep, onDone }: { c: (n: string) => string; email: string; onStep: (s: Step) => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await gateSignInAction({ email, password, remember });
      if (r.ok) { onDone(); return; }
      setError(r.error);
    } catch {
      setError(OOPS);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1 id={TITLE_ID} className={`${c("h")} fi`} style={i(2)}>Welcome back.</h1>
      <p className={`${c("sub")}${c("sub") === "a-sub" ? " tight" : ""} fi`} style={i(3)}>Enter your password to sign in.</p>
      <form className="fi" style={i(4)} onSubmit={submit}>
        <EmailReadonly email={email} onChange={() => onStep("1")} />
        <div className="fld"><label className="fld-top" htmlFor="ag-pw-in"><span className="fld-lab">Password</span></label>
          <PasswordBox id="ag-pw-in" value={password} onChange={setPassword} autoComplete="current-password" /></div>
        <div className={`row-between ${c("rem")}`}>
          <label className="chk"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span className="sq" />Remember me</label>
          <Link href="/forgot-password" className="lnk" style={{ fontSize: 13.5 }}>Forgot password?</Link>
        </div>
        <Err text={error} />
        <button className="btn" type="submit" disabled={busy}>Sign in <Arrow /></button>
      </form>
    </div>
  );
}

function SignUpStep({ c, variant, email, onStep, onDone }: { c: (n: string) => string; variant: Variant; email: string; onStep: (s: Step) => void; onDone: () => void }) {
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) { setError("Please agree to the terms to create an account."); return; }
    if (password.length < 10) { setError("Use at least 10 characters for your password."); return; }
    setBusy(true); setError(null);
    try {
      const r = await gateSignUpAction({ email, fullName, password, agreed });
      if (!r.ok) { setError(r.error); return; }
      if (r.verifyRequired) onStep("verify"); else onDone();
    } catch {
      setError(OOPS);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h1 id={TITLE_ID} className={`${c("h")} fi`} style={i(2)}>Let’s create your account.</h1>
      <form className="fi" style={i(variant === "a" ? 4 : 3)} onSubmit={submit} noValidate>
        <EmailReadonly email={email} onChange={() => onStep("1")} />
        <label className="fld" htmlFor="ag-name"><span className="fld-top"><span className="fld-lab">Full name</span></span>
          <span className="box"><input id="ag-name" type="text" autoComplete="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></span></label>
        <div className="fld"><label className="fld-top" htmlFor="ag-pw-new"><span className="fld-lab">Choose a password</span></label>
          <PasswordBox id="ag-pw-new" value={password} onChange={setPassword} autoComplete="new-password" describedBy="ag-pw-hint" />
          <span className="hint" id="ag-pw-hint">{password.length >= 10 && <span className="ok">✓</span>}At least 10 characters</span></div>
        <label className="chk attest"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /><span className="sq" />
          <span>I am 21 or older, I am buying for in-vitro laboratory research use only (not for human or animal use), and I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms</Link> and the <Link href="/refund-policy" target="_blank" rel="noopener noreferrer">Refund &amp; Dispute Policy</Link>.</span></label>
        <p className={c("note")}>{MARKETING_NOTICE}</p>
        <p className={c("priv")}><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="7" width="10" height="7.5" /><path d="M5.2 7V5a2.8 2.8 0 0 1 5.6 0v2" /></svg><span>We use your details to run your account and orders. See our <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="lnk">Privacy Policy</Link>.</span></p>
        <Err text={error} />
        <button className="btn" type="submit" disabled={busy}>Create account <Arrow /></button>
        <p className={c("after")}>Your {OFFER_PCT_TEXT} applies automatically at checkout for {OFFER_DAYS_TEXT}.</p>
      </form>
    </div>
  );
}

// A blocked account (lib/dal.ts → /api/me/gate "closed"). Signing out reloads as anon.
function ClosedStep({ c }: { c: (n: string) => string }) {
  async function signOut() {
    try { await signOutAction(); } catch { /* the reload below is the redirect */ }
    window.location.assign("/");
  }
  return (
    <div>
      <h1 id={TITLE_ID} className={`${c("h")} fi`} style={i(2)}>This account is <em>closed</em>.</h1>
      <p className={`${c("sub")} fi`} style={i(3)}>If you think this is a mistake, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from the address on the account and we&apos;ll look into it.</p>
      <p className="fi" style={i(4)}><button type="button" className="back" onClick={signOut}>Sign out</button></p>
    </div>
  );
}

function VerifyStep({ c, email }: { c: (n: string) => string; email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true); setMsg(null); setError(null);
    try {
      const r = await resendVerifyAction();
      if (r.ok) setMsg("Sent. Check your inbox (and spam)."); else setError(r.error);
    } catch {
      setError(OOPS);
    } finally {
      setBusy(false);
    }
  }
  // The layout-mounted gate would keep its "verify" state through the action's
  // client-side redirect, so finish with a full page load: the visitor comes back as anon.
  async function signOut() {
    setBusy(true);
    try {
      await signOutAction();
    } catch (e) {
      // The router rejects a redirecting action's promise; the reload below is the redirect.
      const digest = (e as { digest?: unknown } | null)?.digest;
      if (!(typeof digest === "string" && digest.startsWith("NEXT_REDIRECT"))) console.error("[gate] sign-out failed", e);
    } finally {
      window.location.assign("/");
    }
  }
  return (
    <div>
      <h1 id={TITLE_ID} className={`${c("h")} fi`} style={i(2)}>Confirm your <em>email.</em></h1>
      <p className={`${c("sub")} fi`} style={i(3)}>We sent a link to {email}. Confirm it to keep browsing.</p>
      <div className="fi" style={i(4)}>
        <Err text={error} />
        {msg && <p className="hint" role="status" style={{ margin: "-4px 0 14px" }}><span className="ok">✓</span>{msg}</p>}
        <button className="btn" type="button" onClick={resend} disabled={busy}>Resend the link <Arrow /></button>
      </div>
      <p className={`${c("back")} fi`} style={i(5)}><button type="button" className="back" onClick={signOut} disabled={busy}>← Sign out</button></p>
    </div>
  );
}
