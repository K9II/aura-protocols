import type { Metadata } from "next";
import Link from "next/link";
import EmailCapture from "@/components/EmailCapture";
import ScrollReveal from "@/components/ScrollReveal";
import { products } from "@/data/products";
import { posts } from "@/data/posts";
import { ENGINE_URL, EXTERNAL_REL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Aura Protocols — Research Peptide Protocols, Independently Reviewed",
  description:
    "We read the signals your wearable already tracks — HRV, sleep, recovery, glucose — and match them to published peptide research. Every compound vetted against the literature; every vendor required to provide batch-specific, third-party COAs.",
  alternates: { canonical: "/" },
};

function parseDate(date: string): number {
  return new Date(`1 ${date}`).getTime();
}

const latestPosts = [...posts]
  .sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return parseDate(b.date) - parseDate(a.date);
  })
  .slice(0, 3);

const trustChips = [
  "Biometric sequencing",
  "Matched to the literature",
  "Batch-COA required",
  "Built on the evidence",
];

const standard = [
  { num: "i.", text: "Every vendor we feature must provide batch-specific COAs from accredited third-party laboratories." },
  { num: "ii.", text: "We manually review that documentation before listing any product." },
  { num: "iii.", text: "Research protocols correlated to your own physiological baseline — not a population average." },
];

const howItWorks = [
  { num: "I.", title: "Connect", body: "Link Whoop, Oura, or Apple Health in about a minute — no new hardware to buy." },
  { num: "II.", title: "Read", body: "The Engine analyzes your recovery, sleep, and HRV trends." },
  { num: "III.", title: "Map", body: "It builds a research peptide protocol tuned to that data — dosing, timing, and COA-verified sourcing." },
  { num: "IV.", title: "Adapt", body: "As your data shifts, the protocol logic shifts with it, instead of staying frozen." },
];

const indexSlugs = ["bpc-157", "semaglutide", "sermorelin", "retatrutide", "pt-141", "slu-pp-332"];
const indexMechanisms: Record<string, string> = {
  "bpc-157": "Tissue repair, gut mucosal healing, joint recovery",
  semaglutide: "GLP-1 agonist · appetite regulation, glycemic control",
  sermorelin: "GHRH analogue · natural pituitary GH stimulation",
  retatrutide: "Triple agonist · GLP-1, GIP, and glucagon receptors",
  "pt-141": "Melanocortin agonist · central arousal pathway",
  "slu-pp-332": "ERR pan-agonist · exercise-mimetic metabolic research",
};
const indexCategoryLabels: Record<string, string> = {
  "slu-pp-332": "Longevity & Wellness · New",
};
const indexCards = indexSlugs
  .map((slug) => products.find((p) => p.slug === slug))
  .filter((p): p is (typeof products)[number] => Boolean(p));

export default function HomePage() {
  const tickerItems = products.map((p) => ({ name: p.name, vendor: p.vendors[0].vendor }));

  return (
    <div className="pharmacopoeia">
      <ScrollReveal />
      <div className="p-container">
        {/* Hero */}
        <section className="hero pt-[52px] pb-16">
          <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] items-start">
            {/* Left column */}
            <div>
              <p className="eyebrow-live load-in load-1 text-[11px] tracking-[0.16em] uppercase text-[color:var(--specimen)] mb-4">
                Biometric Intelligence · Peptide Research · Editorially Independent
              </p>
              <h1 className="load-in load-2 p-serif text-[clamp(34px,4vw,53px)] leading-[1.14] mb-[22px] text-balance">
                The peptide research that matches <em>your</em> data.
              </h1>
              <p className="load-in load-3 text-[16px] text-[color:var(--ink-soft)] max-w-[52ch] mb-[26px]">
                Every night, your wearable sequences the signals that define you — HRV, sleep, recovery, glucose.
                Aura matches that data to the peptide literature and surfaces only the compounds studied against
                those markers. No stack-of-the-week. We exist to hold peptides to the standard the research
                deserves — every compound vetted against the literature, every vendor required to provide
                batch-specific, third-party COAs.
              </p>
              <div className="flex flex-wrap gap-2.5 mb-[30px]">
                {trustChips.map((chip, i) => (
                  <span
                    key={chip}
                    className={`p-chip load-in text-[11.5px] tracking-[0.05em] uppercase px-3 py-[7px]`}
                    style={{ animationDelay: `${0.42 + i * 0.08}s` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <div className="load-in load-6 flex gap-5 items-center">
                <a
                  href={ENGINE_URL}
                  target="_blank"
                  rel={EXTERNAL_REL}
                  className="cta-primary text-[13px] tracking-[0.08em] uppercase text-[color:var(--paper)] bg-[color:var(--ink)] px-[22px] py-3 inline-block"
                >
                  Connect your wearable →
                </a>
                <a href="#index" className="cta-secondary text-[13px] tracking-[0.08em] uppercase pb-0.5">
                  Explore the research →
                </a>
              </div>
            </div>

            {/* Right column — compound index ticker */}
            <div className="load-in load-5 border border-[color:var(--line)] bg-[color:var(--paper-deep)] overflow-hidden">
              <div className="flex justify-between items-baseline px-[22px] py-[18px] border-b border-[color:var(--line)]">
                <p className="text-[11px] tracking-[0.14em] uppercase text-[color:var(--ink-soft)]">Compound Index</p>
                <div className="text-right">
                  <p className="p-serif-italic text-2xl leading-none">{products.length}</p>
                  <p className="text-[10px] tracking-[0.1em] uppercase text-[color:var(--ink-soft)]">Reviewed</p>
                </div>
              </div>

              <div className="ticker-viewport h-[268px]">
                <div className="ticker-track">
                  {[...tickerItems, ...tickerItems].map((item, i) => (
                    <div key={i} className="ticker-row flex justify-between items-baseline gap-3 px-[22px] py-[11px]">
                      <span className="name text-sm">
                        <span className="text-[color:var(--specimen)] text-xs mr-1.5">✓</span>
                        {item.name}
                      </span>
                      <span className="text-[11.5px] italic text-[color:var(--ink-soft)] flex-shrink-0">{item.vendor}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-[22px] py-3 text-[11px] text-[color:var(--ink-soft)] border-t border-[color:var(--line)]">
                Updated manually · Every vendor reviewed
              </div>
            </div>
          </div>
        </section>

        {/* Our Standard */}
        <section className="p-reveal py-16">
          <div className="text-[11px] tracking-[0.16em] uppercase text-[color:var(--specimen)] mb-3.5">Our Standard</div>
          <div className="grid gap-10 md:grid-cols-3">
            {standard.map((c) => (
              <div key={c.num} className="flex gap-4">
                <span className="p-serif-italic text-[22px] text-[color:var(--specimen)] flex-shrink-0">{c.num}</span>
                <p className="text-[14.5px] text-[color:var(--ink-soft)]">{c.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Compound Index grid */}
        <section id="index" className="p-reveal py-16">
          <div className="flex justify-between items-baseline flex-wrap gap-3 mb-[34px]">
            <h2 className="p-serif text-[28px]">The Compound Index</h2>
            <Link href="/products" className="p-see-all text-xs tracking-[0.06em] uppercase pb-0.5">
              View all products →
            </Link>
          </div>
          <div className="p-index-grid grid gap-px md:grid-cols-3">
            {indexCards.map((p) => (
              <Link key={p.slug} href={`/products/${p.slug}`} className="p-index-card block px-[22px] pt-[22px] pb-5">
                <div className="text-[10.5px] tracking-[0.1em] uppercase text-[color:var(--specimen)] mb-2.5">
                  {indexCategoryLabels[p.slug] ?? p.category}
                </div>
                <h4 className="p-serif text-[19px] mb-1.5">{p.name}</h4>
                <p className="text-[13px] italic text-[color:var(--ink-soft)] mb-[18px] min-h-[34px]">
                  {indexMechanisms[p.slug]}
                </p>
                <span className="p-view text-[11.5px] tracking-[0.06em] uppercase border-t border-[color:var(--line)] pt-3 flex items-center gap-1.5">
                  View product <span className="p-arrow">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="p-reveal py-16">
          <div className="text-[11px] tracking-[0.16em] uppercase text-[color:var(--specimen)] mb-6">How It Works</div>
          <div className="grid gap-[30px_48px] md:grid-cols-2">
            {howItWorks.map((step) => (
              <div key={step.num} className="p-roman flex gap-[18px] pl-[18px]">
                <span className="p-serif-italic text-xl text-[color:var(--specimen)] w-8 flex-shrink-0">{step.num}</span>
                <div>
                  <h5 className="text-[15.5px] mb-1">{step.title}</h5>
                  <p className="text-[13.5px] text-[color:var(--ink-soft)] m-0">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* From the Blog */}
        <section className="p-reveal py-16">
          <div className="flex justify-between items-baseline flex-wrap gap-3 mb-[34px]">
            <h2 className="p-serif text-[28px]">From the Blog</h2>
            <Link href="/blog" className="p-see-all text-xs tracking-[0.06em] uppercase pb-0.5">
              View all posts →
            </Link>
          </div>
          <div>
            {latestPosts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="p-library-entry grid gap-[30px] py-[26px] md:grid-cols-[1fr_3fr]">
                <div className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--ink-soft)]">
                  {post.category}
                  <span className="block mt-1 text-[color:var(--specimen)]">{post.readTime}</span>
                </div>
                <div>
                  <h4 className="p-serif-italic text-[21px] mb-2">{post.title}</h4>
                  <p className="text-sm text-[color:var(--ink-soft)] max-w-[62ch] m-0">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Subscribe */}
        <section className="p-reveal py-16">
          <div className="flex justify-between items-center gap-10 flex-wrap">
            <div>
              <h2 className="p-serif-italic text-[26px] max-w-[30ch] mb-1.5">Get your peptide starting protocol — free</h2>
              <p className="text-[13.5px] text-[color:var(--ink-soft)] m-0">
                Pick your #1 goal and we&apos;ll send a research-backed starting point — doses, timing, and
                COA-verified sources — to your inbox.
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <EmailCapture />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
