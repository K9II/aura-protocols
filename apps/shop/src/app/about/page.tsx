import type { Metadata } from "next";
import Link from "next/link";
import AboutPlate from "@/components/store/AboutPlate";
import { PURITY_FLOOR_PCT, SUPPORT_EMAIL } from "@/lib/constants";

// About + Quality Standards in one page (2026-10-14, mock "Aura About Page" v4,
// modelled on the length of Vow's About). /quality-standards redirects to #testing.
export const metadata: Metadata = {
  title: "About",
  description: "Why Aura Protocols exists and how every lot is tested by an independent US-based laboratory before it goes on sale.",
  alternates: { canonical: "/about" },
};

// Signed by the team, so the page speaks as "we" (owner, 2026-10-14).
const SIGNATURE = "The Aura Team";

export default function AboutPage() {
  return (
    <div className="pharmacopoeia">
      <div className="s-about-col s-about-head">
        <p className="s-micro s-eyebrow">About Aura Protocols</p>
        <h1 className="s-h1">Your data is only as good as <em>the sample.</em></h1>
        <p className="s-about-sub">Research peptides, tested lot by lot by an independent US-based laboratory, with every certificate published.</p>
      </div>

      <div className="p-container">
        <AboutPlate />
      </div>

      <div className="s-about-col s-about-body">
        <section className="s-about-first">
          <h2>Why we started</h2>
          <p>Researchers make decisions from data: which run to repeat, which result to trust, what to try next. If the compound in the vial isn&apos;t what the label says, every one of those calls rests on a bad number. We started Aura Protocols to take the guesswork out of that. Every lot we sell is tested by an independent lab before it goes on sale, and you can read the results for the exact lot in your vial.</p>
        </section>

        <section>
          <h2>Since 1906</h2>
          <p>The Food and Drugs Act of 1906 tied drugs to the strength, quality and purity standards of the <i>United States Pharmacopoeia</i>. The label became something a chemist could hold you to. The instruments are far better now. Liquid chromatography and mass spectrometry can confirm what a peptide is and measure how pure it is. The principle hasn&apos;t changed: the label makes a claim, and a lab checks it.</p>
        </section>

        <section id="testing">
          <h2>How a lot is tested</h2>
          <p>Every lot is tested by an independent US-based laboratory, a third party and never in-house. The certificate covers identity by mass spectrometry, purity by HPLC with a floor of {PURITY_FLOOR_PCT}%, and endotoxin, and its lot number matches the one printed on your vial. A lot goes on sale only after it passes and we&apos;ve counted it in. After that its certificate is locked; a correction or re-test is added beside it, never swapped in.</p>
        </section>

        <section>
          <h2>Checking a vial</h2>
          <p>Scan the QR code on the vial label to open that lot&apos;s certificate, or enter the lot number in the <Link href="/coa" className="p-link">COA Lookup</Link>. To verify a certificate, follow its link to the testing lab&apos;s own site and see the same report there.</p>
        </section>

        <section>
          <h2>Research use only</h2>
          <p>Everything we sell is for in-vitro laboratory research. We don&apos;t give instructions for use and don&apos;t sell to anyone under 21; see our <Link href="/ruo" className="p-link">Research Use Only policy</Link>. Compounds ship lyophilized and are listed by scientific name, grouped by chemical class. Three blends also carry a short name (Wolverine, GLOW, KLOW) because the full name won&apos;t fit on the vial; the scientific name is always shown with it.</p>
          <p>If a certificate doesn&apos;t add up, or a vial doesn&apos;t match its paperwork, write to <a href={`mailto:${SUPPORT_EMAIL}`} className="p-link">{SUPPORT_EMAIL}</a>. We&apos;d rather hear it from you than have it sit in your data.</p>
          <p className="s-about-sig">— {SIGNATURE}</p>
        </section>
      </div>

      <div className="p-container">
        <ul className="s-about-claims">
          <li><span className="s-micro">Tested</span><b>Independent US lab</b><span>US-based, third party, never in-house.</span></li>
          <li><span className="s-micro">Every lot</span><b>Certificate published</b><span>Before the lot goes on sale, matched to your vial.</span></li>
          <li><span className="s-micro">Floor</span><b>{PURITY_FLOOR_PCT}% purity</b><span>By HPLC, with identity by mass spectrometry.</span></li>
          <li><span className="s-micro">Ships</span><b>From the US</b><span>Lyophilized, tracked, research use only.</span></li>
        </ul>
      </div>
    </div>
  );
}
