// The pre-launch page (2026-10-23, mock "Option A" approved on the demo):
// lit hero with the waitlist, a sample certificate behind a BPC-157 vial,
// the three waitlist perks, and a footer whose terms and privacy notice open
// in-page (the store's own pages are locked until launch). Shown at "/"
// while PRELAUNCH=1 (lib/prelaunch.ts).
import ScrollReveal from "@/components/ScrollReveal";
import AuraLockup from "@/components/AuraLockup";
import HeroLight, { PageLight } from "@/components/store/HeroLight";
import TrustRow from "@/components/store/TrustRow";
import VialTurn from "@/components/store/VialTurn";
import PlacardScan from "@/components/store/PlacardScan";
import BiosignatureSphere from "@/components/BiosignatureSphere";
import { DictionaryEntry, HeroAura } from "@/components/store/HeroAura";
import { catalogContent } from "@/data/catalog";
import type { LiveCatalog } from "@/lib/catalog-merge";
import type { ChemicalClass } from "@/data/catalog";
import { vialCap, vialName, vialParts } from "@/lib/catalog";
import { CLASS_COLOR, classShortName } from "@/lib/class-colors";
import { auraRings } from "@/lib/hero-aura";
import { sphereNodes, spherePairs } from "@/lib/sphere-nodes";
import { coaLookupQrUrl, qrRows } from "@/lib/vial-qr";
import { OFFER_PCT_TEXT } from "@/lib/account/offer";
import { PURITY_FLOOR_PCT, SUPPORT_EMAIL } from "@/lib/constants";
import { REFERRAL_CREDIT_DOLLARS } from "@/lib/waitlist/codes";
import Waitlist from "./Waitlist";
import PolicyLink from "./PolicyLink";

// "Up to a ten-point panel" = Vanguard Elite (8 tests, incl. solubility) + the vial seal
// integrity and TFA add-ons (2026-10-22). No lot is live yet, so this is a labelled sample.
const SAMPLE_GROUPS: Array<[string, Array<[string, string, string]>]> = [
  ["Identity & content", [
    ["Identity", "Confirmed", "spectral match"],
    ["Purity", `≥${PURITY_FLOOR_PCT}%`, "HPLC"],
    ["Quantity", "Within spec", "vs. labeled mg"],
    ["Solubility", "Soluble", ""],
  ]],
  ["Safety", [
    ["Endotoxin", "Pass", ""],
    ["Sterility", "Pass", "USP <71>, 14-day"],
    ["Heavy metals", "Pass", ""],
    ["Fentanyl", "Not detected", ""],
  ]],
  ["Vial", [
    ["Seal integrity", "Pass", ""],
    ["TFA content", "Within limit", ""],
  ]],
];

export default function ComingSoon({ live, site }: { live: LiveCatalog<ChemicalClass> | null; site: string }) {
  const bpc = catalogContent.find((c) => c.slug === "bpc-157");
  const sphere = live ? sphereNodes(live.shown) : [];
  // No lot is live before launch: the QR opens the certificate lookup.
  const strengths = [{ id: "10mg", strength: "10 mg", lot: null, qr: qrRows(coaLookupQrUrl(site)) }];

  const Proof = bpc ? (
    <section className="cs-sec">
      <div className="cs-proof">
        <div>
          <p className="s-micro cs-eyebrow">Behind every vial</p>
          <h2 className="s-h2">BPC-157, <em>and its certificate.</em></h2>
          <p className="cs-sub">Every vial carries its lot number and a QR code. Scan it and you land on that lot&apos;s certificate: up to a ten-point panel, run by an independent ISO/IEC 17025-accredited US lab.</p>
          {/* The vial turns to its QR code and rests there; the arrow points at the certificate it opens. */}
          <div className="cs-bpc-row">
            {/* The product page's own tile (placard behind, turning vial in front), so the glass
                reads as clear as it does on the store. */}
            <div className="s-pdp-tile cs-bpc-tile" style={{ "--cls": CLASS_COLOR[bpc.chemicalClass] } as React.CSSProperties}>
              <div className="s-pdp-placard" aria-hidden>
                <span className="s-placard-k">Monograph · {classShortName(bpc.chemicalClass)}</span>
                <span className="s-pdp-placard-n">{vialName(bpc).map((line, i) => <span key={i} className="s-name-line">{line}</span>)}</span>
                <dl>
                  {([["CAS", bpc.identity.cas], ["Formula", bpc.identity.formula], ["Mol. wt", bpc.identity.molecularWeight]] as Array<[string, string | undefined]>)
                    .filter(([, v]) => v).map(([k, v]) => <div key={k} className={k === "Mol. wt" ? "s-pdp-mw" : undefined}><dt>{k}</dt><dd>{v}</dd></div>)}
                </dl>
                <PlacardScan slug={bpc.slug} strengths={strengths} />
                <span className="s-placard-r">Research use only · Not for human use</span>
              </div>
              <div className="s-pdp-vial">
                <VialTurn id="cs-bpc" slug={bpc.slug} label={vialName(bpc)[0]} label2={vialName(bpc)[1]} cap={vialCap(bpc)} rule={CLASS_COLOR[bpc.chemicalClass]} parts={vialParts(bpc)}
                  strengths={strengths} restOn="qr" />
              </div>
            </div>
            <div className="cs-scan" aria-hidden="true">
              <span>Scan the QR code.<br />It opens <em>this.</em></span>
              <svg viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 44 C 34 52, 70 46, 108 18" /><path d="M92 16 L 109 17 L 103 33" /></svg>
            </div>
          </div>
        </div>
        <div className="cs-coa">
          <div className="cs-coa-h">
            <div>
              <p className="s-micro">Certificate of analysis</p>
              <p className="cs-coa-lot">Sample <span>· what each lot gets</span></p>
            </div>
            <span className="cs-coa-pass">✓ 10 checks</span>
          </div>
          <div className="cs-coa-id">
            <p className="s-micro" style={{ color: CLASS_COLOR[bpc.chemicalClass] }}>{bpc.chemicalClass}</p>
            <p className="cs-coa-n">BPC-157 <span>10 mg</span></p>
            <p className="cs-coa-lab"><span>Independent US lab</span> <span>ISO/IEC 17025-accredited</span></p>
          </div>
          {SAMPLE_GROUPS.map(([g, rows]) => (
            <div key={g} className="cs-coa-g">
              <p className="s-micro cs-coa-gh">{g}</p>
              {rows.map(([t, r, d]) => (
                <div key={t} className="cs-coa-row">
                  <span className="cs-coa-t">{t}</span>
                  <span className="cs-coa-r"><b>✓ {r}</b>{d && <i>{d}</i>}</span>
                </div>
              ))}
            </div>
          ))}
          <div className="cs-coa-f">
            <p className="s-micro">Up to a ten-point panel · <span style={{ whiteSpace: "nowrap" }}>ISO/IEC 17025-accredited US lab</span></p>
            <p className="cs-coa-note">Each real certificate links to the lab&apos;s own verify page.</p>
          </div>
        </div>
      </div>
    </section>
  ) : null;

  const steps: Array<[string, string, string, string]> = [
    ["I", "#33467A", "Early access", "Shop the day before we open to everyone."],
    ["II", "#A32B1F", `${OFFER_PCT_TEXT} off`, "Your first order, taken off automatically at checkout. No code."],
    ["III", "#2F6B3A", `$${REFERRAL_CREDIT_DOLLARS} a friend`, `Share your link. Every friend who places a first order adds $${REFERRAL_CREDIT_DOLLARS} to your store credit. No limit.`],
  ];
  const Steps = (
    <section className="cs-sec">
      <p className="s-micro cs-eyebrow">How the waitlist works</p>
      <h2 className="s-h2">Three things <em>you get.</em></h2>
      <div className="cs-steps" style={{ marginTop: 18 }}>
        {steps.map(([n, c, h, p]) => (
          <div key={n} className="cs-step" style={{ "--edge": c } as React.CSSProperties}><span className="n">{n}</span><h3>{h}</h3><p>{p}</p>
            {n === "III" && (
              <details className="cs-terms">
                <summary>How referral credit works</summary>
                <ul>
                  <li>Share your personal link. When someone uses it to open a new account and places their <b>first order</b>, you earn <b>${REFERRAL_CREDIT_DOLLARS} in store credit</b>.</li>
                  <li>There&apos;s <b>no limit</b>: every friend who orders earns you another ${REFERRAL_CREDIT_DOLLARS}.</li>
                  <li>The credit is added <b>once your friend&apos;s order has shipped</b>. If that order is cancelled or refunded, the credit doesn&apos;t apply.</li>
                  <li>Your friend must be <b>new to Aura Protocols</b>, and it can&apos;t be you: orders to your own address or paid with your own payment details don&apos;t count.</li>
                  <li>Each friend counts once, for the first link they used.</li>
                  <li>Store credit is spent on orders in our store. It has <b>no cash value</b> and can&apos;t be transferred.</li>
                  <li>Bringing in a lot of customers? We may invite you to our <b>partner program</b>, which pays commission.</li>
                  <li>We may change or end the program at any time; credit you&apos;ve already earned stays yours.</li>
                </ul>
                <PolicyLink which="referral" className="cs-pop-link cs-terms-full">Full terms →</PolicyLink>
              </details>
            )}
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="pharmacopoeia s-home-lit cs-page">
      <PageLight />
      <ScrollReveal />
      {/* The brand bar (emblem option 1, picked 2026-10-23): the animated lockup and a way to the waitlist. */}
      <div className="cs-bar">
        <div className="p-container cs-bar-in">
          <AuraLockup size={58} mode="loop" />
          <div className="cs-bar-r"><span className="s-micro">Opening this winter</span><a href="#join" className="cs-bar-cta">Join the waitlist</a></div>
        </div>
      </div>
      <div className="s-hero-band">
        <HeroLight />
        <div className="p-container">
          <section className="s-hero">
            <div>
              <DictionaryEntry />
              <p className="s-micro cs-eyebrow" style={{ marginTop: 18 }}>Opening this winter</p>
              <h1 className="s-h1">The first shelf is <em>almost stocked.</em></h1>
              <div id="join" className="cs-join"><Waitlist site={site} /></div>
              <div style={{ marginTop: 22 }}><TrustRow /></div>
            </div>
            {sphere.length > 0 && live && (
              <div className="s-hero-sphere">
                <HeroLight where="sphere" />
                {/* No lot numbers before launch: the store DB holds demo lots (the ring falls back to its phrase). */}
                <HeroAura rings={auraRings([])}>
                  <BiosignatureSphere nodes={sphere} pairs={spherePairs(sphere)} sidePull={0.88} />
                </HeroAura>
              </div>
            )}
          </section>
        </div>
      </div>
      <div className="p-container">
        {Proof}
        {Steps}
        <div className="cs-foot" role="contentinfo">
          <span>© 2026 Aura Protocols LLC · For laboratory research use only. Not for human or veterinary use.</span>
          <nav>
            <PolicyLink which="privacy" className="cs-pop-link">Privacy</PolicyLink>
            <PolicyLink which="referral" className="cs-pop-link">Referral terms</PolicyLink>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </nav>
        </div>
      </div>
    </div>
  );
}
