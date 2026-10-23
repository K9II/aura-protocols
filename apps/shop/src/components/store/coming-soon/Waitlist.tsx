"use client";

// The coming-soon waitlist: join → you're on the list at once, with the invite
// link to share (single opt-in; /?in=CODE also opens this screen). An invite
// link's ?r=CODE is remembered in this browser so a friend who looks around
// first still counts.
import { Suspense, useState, useSyncExternalStore, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { joinWaitlistAction } from "@/app/waitlist-actions";
import { inviteLabel, inviteUrl, parseReferralCode, REFERRAL_CREDIT_DOLLARS } from "@/lib/waitlist/codes";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";
import PolicyLink from "./PolicyLink";

const REF_KEY = "aura_wl_ref";
const noop = () => () => {};

function rememberRef(code: string | null): void {
  if (!code) return;
  try { localStorage.setItem(REF_KEY, code); } catch { /* private mode: the link still works this visit */ }
}

function storedRef(): string {
  try { return localStorage.getItem(REF_KEY) ?? ""; } catch { return ""; }
}

export default function Waitlist({ site }: { site: string }) {
  return (
    <Suspense fallback={<Box site={site} inCode={null} urlRef={null} notice={null} />}>
      <WithParams site={site} />
    </Suspense>
  );
}

function WithParams({ site }: { site: string }) {
  const q = useSearchParams();
  const wl = q.get("wl");
  const notice = wl === "invalid"
    ? "That confirm link has expired or a newer one replaced it. Enter your email again and we'll send a fresh one."
    : wl === "error" ? "Something went wrong confirming your spot. Please try the link in your email again in a minute." : null;
  return <Box site={site} inCode={parseReferralCode(q.get("in"))} urlRef={parseReferralCode(q.get("r"))} notice={notice} />;
}

function Box({ site, inCode, urlRef, notice }: { site: string; inCode: string | null; urlRef: string | null; notice: string | null }) {
  const [code, setCode] = useState<string | null>(inCode);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const canShare = useSyncExternalStore(noop, () => typeof navigator !== "undefined" && typeof navigator.share === "function", () => false);
  if (urlRef) rememberRef(urlRef);

  const submit = (form: FormData) => {
    setError(null);
    form.set("ref", urlRef ?? storedRef());
    start(async () => {
      const r = await joinWaitlistAction(form);
      if (!r.ok) setError(r.message);
      else if (r.code) setCode(r.code);
    });
  };

  if (code) {
    const url = inviteUrl(site, code);
    const copy = async () => {
      try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setCopied(false); }
    };
    const share = async () => {
      try { await navigator.share({ title: "Aura Protocols", text: "Aura Protocols: research peptides tested by an ISO/IEC 17025-accredited US lab. Join the waitlist with my link:", url }); } catch { /* closed the share sheet */ }
    };
    return (
      <div className="cs-wl cs-wl--panel">
        <p className="s-micro cs-wl-k" style={{ color: "var(--tested)" }}>✓ You&apos;re on the list</p>
        <p className="cs-wl-h">See you at <em>opening.</em></p>
        <p className="cs-p">We&apos;ll email your early-access link the day before we open. Share your link with fellow researchers: every colleague who places a first order earns you ${REFERRAL_CREDIT_DOLLARS} in store credit. No limit.</p>
        <div className="cs-form">
          <input readOnly value={inviteLabel(site, code)} aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="p-btn-primary" onClick={canShare ? share : copy}>{canShare ? "Share link" : copied ? "Copied ✓" : "Copy link"}</button>
        </div>
        {canShare && <button type="button" className="cs-reset" onClick={copy}>{copied ? "Copied ✓" : "Copy it instead"}</button>}
        <div className="cs-slots">
          <div><b>0</b><span className="s-micro">Colleagues ordered</span></div><div><b>$0</b><span className="s-micro">Credit earned</span></div><div><b>${REFERRAL_CREDIT_DOLLARS}</b><span className="s-micro">Per colleague</span></div>
        </div>
        <p className="cs-fine">Your link is in your inbox too. Credit counts from launch day, when colleagues can order.</p>
      </div>
    );
  }

  return (
    <div className="cs-wl cs-wl--panel">
      <p className="s-micro cs-wl-k">The waitlist</p>
      <p className="cs-wl-h">Be first in <em>the door.</em></p>
      {notice && <p className="cs-wl-note" role="status">{notice}</p>}
      <ul className="cs-perks">
        <li><b style={{ "--c": "#33467A" } as React.CSSProperties}>Early</b><span>Shop the day before we open to everyone.</span></li>
        <li><b style={{ "--c": "#A32B1F" } as React.CSSProperties}>{OFFER_PCT_TEXT} off</b><span>Your first order, applied automatically.</span></li>
        <li><b style={{ "--c": "#2F6B3A" } as React.CSSProperties}>${REFERRAL_CREDIT_DOLLARS} each</b><span>Store credit for every colleague who places an order. No limit.</span></li>
      </ul>
      <form className="cs-form" action={submit}>
        <input type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourinstitution.org" aria-label="Email" autoComplete="email" />
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="cs-hp" />
        <button className="p-btn-primary" type="submit" disabled={pending}>{pending ? "Joining…" : "Join the list"}</button>
      </form>
      {error && <p className="cs-wl-err" role="alert">{error}</p>}
      <div className="cs-fine">You&apos;ll get emails about our launch, promotions, research updates and new arrivals. Unsubscribe any time. No spam. <PolicyLink which="privacy">Privacy</PolicyLink></div>
    </div>
  );
}
