"use client";

// The coming-soon page's in-page terms and privacy notice: before launch the
// store's own /terms and /privacy are locked (lib/prelaunch.ts).
import { useRef } from "react";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { REFERRAL_CREDIT_DOLLARS } from "@/lib/waitlist/codes";

// Pre-launch the store is locked, so the terms and the privacy notice open here, in-page.
export default function PolicyLink({ which, children, className = "cs-pop-link" }: { which: "referral" | "privacy"; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.showModal()}>{children}</button>
      <dialog ref={ref} className="cs-pop" aria-labelledby={`cs-pop-${which}`} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
        <div className="cs-pop-in">
          <button type="button" className="cs-pop-x" aria-label="Close" onClick={() => ref.current?.close()}>×</button>
          {which === "referral" ? <ReferralTerms /> : <PrivacyNotice />}
          <button type="button" className="cs-pop-done" onClick={() => ref.current?.close()}>Close</button>
        </div>
      </dialog>
    </>
  );
}

function ReferralTerms() {
  return <>
    <p className="s-micro cs-pop-k" style={{ color: "#2F6B3A" }}>Terms · ${REFERRAL_CREDIT_DOLLARS} a friend</p>
    <h2 id="cs-pop-referral" className="cs-pop-h">Referral <em>credit.</em></h2>
    <p><b>How it&apos;s earned.</b> Once you&apos;re on the list you get a personal referral link. When a person who has never held an Aura Protocols account opens a new account through that link and places their first order, you earn ${REFERRAL_CREDIT_DOLLARS} in store credit (&ldquo;Referral Credit&rdquo;). There is no limit on the number of Referral Credits you can earn.</p>
    <p><b>When it&apos;s added.</b> Referral Credit is added after the referred first order ships. If that order is cancelled, refunded or disputed, no Referral Credit is earned, and Referral Credit already added for it may be removed.</p>
    <p><b>Who counts.</b> Each referred customer counts once, for the first referral link they used. Self-referrals don&apos;t qualify, including orders shipped to your own address or paid with your payment details, and accounts we reasonably believe were opened to obtain credit.</p>
    <p><b>Using it.</b> Referral Credit is spent on orders placed on auraprotocols.com once the store opens. It has no cash value and can&apos;t be transferred, sold or exchanged for cash.</p>
    <p><b>Sharing your link.</b> Don&apos;t share your link by unsolicited messages, through paid ads that use our name, or with statements that present our products as anything other than materials for laboratory research. We may remove Referral Credit earned in breach of these terms. People who refer many customers may be invited to our partner program, which has its own agreement.</p>
    <p><b>Changes.</b> We may change, pause or end the referral program at any time. Changes don&apos;t affect Referral Credit already earned, except credit obtained in breach of these terms.</p>
    <p className="cs-pop-q">Questions? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
  </>;
}

function PrivacyNotice() {
  return <>
    <p className="s-micro cs-pop-k" style={{ color: "#33467A" }}>Privacy · the waitlist</p>
    <h2 id="cs-pop-privacy" className="cs-pop-h">What we keep, <em>and why.</em></h2>
    <p><b>What we collect.</b> Your email address, when you joined and confirmed it, your own invite code, and the invite link you came through, if any.</p>
    <p><b>Why.</b> To email you about our launch, your early-access link, promotions, research updates and new arrivals, and to track the friends you refer so we can add your store credit.</p>
    <p><b>Who sees it.</b> Only the services that run the list for us: hosting (Vercel), our database (Supabase) and email delivery (Amazon SES). We never sell your information.</p>
    <p><b>Unsubscribe any time.</b> Every email has an unsubscribe link. To see or delete what we hold about you, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
    <p><b>How long.</b> Until you unsubscribe or ask us to delete it. If you open an account when we launch, the store&apos;s full privacy policy covers it from then on.</p>
    <p><b>Age.</b> The list is for adults 21 and over.</p>
  </>;
}
