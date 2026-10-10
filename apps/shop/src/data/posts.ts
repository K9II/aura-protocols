// Relative import (not the "@/" alias) — posts.ts is pulled into next.config.ts
// via affiliate.ts/buildAffiliateRedirects(), and the config's CommonJS transpile
// step does not resolve the "@/" path alias. affiliate.ts imports the same way.

export type LinkPart = {
  href: string;
  text: string;
  external?: boolean;   // if true, render <a target="_blank" rel>
  sponsored?: boolean;  // if true, append "sponsored" to rel
};

export type Part = string | LinkPart;

export type Section = {
  type: "intro" | "h2" | "h3" | "p" | "ul" | "callout" | "cta" | "button" | "disclaimer" | "faq";
  text?: string;
  items?: string[];
  productSlug?: string;
  vendor?: string;
  affiliateUrl?: string;
  // External destination for a "button" section (e.g. the Aura Engine). When set,
  // the button links out via target="_blank"; falls back to productSlug otherwise.
  href?: string;
  parts?: Part[];
  faq?: Array<{ q: string; a: string }>;
};

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  content: Section[];
  wordCount?: number;
  lastUpdated?: string;
  // If true, this post is pinned first on /blog and in "From the Blog" regardless of
  // date, ahead of every other post — until explicitly unpinned.
  pinned?: boolean;
  // If true, this post sorts first when its own category is filtered on /blog
  // (e.g. ?category=Stacks) — scoped to that category only, unlike `pinned`,
  // which is sitewide and also affects the homepage "From the Blog" section.
  categoryLead?: boolean;
  // Rewritten to the research-summary template (2026-10-10): tests/data/posts-ruo.test.ts
  // holds it to the RUO rules (no amounts, human outcomes, benefit words, sourcing or
  // product buttons; chemical-class category; RUO disclaimer).
  ruo?: boolean;
};

export const posts: Post[] = [
  {
    slug: "wearable-engine-personalized-peptide-protocol",
    title: "Your Wearable Has the Data. Aura Builds the Protocol.",
    excerpt:
      "Whoop, Oura, and Apple Health measure your recovery, sleep, and HRV — then go silent. The Aura Engine turns that data into a research peptide protocol tuned to you.",
    category: "Buyer's Guide",
    date: "July 2026",
    readTime: "9 min read",
    pinned: true,
    content: [
      {
        type: "intro",
        text: "Your wearable is very good at one thing: telling you something is wrong. A 31% recovery score. A red night of sleep. HRV trending down for the third straight week. What it never tells you is the only thing you actually want to know — what to do about it. This is the gap the Aura Engine was built to close.",
      },
      {
        type: "h2",
        text: "It Measures Everything. It Decides Nothing.",
      },
      {
        type: "p",
        text: "Recovery scores, sleep stages, resting heart rate, HRV — modern wearables surface a remarkable amount of signal about how your body is actually doing. But signal isn't a plan. You can stare at a week of poor recovery and tanking HRV and still have no idea which lever to pull. The dashboard measures the problem with precision and then hands the entire interpretation — and every decision — back to you.",
      },
      {
        type: "p",
        text: "For most people that means guesswork: a supplement someone mentioned on a podcast, a generic protocol copied from a forum, or nothing at all. The measurement is personalized down to the millisecond. The response is a shrug.",
      },
      {
        type: "h2",
        text: "Why Generic Peptide Protocols Miss",
      },
      {
        type: "p",
        text: "Peptide research is full of one-size-fits-all templates — fixed doses, fixed timing, fixed stacks pulled from a generic article. The problem is that none of them account for the one variable that matters most: your actual physiology, right now.",
      },
      {
        type: "ul",
        items: [
          "A template can't see that your sleep collapsed this month — the exact context a recovery- or sleep-oriented protocol should respond to",
          "A template can't tell whether your HRV is stable or in free-fall, which changes how aggressively a research protocol should be approached",
          "A template assumes you're a starting point everyone shares — you're not; your baseline is your own",
          "A template never updates — your data changes weekly, but the protocol on the forum was written once and frozen",
        ],
      },
      {
        type: "h2",
        text: "What the Aura Engine Actually Does",
      },
      {
        type: "p",
        text: "The Engine connects to the wearable you already wear — Whoop, Oura, or Apple Health — and reads the metrics that matter: recovery, sleep quality, and HRV. It then maps that data to a research peptide protocol matched to where you actually are, not to a generic average. Instead of a static table you have to interpret, you get a starting point that reflects your own recovery, sleep, and stress signals.",
      },
      {
        type: "ul",
        items: [
          "Connect — link Whoop, Oura, or Apple Health in about a minute; no new hardware to buy",
          "Read — the Engine analyzes your recovery, sleep, and HRV trends",
          "Map — it builds a research peptide protocol tuned to that data, with dosing, timing, and COA-verified sourcing",
          "Adapt — as your data shifts, the protocol logic shifts with it, instead of staying frozen",
        ],
      },
      {
        type: "h2",
        text: "The After-GLP-1 Problem It Was Built For",
      },
      {
        type: "p",
        text: "Nowhere is the data-without-direction gap clearer than coming off a GLP-1. Millions of people are cycling off Ozempic, Wegovy, and Zepbound — and their wearables light up with exactly the problems that follow: lost lean mass, worse sleep, blunted recovery, and flat energy. The numbers spell out the fallout in detail. They still don't say what to do next.",
      },
      {
        type: "ul",
        items: [
          "Muscle loss after rapid weight loss shows up as degraded recovery and strain tolerance",
          "Sleep disruption post-GLP-1 is visible in your sleep stages and HRV long before you can articulate it",
          "Libido and energy changes correlate with the same recovery and stress signals your wearable already tracks",
          "This is precisely the situation where a protocol matched to your data beats a generic recommendation",
        ],
      },
      {
        type: "h2",
        text: "How It Works, Start to Finish",
      },
      {
        type: "ul",
        items: [
          "Step 1 — Connect a wearable for free (Whoop, Oura, or Apple Health)",
          "Step 2 — The Engine reads your recovery, sleep, and HRV and identifies what your data is pointing to",
          "Step 3 — You get a research peptide protocol tuned to that picture — compounds, dosing, timing, and where to source COA-verified material",
          "Step 4 — When you're ready to move from research to a supervised plan, a US-licensed MD-prescribed path is available",
        ],
      },
      {
        type: "h2",
        text: "Why Personalized Beats a Template",
      },
      {
        type: "ul",
        items: [
          "It starts from your baseline, not a stranger's average",
          "It adjusts as your wearable data changes week to week",
          "It points only to COA-verified sources, so identity and purity aren't a guess",
          "It removes the research-design guesswork that stops most people before they start",
        ],
      },
      {
        type: "h2",
        text: "Whoop Tells You the What. Aura Tells You the What-to-Do.",
      },
      {
        type: "p",
        text: "Wearables won the measurement war. They are extraordinary at telling you the what — what your recovery is, what your sleep did, what your HRV is doing. The Aura Engine is built for the next step that none of them take: the what-to-do. It treats your wearable not as a scoreboard but as an input — the starting data for a protocol that's actually yours.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Do I need to buy new hardware?",
            a: "No. The Engine works with the wearable you already have — Whoop, Oura, or Apple Health. Connecting takes about a minute and there's nothing new to purchase.",
          },
          {
            q: "Is connecting a wearable free?",
            a: "Yes. You can connect a wearable and get a data-matched starting protocol for free. The optional MD-prescribed path is a separate, supervised step you choose only when you're ready.",
          },
          {
            q: "How is this different from the protocol templates I can find for free?",
            a: "A free template is written once, for an average person, and never updates. The Engine builds from your own recovery, sleep, and HRV data and adapts as that data changes. The template guesses; the Engine starts from your numbers.",
          },
          {
            q: "Why does this matter specifically after a GLP-1?",
            a: "Coming off Ozempic, Wegovy, or Zepbound tends to produce muscle loss, worse sleep, and blunted recovery — all of which show up clearly in wearable data. That makes it a near-ideal case for a protocol matched to your data rather than a generic recommendation.",
          },
          {
            q: "Are these protocols medical advice?",
            a: "No. Aura's research protocols are for informational and research purposes only and are not medical advice. The compounds referenced are for research use. A supervised, MD-prescribed path is available separately when you want clinical oversight.",
          },
        ],
      },
      {
        type: "callout",
        text: "The peptide compounds referenced by the Engine and across Aura Protocols are for research purposes only. They are not approved for human use outside of specific FDA-approved formulations under medical supervision. Nothing here constitutes medical advice.",
      },
      {
        type: "disclaimer",
        text: "This article may contain affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "why-glp1-dose-response-varies",
    title: "Why the Same GLP-1 Dose Hits Everyone Differently",
    excerpt:
      "One person responds powerfully to 0.5mg while another needs five to ten times more for the same effect. The reason isn't body weight or \"better receptors\" — it's what the research actually shows about exposure, genetics, and starting biology.",
    category: "Weight Management",
    date: "August 2026",
    readTime: "8 min read",
    content: [
      {
        type: "intro",
        text: "It's one of the most common questions in the GLP-1 research community: why does 0.5mg of semaglutide produce a dramatic response in one person while someone else needs five to ten times more to feel the same thing? The intuitive answers — body weight, or simply \"better receptors\" — turn out to be mostly wrong. The literature points to something more interesting, and it changes how you should think about dosing entirely.",
      },
      {
        type: "h2",
        text: "The Number in the Syringe Is Only the Beginning",
      },
      {
        type: "p",
        text: "The cleanest way to understand dose response is a short chain: dose leads to exposure, exposure leads to response — and both of those sit on top of your individual starting biology. The milligrams you draw up are only the first link. Two people injecting the exact same amount can end up with different amounts of drug actually circulating, respond differently to the same circulating level, and start from different metabolic baselines before a single dose is given. Miss any of those links and the dose number tells you almost nothing on its own.",
      },
      {
        type: "h2",
        text: "Same Dose ≠ Same Exposure",
      },
      {
        type: "p",
        text: "Exposure — how much drug your body is actually working with over time — is not fixed by the label dose. Body weight is one variable that shifts it for both semaglutide and tirzepatide: heavier individuals tend to sit at somewhat lower exposure at a given dose. But the effect is modest. It is not large enough that these drugs are dosed by body weight the way, say, some chemotherapies are. That's the part that surprises people: being 300 lb does not automatically mean you need more than someone who is 150 lb. Weight nudges the exposure curve; it doesn't dictate it.",
      },
      {
        type: "h2",
        text: "Same Exposure ≠ Same Response: The Genetics",
      },
      {
        type: "p",
        text: "This is where it gets genuinely interesting. Even if two people had identical drug exposure, they still might not respond the same way — because the receptor and the signaling machinery behind it are not identical from person to person. Two genes keep showing up in the research: GLP1R, which codes for the GLP-1 receptor itself, and ARRB1 (β-arrestin-1), which is involved in how that receptor passes its signal along once activated.",
      },
      {
        type: "ul",
        items: [
          "A 2023 genome-wide analysis in The Lancet Diabetes & Endocrinology (4,571 adults) found that combining GLP1R and ARRB1 variants identified about 4% of people who had roughly a 30% greater HbA1c reduction than the worst-responding ~9% — from the same class of drug.",
          "A 2025 study in Obesity (112 patients with severe obesity on semaglutide 2.4mg) found that people carrying two copies of the GLP1R rs6923761 A variant lost weight at about 1.6% of body weight per month, versus about 1.0% per month in carriers of the G variant — and sex mattered too.",
          "A 2026 genome-wide study in Nature of 27,885 people on GLP-1 drugs tied a GLP1R missense variant to greater weight loss (about 0.76 kg more per copy of the effect allele) and linked GLP1R and GIPR variants to nausea and vomiting — with the GIPR association showing up only in tirzepatide users, exactly as its dual GIP/GLP-1 mechanism would predict.",
        ],
      },
      {
        type: "callout",
        text: "Genetics is one piece, not a dosing formula. The research is nowhere near being able to say \"0.5mg works for you because your receptors are sensitive\" or \"you need 6mg because your receptors are weak.\" These are population-level associations, not a genotype-to-dose calculator. There is still a great deal we don't understand.",
      },
      {
        type: "h2",
        text: "Your Starting Biology Moves the Whole Curve",
      },
      {
        type: "p",
        text: "Beyond exposure and receptor genetics, where you start matters. The clearest illustration comes from semaglutide's own phase 3 program. In STEP 1, adults without diabetes lost about 14.9% of body weight on 2.4mg. In STEP 2, adults with type 2 diabetes lost about 9.6% on the same 2.4mg target dose. Same drug, same dose, a meaningfully different average result — driven by the metabolic starting point, not the milligrams. We know the effect is real; we still don't fully understand every mechanism behind it.",
      },
      {
        type: "h2",
        text: "Dose Still Matters — On Average",
      },
      {
        type: "p",
        text: "None of this means dose is irrelevant. It clearly is — on average. Retatrutide's phase 2 trial showed a clean dose-response gradient at 48 weeks:",
      },
      {
        type: "ul",
        items: [
          "1mg → about 8.7% mean weight reduction",
          "4mg → about 17.1%",
          "8mg → about 22.8%",
          "12mg → about 24.2%",
        ],
      },
      {
        type: "p",
        text: "More drug produced more weight loss on average. But \"on average\" is doing a lot of work in that sentence. Those are group means, and people within the same dose group still responded very differently from one another. The average curve is real; your personal position on it is your own.",
      },
      {
        type: "h2",
        text: "So What Actually Makes a \"Low-Dose Responder\"?",
      },
      {
        type: "p",
        text: "Putting it together, a genuine low-dose responder is probably some combination of three things working in their favor at once:",
      },
      {
        type: "ul",
        items: [
          "Exposure — the same dose simply produces higher effective drug levels in some people than others.",
          "Response — at similar exposure, receptor genetics and signaling differences change how strongly the body reacts.",
          "Starting biology — no two people are metabolically identical before the first dose, and that shifts the entire dose-response curve.",
        ],
      },
      {
        type: "p",
        text: "Which reframes the whole \"what's the right dose\" argument. Someone thriving on 0.5mg is not proof that everyone should stay low. Someone who needs 6mg does not have \"bad receptors.\" They are different people sitting on different dose-response curves — and there are almost certainly variables the research hasn't pinned down yet.",
      },
      {
        type: "h2",
        text: "Why This Is the Entire Case for Personalization",
      },
      {
        type: "p",
        parts: [
          "This is exactly why a research protocol matched to your own data beats a template written for an average person. If exposure, receptor response, and starting biology all vary from person to person, then a single \"correct\" dose copied off a forum is a coin flip. Finding the dose-response that works for you — starting conservatively and adjusting against real signal — is not caution for its own sake; it's what the science actually implies. It's also the reason the ",
          { href: "/products/semaglutide", text: "semaglutide" },
          ", ",
          { href: "/products/tirzepatide", text: "tirzepatide" },
          ", and ",
          { href: "/products/retatrutide", text: "retatrutide" },
          " research guides on this site emphasize titration and individual response over any one \"magic\" number.",
        ],
      },
      {
        type: "p",
        text: "It's the same principle the Aura Engine is built on. Instead of handing you a generic protocol, it starts from your own wearable data — recovery, sleep, and HRV — and builds a research starting point tuned to where you actually are, then adapts as that data changes. Connect a wearable and get your data-matched starting protocol for free.",
      },
      {
        type: "cta",
        text: "View Semaglutide Vendor",
        productSlug: "semaglutide",
        vendor: "American Peptides",
        affiliateUrl: "https://www.americanpeptides.us/discount/AURAPRO10?ref=ngEbqLb06k&redirect=/products/semaglutide",
      },
      {
        type: "cta",
        text: "View Retatrutide Vendor",
        productSlug: "retatrutide",
        vendor: "Evolve Peptides",
        affiliateUrl: "https://www.evolvepeptides.com/product/reta-10mg/?ref=auraproto",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Does body weight decide my GLP-1 dose?",
            a: "Not really. Heavier people tend to sit at somewhat lower drug exposure at a given dose of semaglutide or tirzepatide, but the effect is modest — not enough that these drugs are dosed by body weight. Being larger does not automatically mean you need a higher dose than someone smaller.",
          },
          {
            q: "Can a genetic test tell me my ideal dose?",
            a: "No. Variants in GLP1R, ARRB1, and GIPR are associated with differences in response and side effects across large groups, but the research is not close to a genotype-to-dose formula for an individual. Genetics is one input among several, not a prescription.",
          },
          {
            q: "Why did I lose less than the trial averages I read about?",
            a: "Averages hide enormous individual spread, and starting biology shifts the whole curve. In semaglutide's own trials, people without diabetes lost about 14.9% while people with type 2 diabetes lost about 9.6% on the same 2.4mg dose. Your metabolic starting point, exposure, and receptor response all move your personal result away from the headline number.",
          },
          {
            q: "Is a low-dose responder just lucky?",
            a: "In a sense — they likely have a favorable combination of higher effective exposure, a more responsive receptor/signaling profile, and a starting biology that suits the drug. It doesn't mean everyone should stay low, and needing a higher dose doesn't mean your receptors are defective. Different people, different dose-response curves.",
          },
          {
            q: "Are these compounds safe to just experiment with?",
            a: "The compounds referenced here are for research use only and are not approved for general human use outside specific FDA-approved formulations under medical supervision. Nothing in this article is medical advice. A supervised, MD-prescribed path is a separate option when you want clinical oversight.",
          },
        ],
      },
      {
        type: "h2",
        text: "References",
      },
      {
        type: "p",
        parts: [
          "1. Dawed AY, et al. \"Pharmacogenomics of GLP-1 receptor agonists: a genome-wide analysis of observational data and large randomised controlled trials.\" Lancet Diabetes Endocrinol, 2023. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/36528349/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Phan A, et al. \"A GLP1R gene variant and sex influence the response to semaglutide treatment in patients with severe obesity.\" Obesity (Silver Spring), 2025. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/40384505/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Su QJ, et al. \"Genetic predictors of GLP1 receptor agonist weight loss and side effects.\" Nature, 2026 (genome-wide study of 27,885 people). ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/41951734/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Wilding JPH, et al. \"Once-Weekly Semaglutide in Adults with Overweight or Obesity\" (STEP 1). N Engl J Med, 2021. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/33567185/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Davies M, et al. \"Semaglutide 2·4 mg once a week in adults with overweight or obesity, and type 2 diabetes (STEP 2).\" Lancet, 2021. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/33667417/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Jastreboff AM, et al. \"Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial.\" N Engl J Med, 2023. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/37366315/", text: "PubMed", external: true },
        ],
      },
      {
        type: "callout",
        text: "The peptide compounds referenced here are for research purposes only. They are not approved for human use outside of specific FDA-approved formulations under medical supervision. Nothing in this article constitutes medical advice.",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "pt-141-melanocortin-bremelanotide-guide",
    title:
      "PT-141 (Bremelanotide): Hypothalamic Activation, the Brain-to-Spine Arousal Cascade, and Post-RARP Research",
    excerpt:
      "How PT-141 binds MC3R and MC4R to initiate arousal centrally, why this matters for post-prostatectomy ED research, and the full melanocortin analog family from α-MSH to setmelanotide.",
    category: "Wellness",
    date: "June 2026",
    readTime: "12 min read",
    content: [
      {
        type: "intro",
        text: "PT-141, generically known as bremelanotide, occupies a distinct position in the peptide research landscape. Unlike the PDE5 inhibitors that dominate mainstream erectile dysfunction treatment, PT-141 doesn't act on vascular smooth muscle at all. It acts on the brain. This central mechanism — binding melanocortin receptors in the hypothalamus to initiate a neurological cascade rather than dilating blood vessels — is what makes PT-141 relevant to researchers studying populations where peripheral interventions consistently underperform. Among the most studied: men who have undergone radical prostatectomy for prostate cancer. This guide covers PT-141's mechanism of action at the receptor level, the clinical rationale for its use in post-surgical ED research, and where it sits within the broader melanocortin peptide family.",
      },
      {
        type: "h2",
        text: "How PT-141 Works: Melanocortin Receptor Binding",
      },
      {
        type: "p",
        text: "The melanocortin system is a network of five G-protein-coupled receptors (MC1R through MC5R), each with distinct tissue distribution and physiological roles. PT-141 demonstrates binding affinity primarily at MC3R and MC4R — the two subtypes most implicated in sexual function and autonomic regulation.",
      },
      {
        type: "h3",
        text: "MC4R: The Key Receptor for Sexual Function",
      },
      {
        type: "p",
        text: "MC4R is expressed densely in the paraventricular nucleus (PVN) of the hypothalamus, one of the brain's primary integration centers for sexual arousal, autonomic output, and hormone regulation. When PT-141 binds MC4R in the PVN, it triggers a downstream cascade involving activation of oxytocinergic neurons, dopaminergic pathway stimulation, and spinal cord signal propagation to the sacral parasympathetic nerves.",
      },
      {
        type: "ul",
        items: [
          "Activation of oxytocinergic neurons, which project to the spinal cord and influence penile erection and sexual motivation",
          "Dopaminergic pathway stimulation in the mesolimbic system, contributing to desire and arousal",
          "Spinal cord signal propagation to the sacral parasympathetic nerves, which ultimately drive engorgement",
        ],
      },
      {
        type: "h3",
        text: "The Critical Mechanistic Difference",
      },
      {
        type: "p",
        text: "Sildenafil (Viagra) and tadalafil (Cialis) inhibit phosphodiesterase type 5, an enzyme that breaks down cGMP in vascular smooth muscle. The result: vasodilation and increased blood flow to erectile tissue. But this mechanism depends entirely on an intact nerve signal arriving first. Without a functioning nerve pathway delivering nitric oxide to the tissue, there is no cGMP to preserve. PDE5 inhibitors have nothing to amplify. PT-141 bypasses this requirement. The signal originates above the peripheral nervous system — meaning it may retain efficacy in neurogenic ED where the downstream pathway is compromised, provided sufficient central connectivity remains.",
      },
      {
        type: "h2",
        text: "PT-141 in Post-RARP Research",
      },
      {
        type: "h3",
        text: "What RARP Does to Erectile Function",
      },
      {
        type: "p",
        text: "Robot-Assisted Radical Prostatectomy is the gold standard surgical intervention for localized prostate cancer. The procedure removes the prostate gland entirely, and in doing so, places the neurovascular bundles running alongside the prostate — the cavernous nerves — at significant risk. Even in nerve-sparing techniques, traction, thermal injury, and inflammation during surgery cause neurapraxia — a temporary (and sometimes permanent) disruption of nerve conduction.",
      },
      {
        type: "ul",
        items: [
          "Bilateral nerve-sparing: 54–70% ED rate at 12 months",
          "Unilateral nerve-sparing: 70–80% ED rate",
          "Non-nerve-sparing: >90% ED rate",
        ],
      },
      {
        type: "h3",
        text: "Why PDE5 Inhibitors Underperform Post-RARP",
      },
      {
        type: "p",
        text: "In the early post-RARP window, cavernous nerve conduction is impaired. The nitric oxide signal that PDE5 inhibitors depend on is absent or severely diminished. Multiple clinical studies have found that on-demand PDE5 inhibitor use produces a meaningful erection in only 30–40% of post-RP patients in the first year — significantly below the 60–80% response rates seen in vasculogenic ED.",
      },
      {
        type: "h3",
        text: "The Central Mechanism Argument",
      },
      {
        type: "p",
        text: "Because PT-141 initiates arousal centrally — via MC4R in the hypothalamus, projecting down through spinal cord pathways — it does not require an intact cavernous nerve signal at the peripheral level. Research on MC4R agonists in animal models of cavernous nerve injury has demonstrated that centrally-mediated erections can occur even after bilateral cavernous nerve resection, suggesting the spinal pathway retains independent function. Note: No large-scale RCTs have been published specifically evaluating PT-141 in post-RARP patients as of mid-2026. The mechanistic rationale is well-grounded, and melanocortin agonist research in neurogenic ED is an active area.",
      },
      {
        type: "h3",
        text: "Beyond Erection — Orgasmic Dysfunction Post-RARP",
      },
      {
        type: "p",
        text: "Prostatectomy eliminates ejaculation, but orgasm — the neurological event — persists in most patients, often described as qualitatively different. PT-141's dopaminergic and oxytocinergic effects on the reward pathway may be relevant to orgasm quality independent of erection. This remains a research-stage hypothesis.",
      },
      {
        type: "h2",
        text: "The Melanocortin Peptide Analog Family",
      },
      {
        type: "p",
        text: "α-MSH is a 13-amino acid peptide derived from pro-opiomelanocortin (POMC). It has broad melanocortin receptor affinity and regulates skin pigmentation (MC1R), energy homeostasis, inflammation, and sexual function (MC3R/MC4R). Its short half-life makes it impractical as a therapeutic agent — all synthetic analogs in this family were developed to address this limitation.",
      },
      {
        type: "h3",
        text: "Melanotan I — Afamelanotide (Scenesse)",
      },
      {
        type: "p",
        text: "MC1R-selective synthetic analog. FDA-approved 2019 for erythropoietic protoporphyria (EPP), a rare genetic disorder causing extreme sun sensitivity. Produces skin darkening with minimal sexual side effects due to MC1R selectivity. Not studied for sexual function.",
      },
      {
        type: "h3",
        text: "Melanotan II (MT-II)",
      },
      {
        type: "p",
        text: "Non-selective cyclic analog developed in the early 1990s at the University of Arizona. Binds MC1R, MC3R, MC4R, and MC5R simultaneously — producing tanning, appetite suppression, and spontaneous erections as simultaneous effects. Researchers observed erection effects in clinical subjects before tanning was visible. High side effect burden (nausea, facial flushing, spontaneous erections) limited clinical viability. The foundational research compound from which PT-141 was derived.",
      },
      {
        type: "h3",
        text: "PT-141 / Bremelanotide (Vyleesi)",
      },
      {
        type: "p",
        text: "Derived from MT-II with modified structure to retain MC3R/MC4R selectivity while reducing MC1R activity. Substantially less tanning effect, preserved sexual arousal effects. FDA-approved 2019 as Vyleesi for hypoactive sexual desire disorder (HSDD) in premenopausal women — the first centrally-acting FDA-approved treatment for female sexual dysfunction. RECONNECT trials (1,200+ women): statistically significant improvement in satisfying sexual events and distress reduction vs placebo.",
      },
      {
        type: "h3",
        text: "Setmelanotide (Imcivree)",
      },
      {
        type: "p",
        text: "Highly MC4R-selective. FDA-approved 2020 for chronic weight management in genetic obesity caused by POMC, PCSK1, or LEPR deficiency. Demonstrates the MC4R pathway's established role in energy and appetite — the same pathway PT-141 engages for sexual function.",
      },
      {
        type: "h2",
        text: "PT-141 in Women's Research",
      },
      {
        type: "p",
        text: "The FDA approval of bremelanotide as Vyleesi for HSDD in premenopausal women is the clearest clinical validation of the melanocortin pathway in human sexual function to date. Most common adverse effects in trials: nausea (40%), flushing (20%), injection site reactions, transient blood pressure increases. These mirror the MT-II side effect profile and inform dosing caution in research contexts.",
      },
      {
        type: "callout",
        text: "PT-141 (bremelanotide) is available through research vendors for laboratory and investigational use only. It is not approved for the indications described above outside of the FDA-approved Vyleesi formulation, which requires a prescription. Nothing in this article constitutes medical advice. Consult a qualified physician for any therapeutic application.",
      },
      {
        type: "cta",
        text: "View PT-141 at PSPeptides",
        productSlug: "pt-141",
        vendor: "PSPeptides",
        affiliateUrl: "https://pspeptides.com/product/buy-pt-141/?ref=aurapro",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Why doesn't PT-141 cause tanning like Melanotan II?",
            a: "PT-141 has significantly reduced activity at MC1R — the receptor responsible for melanin production. This was a deliberate modification from MT-II, which stimulated all four receptor subtypes including MC1R. PT-141 retains functional selectivity toward MC3R and MC4R with minimal pigmentation effect.",
          },
          {
            q: "Can PT-141 work if Viagra doesn't?",
            a: "The mechanistic argument is yes — specifically in neurogenic ED where the peripheral nerve signal is compromised. PDE5 inhibitors require an intact nitric oxide signal from the cavernous nerve; PT-141 initiates arousal centrally and may bypass a damaged peripheral pathway. This is not established in large RCTs for post-prostatectomy patients specifically, but the physiological rationale is supported by preclinical and mechanistic research.",
          },
          {
            q: "What's the difference between PT-141 and Vyleesi?",
            a: "Vyleesi is the FDA-approved, pharmaceutical-grade injectable formulation of bremelanotide for HSDD in premenopausal women. Research-grade PT-141 from peptide vendors is the same molecule produced for laboratory use. Purity, sterility, and dosing consistency vary significantly between pharmaceutical and research-grade sources.",
          },
          {
            q: "How does PT-141 compare to other post-RARP options?",
            a: "Current standard-of-care includes oral PDE5 inhibitors, intracavernosal injections (alprostadil), penile rehabilitation programs, and vacuum erection devices. PT-141 is not part of standard urological practice post-RARP; its potential relevance lies in its different mechanism of action for patients who don't respond adequately to PDE5 inhibitors. Any post-surgical sexual health protocol should be managed by a urologist.",
          },
          {
            q: "Is PT-141 being studied for prostate cancer survivors specifically?",
            a: "As of mid-2026, there are no published large-scale RCTs specifically evaluating PT-141 in post-RARP patients. The mechanistic rationale exists and melanocortin agonists are actively discussed in sexual medicine research, but dedicated prostate cancer survivor trials remain a gap in the published literature.",
          },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "bpc-157-complete-guide",
    ruo: true,
    title: "BPC-157: A Research Literature Summary",
    excerpt:
      "A synthetic 15-residue peptide from a sequence first found in gastric juice. What laboratory studies have measured — VEGFR2 signaling, tendon-fibroblast migration and growth hormone receptor expression — and what is still unknown.",
    category: "Peptide Fragments",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "BPC-157 has been studied since the 1990s, almost entirely in animal and cell-culture models. This summary covers what those laboratory studies measured, how strong the evidence is, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "BPC-157 is a synthetic pentadecapeptide, Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val (molecular formula C62H98N16O22, molecular weight 1419.5 g/mol, CAS 137525-51-0). Its sequence is a partial sequence of a protein, \"body protection compound\", reported in human gastric juice.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Angiogenesis signaling: Hsieh and colleagues (Journal of Molecular Medicine, 2017) reported that BPC-157 increased vessel density in the chick chorioallantoic membrane assay and in endothelial tube-formation assays, and increased blood-vessel number and VEGFR2 expression in a rat hind-limb ischemia model. In human vascular endothelial cells it raised VEGFR2 mRNA and protein (but not VEGF-A), promoted VEGFR2 internalisation, and activated VEGFR2–Akt–eNOS signaling; blocking endocytosis with dynasore suppressed those effects.",
      },
      {
        type: "p",
        text: "Tendon fibroblasts: Chang and colleagues (Journal of Applied Physiology, 2011) found that BPC-157 accelerated outgrowth of fibroblasts from rat Achilles tendon explants, increased their survival under hydrogen-peroxide stress and their migration, without directly changing proliferation, and increased FAK and paxillin phosphorylation. A follow-up (Molecules, 2014) found growth hormone receptor among the most up-regulated genes in those fibroblasts, with downstream JAK2 activation when growth hormone was added.",
      },
      {
        type: "callout",
        text: "These findings come from cell culture, explants and animal models. They describe what BPC-157 does to signaling pathways and tissue measurements in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "VEGFR2 expression, internalisation and VEGFR2–Akt–eNOS activation in endothelial cells; vessel density in CAM and rat hind-limb models (Hsieh et al., 2017)",
          "Tendon-fibroblast outgrowth, survival under oxidative stress and migration, with FAK–paxillin activation (Chang et al., 2011)",
          "Growth hormone receptor up-regulation in tendon fibroblasts (Chang et al., 2014)",
          "A 2025 systematic review of the orthopaedic literature found 36 eligible studies, 35 of them preclinical, and reported a half-life under 30 minutes with liver metabolism and renal clearance (Vasireddi et al., 2025)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Primary target: the receptor or binding partner through which BPC-157 starts these signaling changes has not been identified experimentally.",
          "Stability: a reported half-life under 30 minutes sits awkwardly with effects measured hours or days later; what species is active in vivo is unresolved.",
          "Concentration of authorship: much of the animal literature comes from a small number of groups, and independent replication is limited.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "BPC-157 is not approved by the FDA for any use. BPC-157-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 23, 2026, as candidates for the 503A bulk drug substances list, and the committee voted to recommend it. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies BPC-157 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Where does the BPC-157 sequence come from?",
            a: "It is a 15-residue partial sequence of \"body protection compound\", a protein reported in human gastric juice. The research material is made by peptide synthesis.",
          },
          {
            q: "What kind of evidence exists for BPC-157?",
            a: "Cell-culture, explant and animal studies; the 2025 systematic review counted 35 preclinical studies among 36 it included. No laboratory result here shows an effect in people.",
          },
          {
            q: "Is BPC-157 FDA-approved?",
            a: "No. A July 2026 FDA advisory committee voted to recommend it for the 503A bulk drug substances list; that vote is advisory and is not an approval.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Hsieh MJ, Liu HT, Wang CN, et al. \"Therapeutic potential of pro-angiogenic BPC157 is associated with VEGFR2 activation and up-regulation.\" Journal of Molecular Medicine. 2017;95(3):323-333. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27847966/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Chang CH, Tsai WC, Lin MS, et al. \"The promoting effect of pentadecapeptide BPC 157 on tendon healing involves tendon outgrowth, cell survival, and cell migration.\" Journal of Applied Physiology. 2011;110(3):774-780. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/21030672/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Chang CH, Tsai WC, Hsu YH, Pang JH. \"Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts.\" Molecules. 2014;19(11):19066-19077. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/25415472/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Vasireddi N, Hahamyan H, Salata MJ, et al. \"Emerging Use of BPC-157 in Orthopaedic Sports Medicine: A Systematic Review.\" HSS Journal. 2025;21(4):485-495. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/40756949/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by NPR, July 23, 2026: ",
          { href: "https://www.npr.org/2026/07/23/nx-s1-5903202/fda-peptides-restrictions", text: "npr.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "tb-500-complete-guide",
    ruo: true,
    title: "TB-500 (Thymosin Beta-4 17–23): A Research Literature Summary",
    excerpt:
      "An N-acetylated heptapeptide matching the actin-binding region of thymosin beta-4. What laboratory studies of the fragment and of the full protein have measured, and why the two shouldn't be confused.",
    category: "Peptide Fragments",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "TB-500 is a short synthetic fragment of thymosin beta-4 (Tβ4), a 43-residue protein found in most cell types. Most of the published research is on full-length Tβ4, not on the fragment, and the two are often treated as the same thing. This summary keeps them apart: what the fragment is, what studies of Tβ4 and of its fragments have measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "TB-500 is the N-acetylated heptapeptide Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln (Ac-LKKTETQ; molecular formula C38H68N10O14, molecular weight 889.0 g/mol, CAS 885340-08-9). The sequence LKKTETQ is residues 17–23 of thymosin beta-4, the segment described as its central actin-binding site (Ho et al., 2012).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Thymosin beta-4 is a major intracellular G-actin-sequestering protein: it binds actin monomers and holds them out of filaments, which bears on cell migration. Studies of the full protein report extracellular effects as well. Tokura and colleagues (Journal of Biochemistry, 2011) found Tβ4 mRNA up-regulated early in regenerating mouse skeletal muscle, and Tβ4 and its sulphoxide form increased chemotaxis and wound closure of C2C12 myoblasts. Srivastava and colleagues (2007) reported that Tβ4 formed a complex with PINCH and integrin-linked kinase, activating Akt in cardiomyocytes, and measured myocyte survival and cardiac function after coronary artery ligation in mice.",
      },
      {
        type: "p",
        text: "Work on fragments is thinner. Dettin and colleagues (Cellular Immunology, 2011) synthesised three Tβ4 fragments overlapping the central actin-binding site and found that each kept the native conformation and showed pro-angiogenic effects in vitro and in vivo, with activity modulated by the N-terminal region of the protein. Ho and colleagues (2012) developed a mass-spectrometry method that detects Ac-LKKTETQ and its metabolites in horse plasma and urine, the first measurement of the fragment in post-administration samples.",
      },
      {
        type: "callout",
        text: "These findings come from cell culture, mouse models and equine analytical work, and most of them are about full-length thymosin beta-4 rather than the TB-500 fragment. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Full-length Tβ4: up-regulated in regenerating mouse muscle; chemotaxis and wound closure of C2C12 myoblasts (Tokura et al., 2011)",
          "Full-length Tβ4: PINCH–ILK complex and Akt activation in cardiomyocytes; cardiac measurements after coronary ligation in mice (Srivastava et al., 2007)",
          "Tβ4 fragments overlapping the actin-binding site: native conformation and pro-angiogenic activity in vitro and in vivo (Dettin et al., 2011)",
          "Ac-LKKTETQ and its metabolites detected by LC-MS in equine plasma and urine (Ho et al., 2012)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Fragment versus protein: how much of full-length Tβ4's measured activity the 17–23 fragment reproduces is largely untested; Dettin and colleagues found the N-terminal region modulates fragment activity.",
          "Extracellular mechanism: Tβ4 is mainly intracellular, and how it acts from outside the cell is not fully worked out.",
          "Metabolism: the fragment is broken down into smaller metabolites (Ho et al., 2012), which matters for interpreting any in vivo result.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "TB-500 is not approved by the FDA for any use. TB-500-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 23, 2026, as candidates for the 503A bulk drug substances list, and the committee voted to recommend it. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies TB-500 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is TB-500 the same as thymosin beta-4?",
            a: "No. TB-500 is a seven-residue fragment (residues 17–23, N-acetylated) of the 43-residue thymosin beta-4 protein. Most published research is on the full protein.",
          },
          {
            q: "Why the actin-binding region?",
            a: "LKKTETQ is the part of thymosin beta-4 described as its central actin-binding site, the property most of the protein's biology is attributed to.",
          },
          {
            q: "What kind of evidence exists for TB-500?",
            a: "For the fragment itself: synthesis and conformation studies, angiogenesis assays on overlapping fragments, and analytical detection work. For full-length Tβ4: cell-culture and mouse studies. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Ho EN, Kwok WH, Lau MY, et al. \"Doping control analysis of TB-500, a synthetic version of an active region of thymosin β4, in equine urine and plasma by liquid chromatography-mass spectrometry.\" Journal of Chromatography A. 2012;1265:57-69. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/23084823/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Tokura Y, Nakayama Y, Fukada S, et al. \"Muscle injury-induced thymosin β4 acts as a chemoattractant for myoblasts.\" Journal of Biochemistry. 2011;149(1):43-48. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/20880960/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Srivastava D, Saxena A, Michael Dimaio J, et al. \"Thymosin beta4 is cardioprotective after myocardial infarction.\" Annals of the New York Academy of Sciences. 2007;1112:161-170. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/17600280/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Dettin M, Ghezzo F, Conconi MT, et al. \"In vitro and in vivo pro-angiogenic effects of thymosin-β4-derived peptides.\" Cellular Immunology. 2011;271(2):299-307. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/21872226/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by NCPA, July 31, 2026: ",
          { href: "https://ncpa.org/newsroom/qam/2026/07/31/fda-advisory-committee-nominates-six-peptides-pharmacies-compound", text: "ncpa.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "semaglutide-vs-tirzepatide",
    ruo: true,
    title: "Semaglutide and Tirzepatide: How the Two Molecules Differ",
    excerpt:
      "A single-receptor GLP-1 analog and a dual GIP/GLP-1 receptor agonist. How their structures differ, and what receptor-pharmacology studies show about how each engages its targets.",
    category: "Incretin & Amylin Analogs",
    date: "March 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Semaglutide and tirzepatide are both fatty-acid-modified peptides that act on incretin receptors, but they are built differently and engage different receptors. This summary compares their structures and what laboratory pharmacology studies have measured about each. It does not cover clinical literature.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "h3",
        text: "Semaglutide",
      },
      {
        type: "p",
        text: "Semaglutide (C187H291N45O59, 4114.0 g/mol, CAS 910463-68-2) is an analog of human glucagon-like peptide-1 (GLP-1). It has two amino-acid substitutions relative to GLP-1, aminoisobutyric acid (Aib) at position 8 and arginine at position 34, and it is derivatized at lysine 26 with a fatty-acid side chain through a linker (Lau et al., 2015).",
      },
      {
        type: "h3",
        text: "Tirzepatide",
      },
      {
        type: "p",
        text: "Tirzepatide (C225H348N48O68, 4813.0 g/mol, CAS 2023788-19-2), developed as LY3298176, is a fatty-acid-modified synthetic peptide with agonist activity at both the glucose-dependent insulinotropic polypeptide (GIP) receptor and the GLP-1 receptor (Coskun et al., 2018).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Semaglutide was designed, starting from the earlier analog liraglutide, to raise albumin affinity and secure full stability against metabolic degradation. Lau and colleagues (Journal of Medicinal Chemistry, 2015) reported that the fatty-acid moiety and its linking chemistry were the key features for albumin affinity and GLP-1 receptor potency. Compared with liraglutide, semaglutide's GLP-1 receptor affinity was about three-fold lower and its albumin affinity higher; its plasma half-life in mini-pigs was 46.1 hours after intravenous administration.",
      },
      {
        type: "p",
        text: "Tirzepatide activates both GIP and GLP-1 receptor signaling in cell lines expressing those receptors (Coskun et al., 2018). Willard and colleagues (JCI Insight, 2020) characterised it further as an imbalanced and biased agonist: it engages the GIP receptor more than the GLP-1 receptor, mimics native GIP at the GIP receptor, and at the GLP-1 receptor favours cAMP generation over β-arrestin recruitment, with weaker receptor internalisation than GLP-1. In primary islets, β-arrestin-1 limited the insulin response to GLP-1 but not to GIP or tirzepatide.",
      },
      {
        type: "callout",
        text: "These findings come from receptor and signaling assays, isolated islets and animal pharmacokinetics. They describe how each molecule engages its receptors in those systems.",
      },
      { type: "h2", text: "The Differences at a Glance" },
      {
        type: "ul",
        items: [
          "Receptors: semaglutide acts at the GLP-1 receptor; tirzepatide at both the GIP and GLP-1 receptors",
          "Balance: tirzepatide engages the GIP receptor more than the GLP-1 receptor (Willard et al., 2020)",
          "Signaling at the GLP-1 receptor: tirzepatide favours cAMP over β-arrestin recruitment (Willard et al., 2020)",
          "Half-life extension: both carry a fatty-acid modification; for semaglutide, albumin binding through the fatty-acid side chain and its linker was the design lever (Lau et al., 2015)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Which part of tirzepatide's activity comes from GIP receptor agonism and which from its biased GLP-1 receptor signaling is still being separated experimentally.",
          "Receptor occupancy and signaling bias can differ between recombinant cell lines and native tissue, so assay choice matters when comparing the two.",
          "Much of the characterisation is published by the developers' own scientists, as is usual for drug candidates; independent pharmacology is thinner.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Semaglutide and tirzepatide are active ingredients of FDA-approved prescription medicines. Research-grade material sold for laboratory use is not an approved drug and is not for human use. Aura Protocols supplies both as research chemicals for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "What is the main structural difference?",
            a: "Semaglutide is a GLP-1 analog with two substitutions and a fatty-acid side chain on lysine 26. Tirzepatide is a separate synthetic peptide, also fatty-acid modified, built to act at both the GIP and GLP-1 receptors.",
          },
          {
            q: "What does \"biased agonist\" mean for tirzepatide?",
            a: "At the GLP-1 receptor it favours one signaling route (cAMP generation) over another (β-arrestin recruitment), compared with native GLP-1 (Willard et al., 2020).",
          },
          {
            q: "Does this summary cover clinical trials?",
            a: "No. It covers structure and laboratory pharmacology only.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Lau J, Bloch P, Schäffer L, et al. \"Discovery of the Once-Weekly Glucagon-Like Peptide-1 (GLP-1) Analogue Semaglutide.\" Journal of Medicinal Chemistry. 2015;58(18):7370-7380. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/26308095/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Coskun T, Sloop KW, Loghin C, et al. \"LY3298176, a novel dual GIP and GLP-1 receptor agonist for the treatment of type 2 diabetes mellitus: From discovery to clinical proof of concept.\" Molecular Metabolism. 2018;18:3-14. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/30473097/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Willard FS, Douros JD, Gabe MB, et al. \"Tirzepatide is an imbalanced and biased dual GIP and GLP-1 receptor agonist.\" JCI Insight. 2020;5(17):e140532. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/32730231/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. PubChem. Semaglutide (CID 56843331) and Tirzepatide (CID 166567236). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/56843331", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "cjc-1295-ipamorelin-stack",
    title: "CJC-1295 / Ipamorelin: The Complete Research Guide",
    excerpt:
      "Two receptors, one synergistic effect — and one of the few stacks on this site backed by real human clinical data, not just animal models.",
    category: "Growth & Performance",
    date: "July 2026",
    readTime: "8 min read",
    content: [
      {
        type: "intro",
        text: "CJC-1295 paired with Ipamorelin is one of the most-cited growth hormone secretagogue combinations in the research-peptide space — and unusually for this site, part of the reason is that a piece of the mechanism has actually been tested in humans, not just animal models.",
      },
      { type: "h2", text: "Understanding Each Compound" },
      { type: "h3", text: "CJC-1295 (with DAC)" },
      {
        type: "p",
        text: "CJC-1295 is a synthetic analogue of growth hormone-releasing hormone (GHRH). The DAC (Drug Affinity Complex) modification extends its half-life from minutes to approximately 6–8 days by binding to serum albumin, producing sustained elevation of baseline GH and IGF-1 rather than sharp pulses.",
      },
      { type: "h3", text: "Ipamorelin" },
      {
        type: "p",
        text: "Ipamorelin is a synthetic pentapeptide and selective agonist at the ghrelin receptor (GHSR-1a) in the pituitary. Its foundational 1998 characterization established it as the first selective GH secretagogue — stimulating GH release without significantly elevating cortisol, ACTH, or prolactin, unlike earlier GHRPs (GHRP-2, GHRP-6), which do raise cortisol and ACTH.",
      },
      { type: "h2", text: "Why the Combination Works" },
      {
        type: "p",
        text: "CJC-1295 and Ipamorelin act on two distinct receptor systems in the GH axis — the GHRH receptor and the ghrelin receptor, respectively. Human studies of ghrelin combined with GHRH found the two peptides stimulate GH release synergistically: the combined GH response exceeded the sum of each peptide's individual response. Mechanistic work on the pituitary receptors found GHRH increases the ghrelin receptor's binding capacity in a dose-dependent way (positive binding cooperativity), and that GH secretagogues potentiate GHRH-induced cAMP production at the cellular level — a plausible molecular basis for the synergy seen in human dosing studies.",
      },
      {
        type: "ul",
        items: [
          "CJC-1295 raises the baseline of GH secretion via sustained GHRH-receptor activation",
          "Ipamorelin activates the separate ghrelin-receptor pathway, selectively, without cortisol/ACTH elevation",
          "Human ghrelin+GHRH dosing studies found the combined GH response exceeds either peptide's individual response",
          "A human trial of CJC-1295 alone found sustained, dose-dependent GH and IGF-I increases at 30–60 mcg/kg, safe and well tolerated",
        ],
      },
      {
        type: "callout",
        text: "The human data above is for the individual mechanisms (CJC-1295 alone; ghrelin+GHRH synergy) — there is no published human trial of the specific CJC-1295+Ipamorelin combination as sold by research vendors. The synergy mechanism is human-validated; the specific stack is not.",
      },
      { type: "h2", text: "What the Broader Research Shows" },
      {
        type: "ul",
        items: [
          "Increased lean body mass in animal models of sustained GH/IGF-1 elevation",
          "Reduction in adipose tissue, particularly visceral fat, in animal models",
          "Improved sleep quality reported in connection with GH's role in slow-wave sleep",
          "Enhanced recovery from exercise-induced muscle damage in preclinical studies",
        ],
      },
      {
        type: "callout",
        text: "CJC-1295 and Ipamorelin are research compounds only. Neither has been approved by the FDA for human use. The lean-mass, fat-reduction, and recovery findings above are from preclinical models, not human trials.",
      },
      { type: "h2", text: "Where to Source CJC-1295 / Ipamorelin for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the CJC-1295 / Ipamorelin product page",
        productSlug: "cjc-1295-ipamorelin",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is there human evidence for CJC-1295 and Ipamorelin, or is it all animal studies?",
            a: "Partial. CJC-1295 alone has a published human dosing trial showing sustained, dose-dependent GH/IGF-1 increases. The GHRH+ghrelin synergy mechanism has also been demonstrated in humans. But the specific combination product sold by research vendors has not itself been through a published human trial — the lean-mass and fat-reduction findings for the stack specifically are animal-model data.",
          },
          {
            q: "Why doesn't Ipamorelin raise cortisol like older GH secretagogues?",
            a: "Its original 1998 characterization found it selectively activates the ghrelin receptor pathway for GH release without the cross-activity on ACTH/cortisol pathways seen with older GHRPs like GHRP-6 and GHRP-2 — a deliberate selectivity improvement, not an accident of dosing.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Teichman SL, et al. \"Prolonged stimulation of growth hormone (GH) and insulin-like growth factor I secretion by CJC-1295, a long-acting analog of GH-releasing hormone, in healthy adults.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/16352683/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Raun K, et al. \"Ipamorelin, the first selective growth hormone secretagogue.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/9849822/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. \"A low dose of ghrelin stimulates growth hormone (GH) release synergistically with GH-releasing hormone in humans.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/11549707/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. \"Ghrelin and Growth Hormone (GH) Secretagogues Potentiate GH-Releasing Hormone (GHRH)-Induced Cyclic AMP Production...\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/12446584/", text: "PubMed", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "best-peptides-for-weight-loss",
    title: "Best Peptides for Weight Loss: What the Research Shows",
    excerpt:
      "A research-backed breakdown of the most studied peptides for fat loss, appetite control, and metabolic optimization.",
    category: "Weight Management",
    date: "April 2026",
    readTime: "9 min read",
    content: [
      {
        type: "intro",
        text: "The peptide space has produced some of the most compelling weight management research in recent history. From GLP-1 receptor agonists to growth hormone secretagogues, several compounds have demonstrated significant fat loss effects in controlled studies. Here's what the evidence actually shows.",
      },
      {
        type: "h2",
        text: "1. Semaglutide — The Benchmark",
      },
      {
        type: "p",
        parts: [
          { href: "/products/semaglutide", text: "Semaglutide" },
          " remains the most clinically studied peptide for weight loss. As a GLP-1 receptor agonist, it works by slowing gastric emptying, reducing appetite signals in the hypothalamus, and improving insulin sensitivity. The STEP trials showed an average of 15–17% body weight reduction over 68 weeks — results previously unseen outside of bariatric surgery.",
        ],
      },
      {
        type: "ul",
        items: [
          "15–17% average body weight reduction in STEP clinical trials",
          "Significant reduction in waist circumference and visceral fat",
          "Improved fasting glucose and HbA1c",
          "Cardiovascular risk reduction in SELECT trial",
        ],
      },
      {
        type: "h2",
        text: "2. CJC-1295 / Ipamorelin — Indirect Fat Loss via GH",
      },
      {
        type: "p",
        text: "Growth hormone has well-documented lipolytic effects — it directly stimulates the breakdown of stored fat (lipolysis) and inhibits fat storage. CJC-1295 paired with Ipamorelin produces sustained, physiological GH elevation that supports fat metabolism, particularly visceral and subcutaneous adipose tissue reduction.",
      },
      {
        type: "ul",
        items: [
          "GH-mediated lipolysis — direct fat cell breakdown",
          "Preferential loss of visceral fat in animal models",
          "Preservation of lean muscle mass during caloric restriction",
          "Improved insulin sensitivity over time",
        ],
      },
      {
        type: "cta",
        text: "View CJC-1295 / Ipamorelin at American Peptides",
        productSlug: "cjc-1295-ipamorelin",
        vendor: "American Peptides",
        affiliateUrl: "https://www.americanpeptides.us/discount/AURAPRO10?ref=ngEbqLb06k&redirect=/products/cjc-1295-no-dac-ipamorelin",
      },
      {
        type: "h2",
        text: "3. BPC-157 — Supporting the Metabolic Environment",
      },
      {
        type: "p",
        parts: [
          "While ",
          { href: "/products/bpc-157", text: "BPC-157" },
          " is not a direct fat loss compound, its role in gut healing and metabolic regulation deserves mention in weight management research — see our ",
          { href: "/blog/bpc-157-complete-guide", text: "complete BPC-157 research guide" },
          " for the full mechanism breakdown. Gut microbiome health and intestinal barrier integrity are increasingly recognized as critical factors in metabolic health and body composition. BPC-157's documented effects on gut mucosal healing may support an optimal metabolic environment.",
        ],
      },
      {
        type: "h2",
        text: "Stacking Considerations",
      },
      {
        type: "p",
        text: "Research contexts often combine compounds with complementary mechanisms. A GLP-1 agonist like semaglutide addresses appetite and insulin signaling, while a GH secretagogue stack addresses direct lipolysis and muscle preservation. These are distinct pathways that can theoretically be studied in combination — though this requires careful protocol design.",
      },
      {
        type: "callout",
        text: "All peptides discussed in this article are research compounds only. They are not approved for weight loss treatment and must not be used as substitutes for medical care. Consult a qualified physician for any weight management concerns.",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "peptides-for-libido-sexual-health",
    title: "Peptides for Libido & Sexual Health: PT-141 and Beyond",
    excerpt:
      "An evidence-based look at peptides studied for libido enhancement and sexual function in both men and women.",
    category: "Wellness",
    date: "April 2026",
    readTime: "7 min read",
    content: [
      {
        type: "intro",
        text: "Sexual health is a dimension of wellness that is increasingly being studied through the lens of peptide biology. Unlike traditional approaches that target hormones or vascular function, several peptides operate through central nervous system pathways — specifically the melanocortin system — to influence libido and sexual response at the neurological level.",
      },
      {
        type: "h2",
        text: "PT-141 (Bremelanotide) — The Most Studied",
      },
      {
        type: "p",
        text: "PT-141 is a synthetic analogue of alpha-melanocyte-stimulating hormone (α-MSH) and acts as a melanocortin receptor agonist — specifically at MC3R and MC4R receptors in the central nervous system. Unlike PDE5 inhibitors (sildenafil, tadalafil) which work primarily through vascular mechanisms, PT-141 activates the neural pathways that initiate sexual desire.",
      },
      {
        type: "ul",
        items: [
          "Acts centrally via melanocortin receptors — not vascular",
          "Studied in both male and female sexual dysfunction models",
          "FDA approved version (Vyleesi) exists for hypoactive sexual desire disorder in premenopausal women",
          "Studied for effects on sexual desire and arousal independent of hormonal status",
          "Effects reported within 45–60 minutes in clinical studies",
        ],
      },
      {
        type: "h3",
        text: "Research in Women",
      },
      {
        type: "p",
        text: "PT-141 has been studied in women with hypoactive sexual desire disorder (HSDD). Double-blind trials demonstrated statistically significant improvements in sexual desire scores compared to placebo. The central mechanism of action makes it particularly relevant for desire-phase dysfunction, which is distinct from arousal or physiological response issues.",
      },
      {
        type: "h3",
        text: "Research in Men",
      },
      {
        type: "p",
        text: "In men, PT-141 has been studied both as a standalone compound and in combination with PDE5 inhibitors. Research shows improvements in erectile function scores, with the central pathway providing benefit even in cases where vascular approaches are insufficient. The dual mechanism — central desire activation plus possible peripheral effects — makes it a distinctive research subject.",
      },
      {
        type: "h2",
        text: "The Role of BPC-157 in Sexual Health",
      },
      {
        type: "p",
        parts: [
          { href: "/products/bpc-157", text: "BPC-157" },
          "'s nitric oxide modulating properties have generated interest in its potential role in vascular aspects of sexual function. Nitric oxide is a key mediator of penile erection and clitoral engorgement. While direct sexual health studies on BPC-157 are limited, its effects on NO pathways and vascular health represent an emerging area of research interest — see our ",
          { href: "/blog/bpc-157-complete-guide", text: "BPC-157 research guide" },
          " for more.",
        ],
      },
      {
        type: "h2",
        text: "Hormonal Context: Sermorelin and Testosterone",
      },
      {
        type: "p",
        parts: [
          "Growth hormone and IGF-1 play supporting roles in sexual health — they influence energy, mood, and hormonal balance. ",
          { href: "/products/sermorelin", text: "Sermorelin" },
          ", as a GHRH analogue, stimulates natural GH production and has been studied in the context of age-related hormonal decline. In men with low GH status, restoration of GH levels has been associated with improvements in sexual function markers.",
        ],
      },
      {
        type: "h2",
        text: "Key Considerations for Researchers",
      },
      {
        type: "ul",
        items: [
          "PT-141 is the most directly studied peptide for sexual function",
          "Central vs. peripheral mechanisms are an important distinction in study design",
          "Hormonal baseline (testosterone, estrogen, GH) should be characterized in any study",
          "Nausea is the most commonly reported side effect of PT-141 in clinical trials",
          "Flushing and transient blood pressure changes have been observed at higher doses",
        ],
      },
      {
        type: "callout",
        text: "All compounds discussed are for research purposes only. Sexual health concerns should be addressed with a qualified healthcare professional. PT-141 (Vyleesi) is FDA-approved only for a specific indication in premenopausal women under medical supervision.",
      },
      {
        type: "cta",
        text: "View PT-141 Vendors",
        productSlug: "pt-141",
        vendor: "PSPeptides",
        affiliateUrl: "https://pspeptides.com/product/buy-pt-141/?ref=aurapro",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "how-to-read-a-peptide-coa",
    ruo: true,
    title: "How to Read a Peptide Certificate of Analysis",
    excerpt:
      "What a certificate of analysis contains, what HPLC and mass spectrometry each establish, and what to check before a lot goes into an experiment.",
    category: "Testing & Analysis",
    date: "February 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "A certificate of analysis (COA) is the laboratory's record of what was measured in one specific lot of material. For a research peptide, it is how you confirm that what is in the vial is the molecule on the label, at the purity stated, before it goes into an experiment. This guide explains what a COA contains and how to read it.",
      },
      { type: "h2", text: "What a COA Should Include" },
      {
        type: "ul",
        items: [
          "Compound name and the lot (batch) number tested",
          "The testing laboratory's name, and its accreditation (for example ISO/IEC 17025)",
          "The date the sample was tested",
          "HPLC purity result, with the method",
          "Mass spectrometry result confirming molecular identity",
          "For some compounds, additional tests such as peptide content, moisture or residual solvents",
        ],
      },
      { type: "h2", text: "HPLC: How Pure the Sample Is" },
      {
        type: "p",
        text: "High-performance liquid chromatography (HPLC) separates the components of a sample and reports what share of the detected material is the target compound. The rest is impurities: shorter or modified sequences left over from synthesis, degradation products, or unrelated material. A chromatogram with one dominant peak and small, well-separated minor peaks is what a clean lot looks like.",
      },
      {
        type: "p",
        text: "HPLC purity is relative: it measures the target against the other components the detector sees. It does not by itself confirm what the main peak is. That is the job of mass spectrometry.",
      },
      { type: "h2", text: "Mass Spectrometry: What the Molecule Is" },
      {
        type: "p",
        text: "Mass spectrometry (MS) measures the mass of the molecules in the sample. The observed mass should match the compound's theoretical molecular weight within the instrument's stated tolerance. A COA with both HPLC and MS shows that the material is the right molecule and how pure it is; HPLC alone shows only the second.",
      },
      { type: "h2", text: "Red Flags" },
      {
        type: "ul",
        items: [
          "No laboratory name, or testing done in-house by the seller",
          "A certificate not tied to a specific lot number, or a lot number that doesn't match the vial",
          "Purity reported without a method",
          "HPLC without any identity test",
          "No test date, or a certificate that cannot be checked against the laboratory's own records",
        ],
      },
      { type: "h2", text: "How Aura Protocols Certificates Work" },
      {
        type: "p",
        parts: [
          "Every Aura Protocols lot is tested by a third-party laboratory before it is listed: mass spectrometry for identity and HPLC for purity, with a 99% purity floor. The lot number on the certificate matches the lot number on the vial. Certificates are on each product page and in the ",
          { href: "/coa", text: "COA Lookup" },
          " by lot number; a product marked \"COA pending\" cannot be ordered until its certificate is posted. See ",
          { href: "/quality-standards", text: "Quality Standards" },
          " for the full criteria.",
        ],
      },
      {
        type: "callout",
        text: "Before a lot goes into an experiment, match three things: the compound name, the lot number on the vial, and the lot number on the certificate.",
      },
      {
        type: "disclaimer",
        text: "This guide explains laboratory documentation. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "ss-31-elamipretide-research-guide",
    ruo: true,
    title: "SS-31 (Elamipretide): A Research Literature Summary",
    excerpt:
      "The tetrapeptide D-Arg-Dmt-Lys-Phe-NH₂. What laboratory studies have measured — cardiolipin binding, cytochrome c peroxidase inhibition, cristae structure and membrane electrostatics — and what is still unknown.",
    category: "Mitochondrial & Metabolic",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "SS-31 is one of the Szeto–Schiller (SS) peptides, a class of small amphipathic tetrapeptides that target the inner mitochondrial membrane; much of the work on them comes from H. H. Szeto's group at Weill Cornell Medical College. Its laboratory literature centres on one lipid, cardiolipin. This summary covers what SS-31 is, what those studies measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "SS-31 (elamipretide) is the synthetic tetrapeptide D-Arg-Dmt-Lys-Phe-NH₂, where Dmt is 2′,6′-dimethyltyrosine (molecular formula C32H49N9O5, molecular weight 639.8 g/mol, CAS 736992-21-5). Its alternating basic and aromatic residues make it polybasic and amphipathic.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Cardiolipin binding: cardiolipin is a phospholipid found only in the inner mitochondrial membrane, where it shapes the cristae and organises the respiratory complexes. Using a fluorescent analog, Birk and colleagues (Journal of the American Society of Nephrology, 2013) showed that SS-31 binds cardiolipin with high affinity, and that the SS-31–cardiolipin complex inhibited the peroxidase activity of cytochrome c, which drives cardiolipin peroxidation. In a rat renal ischemia model, pretreatment preserved cristae membranes and prevented mitochondrial swelling, and ATP recovered faster on reperfusion.",
      },
      {
        type: "p",
        text: "Membrane physics: Mitchell and colleagues (Journal of Biological Chemistry, 2020) found that SS-31 partitions into the membrane interface with an affinity and binding density tied to surface charge. It did not destabilise lipid bilayers even at the highest concentrations tested, caused saturable changes in lipid packing, modulated the surface electrostatics of model and mitochondrial membranes, and altered the calcium burden of isolated mitochondria under calcium stress.",
      },
      {
        type: "callout",
        text: "These findings come from model membranes, isolated mitochondria and animal models. They describe how SS-31 interacts with mitochondrial membranes in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "High-affinity cardiolipin binding; inhibition of cytochrome c peroxidase activity (Birk et al., 2013)",
          "Cristae preserved and mitochondrial swelling prevented in rat renal ischemia (Birk et al., 2013)",
          "Membrane binding tied to surface charge; surface electrostatics modulated without bilayer disruption (Mitchell et al., 2020)",
          "Altered calcium burden in isolated mitochondria under calcium stress (Mitchell et al., 2020)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Mechanism: cardiolipin binding and membrane-electrostatics effects are both proposed, and Mitchell and colleagues describe them as non-exclusive; how much each contributes is unresolved.",
          "Conflicts of interest: the peptides' inventor, H. H. Szeto, is an author on much of the work and founded the company that licensed them, as the 2020 paper discloses.",
          "Selectivity: reviews report little effect on normal mitochondria (Zhu et al., 2022), and how SS-31 distinguishes stressed from normal membranes is not fully explained.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Elamipretide is the active ingredient of an FDA-approved prescription medicine. Research-grade material sold for laboratory use is not that approved product and is not for human use. SS-31 was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies SS-31 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "What is cardiolipin?",
            a: "A phospholipid found only in the inner mitochondrial membrane, where it shapes the cristae and organises the respiratory complexes (Szeto, 2014).",
          },
          {
            q: "What does \"Dmt\" mean in the sequence?",
            a: "2′,6′-dimethyltyrosine, a modified tyrosine. The first residue, D-arginine, is the D form of the amino acid.",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Biophysical studies on model membranes and isolated mitochondria, and animal ischemia models. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Birk AV, Liu S, Soong Y, et al. \"The mitochondrial-targeted compound SS-31 re-energizes ischemic mitochondria by interacting with cardiolipin.\" Journal of the American Society of Nephrology. 2013;24(8):1250-1261. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/23813215/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Mitchell W, Ng EA, Tamucci JD, et al. \"The mitochondria-targeted peptide SS-31 binds lipid bilayers and modulates surface electrostatics as a key component of its mechanism of action.\" Journal of Biological Chemistry. 2020;295(21):7452-7469. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/32273339/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Szeto HH. \"First-in-class cardiolipin-protective compound as a therapeutic agent to restore mitochondrial bioenergetics.\" British Journal of Pharmacology. 2014;171(8):2029-2050. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/24117165/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Zhu Y, Luo M, Bai X, et al. \"SS-31, a Mitochondria-Targeting Peptide, Ameliorates Kidney Disease.\" Oxidative Medicine and Cellular Longevity. 2022;2022:1295509. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/35707274/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "slu-pp-332-research-guide",
    ruo: true,
    title: "SLU-PP-332: A Research Literature Summary",
    excerpt:
      "A synthetic small-molecule agonist of the estrogen-related receptors ERRα, β and γ. What laboratory studies have measured — mitochondrial respiration in muscle cells and an ERRα-dependent exercise gene program in mice — and what is still unknown.",
    category: "Mitochondrial & Metabolic",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "SLU-PP-332 was developed at Saint Louis University as a chemical tool for switching on the estrogen-related receptors (ERRs) in living animals. It is a small molecule, not a peptide, and its published research comes from one group. This summary covers what it is, what those studies measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "SLU-PP-332 is 4-hydroxy-N′-[(E)-naphthalen-2-ylmethylidene]benzohydrazide (molecular formula C18H14N2O2, molecular weight 290.3 g/mol, CAS 303760-60-3), a synthetic small molecule. It is an agonist of all three estrogen-related receptors, ERRα, ERRβ and ERRγ, with the highest potency at ERRα (Billon et al., 2023). The ERRs are orphan nuclear receptors: no natural hormone ligand is known.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Billon and colleagues (ACS Chemical Biology, 2023) reported that SLU-PP-332 increased mitochondrial function and cellular respiration in a skeletal-muscle cell line, and that it had pharmacokinetic properties suitable for use in mice. In mice it increased type IIa oxidative muscle fibres and induced an acute aerobic-exercise gene program that depended on ERRα, and ERRα activation was required for the endurance changes the authors measured.",
      },
      {
        type: "p",
        text: "A 2024 follow-up from the same group (Billon et al., 2024) gave SLU-PP-332 to diet-induced obese and ob/ob mice and measured whole-body metabolism. The authors reported increased energy expenditure and fatty-acid oxidation, with lower fat-mass accumulation and changes in insulin sensitivity in those models.",
      },
      {
        type: "callout",
        text: "These findings come from a muscle cell line and mouse models. They describe what SLU-PP-332 does to receptor activity, gene programs and metabolic measurements in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Pan-ERR agonist with highest potency at ERRα (Billon et al., 2023)",
          "Mitochondrial function and cellular respiration increased in a skeletal-muscle cell line (Billon et al., 2023)",
          "ERRα-dependent acute aerobic-exercise gene program and more type IIa oxidative fibres in mice (Billon et al., 2023)",
          "Energy expenditure, fatty-acid oxidation, fat mass and insulin sensitivity measured in diet-induced obese and ob/ob mice (Billon et al., 2024)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Independent replication: both papers come from the developing group, and several authors hold stock in a company working on ERR-based compounds, as the 2023 paper discloses.",
          "Selectivity: SLU-PP-332 acts on all three ERRs, and which receptor drives each measured effect beyond the ERRα-dependent exercise program is not fully mapped.",
          "Model gap: all in vivo data are from mice, including genetically obese ob/ob mice; how the findings carry over to other species is unknown.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "SLU-PP-332 is not approved by the FDA for any use, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies SLU-PP-332 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is SLU-PP-332 a peptide?",
            a: "No. It is a synthetic small molecule, a benzohydrazide.",
          },
          {
            q: "What are estrogen-related receptors?",
            a: "ERRα, ERRβ and ERRγ are nuclear receptors that regulate genes for mitochondrial and energy metabolism. Despite the name, they do not bind estrogen, and no natural ligand is known.",
          },
          {
            q: "What kind of evidence exists for SLU-PP-332?",
            a: "Cell-line and mouse studies from the group that developed it. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Billon C, Sitaula S, Banerjee S, et al. \"Synthetic ERRα/β/γ Agonist Induces an ERRα-Dependent Acute Aerobic Exercise Response and Enhances Exercise Capacity.\" ACS Chemical Biology. 2023;18(4):756-771. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/36988910/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Billon C, Schoepke E, Avdagic A, et al. \"A Synthetic ERR Agonist Alleviates Metabolic Syndrome.\" Journal of Pharmacology and Experimental Therapeutics. 2024;388(2):232-240. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/37739806/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. PubChem. SLU-PP-332 (CID 5338394). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/5338394", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "retatrutide-research-guide",
    title: "Retatrutide: The Complete Research Guide",
    excerpt:
      "The triple GIP/GLP-1/glucagon agonist with the strongest weight-loss data of any compound in its class — and a regulatory status well behind the science.",
    category: "Body Composition",
    date: "July 2026",
    readTime: "9 min read",
    content: [
      {
        type: "intro",
        text: "Retatrutide is a single molecule that activates three separate metabolic receptors at once. Its Phase 3 data is the strongest of anything in this category — and it is also, as of this writing, not approved for any use and not legal to distribute for human consumption. Both things are true at the same time, and this guide treats them that way.",
      },
      { type: "h2", text: "What Is Retatrutide?" },
      {
        type: "p",
        text: "Retatrutide is an investigational, once-weekly triple hormone receptor agonist developed by Eli Lilly, activating receptors for GIP (glucose-dependent insulinotropic polypeptide), GLP-1 (glucagon-like peptide-1), and glucagon in a single molecule.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "The reason a triple agonist outperforms a single agonist isn't simply \"three times the appetite suppression\" — it's that the glucagon receptor works through a fundamentally different lever than the other two.",
      },
      {
        type: "ul",
        items: [
          "GLP-1 and GIP receptors reduce calories in — the same appetite-suppression and satiety mechanism behind drugs like semaglutide.",
          "The glucagon receptor increases calories out. Glucagon is usually thought of as insulin's counter-hormone that raises blood sugar, but separately from that, activating its receptor increases energy expenditure and stimulates lipolysis and thermogenesis — the body burning more energy at rest.",
        ],
      },
      {
        type: "p",
        text: "The drug's own discovery paper states the rationale directly: body weight loss is \"augmented by the addition of GCGR-mediated increases in energy expenditure to GIPR- and GLP-1R-driven calorie intake reduction.\" In head-to-head comparisons, triple and dual agonists produced similar reductions in food intake, but only the triple agonist showed markedly elevated energy expenditure — the actual reason retatrutide has outperformed semaglutide in trials, not simply a bigger dose of the same mechanism. Separate Phase 2a data also found significant liver fat reduction in participants with fatty liver disease, attributed to the same triple-receptor activity beyond what caloric restriction alone would explain.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "p",
        text: "Phase 2 data is peer-reviewed and published in NEJM. Phase 3 topline results (TRIUMPH-1 for obesity; TRANSCEND-T2D-1 for type 2 diabetes) were announced by Lilly in 2026, but as of this writing are press-release results, not yet published in a peer-reviewed journal.",
      },
      {
        type: "ul",
        items: [
          "TRIUMPH-1, 12 mg dose, 80 weeks: −28.3% body weight vs. −2.2% for placebo.",
          "TRIUMPH-1, 4 mg dose (single dose-escalation step), 80 weeks: −19.0% vs. −2.2% for placebo.",
          "Common adverse events were gastrointestinal (nausea, diarrhea, constipation, vomiting — dose-dependent) and dysesthesia; discontinuation due to adverse events ranged 4.1%–11.3% across doses vs. 4.9% for placebo.",
        ],
      },
      {
        type: "p",
        text: "An independent 2026 comparative analysis of 26 randomized trials across 12 GLP-1 drugs and co-agonists projected retatrutide's 12 mg efficacy (24.2% weight loss) ahead of tirzepatide and semaglutide at their evaluated doses — the strongest head-to-head positioning of any compound in this category.",
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Retatrutide is investigational. It has not been approved by FDA for any indication, and current federal policy treats it as research-only: it cannot be legally manufactured or distributed for human use, only for investigational research purposes.",
      },
      {
        type: "callout",
        text: "A 2026 investigation found clinics and med spas prescribing retatrutide despite its non-approved, research-only status, with some providers acknowledging to patients that it isn't FDA-approved while still marketing it as effective. That practice does not change the compound's actual regulatory status.",
      },
      {
        type: "p",
        text: "Retatrutide does not appear on FDA's bulk-substances Category 2 or withdrawn-nomination lists at all — unlike BPC-157, it was never eligible for that compounding-eligibility process to begin with, since it has no approved reference drug and no completed marketing application. That's a narrower regulatory status than BPC-157's, not a safer one.",
      },
      { type: "h2", text: "Where to Source Retatrutide for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the Retatrutide product page",
        productSlug: "retatrutide",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is retatrutide FDA-approved?",
            a: "No. As of this writing it has not been approved for any indication and remains investigational — legally, it can only be manufactured or distributed for research use, not sold as a finished product for human use.",
          },
          {
            q: "Why does retatrutide outperform other GLP-1 drugs in trials?",
            a: "It's the only compound in wide comparison that also activates the glucagon receptor, which increases energy expenditure rather than just suppressing appetite — a different mechanism than single or dual agonists rely on.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Eli Lilly. \"About retatrutide\" (TRANSCEND-T2D-1 release), March 2026. ",
          { href: "https://lilly.gcs-web.com/news-releases/news-release-details/lillys-triple-agonist-retatrutide-demonstrated-significant", text: "lilly.gcs-web.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Jastreboff AM, et al. \"Triple–Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial.\" NEJM. ",
          { href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2301972", text: "nejm.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Eli Lilly. TRIUMPH-1 Phase 3 topline results, May 2026 (press release, not yet peer-reviewed). ",
          { href: "https://investor.lilly.com/news-releases/news-release-details/lillys-triple-agonist-retatrutide-delivered-powerful-weight-loss", text: "investor.lilly.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. AJMC. \"Retatrutide Achieves Up to 30.3% Average Weight Loss in Phase 3 TRIUMPH-1 Trial,\" citing Annals of Internal Medicine 26-trial comparative analysis. ",
          { href: "https://www.ajmc.com/view/retatrutide-achieves-up-to-30-3-average-weight-loss-in-phase-3-triumph-1-trial", text: "ajmc.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. CBS News. \"This weight-loss drug hasn't been approved by the FDA. Doctors are prescribing it anyway.\" 2026 investigation. ",
          { href: "https://www.cbsnews.com/projects/2026/experimental-weight-loss-drug/", text: "cbsnews.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. IUPHAR review. \"From foe to friend: Repurposing glucagon to treat obesity and type 2 diabetes.\" ",
          { href: "https://www.sciencedirect.com/science/article/pii/S104366182500502X", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "7. Coskun T, et al. \"LY3437943, a novel triple glucagon, GIP, and GLP-1 receptor agonist... from discovery to clinical proof of concept.\" Cell Metabolism, 2022. ",
          { href: "https://www.sciencedirect.com/science/article/pii/S1550413122003126", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "8. \"Triple hormone receptor agonist retatrutide for metabolic dysfunction-associated steatotic liver disease: a randomized phase 2a trial.\" Nature Medicine. ",
          { href: "https://www.nature.com/articles/s41591-024-03018-2", text: "nature.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "retatrutide-cagrilintide-research-guide",
    title: "Retatrutide + Cagrilintide: The Complete Research Guide",
    excerpt:
      "A co-formulated blend of two investigational, unapproved metabolic peptides — pairing the strongest weight-loss agonist in development with a long-acting amylin analog. Neither is FDA-approved, the combination has never been tested in a human trial, and retatrutide is the single highest-legal-risk compound we index.",
    category: "Stacks",
    date: "August 2026",
    readTime: "8 min read",
    content: [
      {
        type: "disclaimer",
        text: "Research use only. This guide describes two investigational compounds and a combination of them that is not approved by the FDA or any regulator for any use, has never been evaluated in a human clinical trial as a combination, and is sold strictly as a chemical reagent for in-vitro and laboratory research. Nothing here is medical advice, dosing guidance, or an endorsement of human or veterinary use. Do not use these compounds on humans or animals.",
      },
      {
        type: "intro",
        text: "This product pairs retatrutide, a triple GIP/GLP-1/glucagon receptor agonist, with cagrilintide, a long-acting amylin analog, in a single vial (typically 12.5 mg retatrutide / 2.5 mg cagrilintide). The individual compounds each have real, published metabolic science behind them. The combination does not: there is no human trial of retatrutide plus cagrilintide, no approved reference product, and — in retatrutide's case — an active, aggressive enforcement environment. This guide covers the science and is unusually direct about the legal status, because that status is the most important thing to understand before sourcing either compound for research.",
      },
      {
        type: "callout",
        text: "Legal status, up front: Retatrutide is investigational and has NOT been approved by the FDA for any indication. Because it has no approved reference drug and no completed marketing application, federal policy treats it as impossible to legally compound or distribute for human use — only for investigational research. Cagrilintide is likewise investigational and has never been approved as a standalone product. The combination of the two has no approval, no reference product, and no published human data of any kind.",
      },
      { type: "h2", text: "What Each Compound Does" },
      {
        type: "p",
        text: "Retatrutide is an investigational once-weekly triple hormone receptor agonist developed by Eli Lilly. It activates the GIP, GLP-1, and glucagon receptors in a single molecule. The GLP-1 and GIP arms reduce calorie intake through appetite suppression and satiety; the glucagon arm is the differentiator, increasing energy expenditure, lipolysis, and thermogenesis. In Phase 2 (published in NEJM) and Phase 3 topline data (TRIUMPH-1, announced 2026 but not yet peer-reviewed), it produced the largest weight reductions of any compound in its class.",
      },
      {
        type: "p",
        text: "Cagrilintide is a long-acting analog of amylin, a pancreatic hormone co-secreted with insulin that signals satiety and slows gastric emptying through a mechanism entirely separate from the GLP-1 axis. It has been studied primarily in combination with semaglutide (as CagriSema), where the amylin pathway is thought to complement GLP-1 signaling. On its own it remains investigational, with no approved indication.",
      },
      { type: "h2", text: "Why Combine Them?" },
      {
        type: "p",
        text: "The theoretical rationale for a retatrutide + cagrilintide blend is that it stacks two non-overlapping satiety systems — incretin/glucagon signaling (retatrutide) and amylin signaling (cagrilintide) — on the hypothesis that engaging distinct pathways could produce additive effects. This is a hypothesis, not a finding. We want to be explicit: no peer-reviewed human trial has tested this specific combination. Any claim that the pairing is more effective or better tolerated than either compound alone is, at this time, unsupported by clinical evidence.",
      },
      { type: "h2", text: "Regulatory and Enforcement Status" },
      {
        type: "p",
        text: "Retatrutide is the single highest-legal-risk compound indexed on this site, and researchers sourcing it should understand why. In 2026, Eli Lilly launched a coordinated enforcement campaign specifically targeting retatrutide — which, unlike approved semaglutide or tirzepatide, cannot be legally compounded because it has no approved reference drug. That campaign has included multiple lawsuits against peptide sellers and compounding operations, a large volume of referrals to regulators and licensing boards, and thousands of listings reported to online platforms and payment processors across numerous countries.",
      },
      {
        type: "callout",
        text: "What this means practically: expect retatrutide product names, URLs, and availability to change without notice as vendors respond to enforcement pressure. Certificates of Analysis and third-party purity testing are more important here than for almost any other compound, precisely because the market is volatile. None of this changes the bottom line — retatrutide and cagrilintide are unapproved investigational substances, and this blend is sold for laboratory research use only, not for human or veterinary administration.",
      },
      {
        type: "p",
        text: "Cagrilintide's status is simpler but no more permissive: it is investigational, has never been approved as a finished product for any use, and is sold only as a research chemical.",
      },
      { type: "h2", text: "Sourcing for Research" },
      {
        type: "p",
        text: "For legitimate laboratory research, purity and accurate dual-compound dosing are critical — a co-formulated blend adds analytical complexity, since both peptides must be independently verified. We only surface vendors that provide third-party HPLC testing and batch-specific Certificates of Analysis. As of this writing, this specific co-formulation is carried by a single vendor in our index.",
      },
      {
        type: "button",
        text: "View the Retatrutide / Cagrilintide product page",
        productSlug: "retatrutide-cagrilintide",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is the retatrutide + cagrilintide combination FDA-approved?",
            a: "No. Neither compound is approved, and the combination specifically has no approval, no reference product, and no published human trial. It is an investigational research chemical only.",
          },
          {
            q: "Is there human data on this specific blend?",
            a: "No. The individual compounds have published trial data, but retatrutide combined with cagrilintide has not been evaluated in any peer-reviewed human study. Claims of additive benefit are hypothetical.",
          },
          {
            q: "Why is retatrutide considered higher legal-risk than other GLP-1 compounds?",
            a: "Because it has no approved reference drug, it cannot be legally compounded at all, and its developer has an active enforcement campaign specifically targeting sellers. That makes it more legally exposed than approved compounds like semaglutide or tirzepatide.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Jastreboff AM, et al. \"Triple–Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial.\" NEJM, 2023. ",
          { href: "https://www.nejm.org/doi/full/10.1056/NEJMoa2301972", text: "nejm.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Coskun T, et al. \"LY3437943 (retatrutide), a novel triple glucagon, GIP, and GLP-1 receptor agonist... from discovery to clinical proof of concept.\" Cell Metabolism, 2022. ",
          { href: "https://www.sciencedirect.com/science/article/pii/S1550413122003126", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Enebo LB, et al. \"Safety, tolerability, pharmacokinetics, and pharmacodynamics of concomitant cagrilintide and semaglutide (amylin analog + GLP-1) in adults with overweight or obesity.\" The Lancet, 2021. ",
          { href: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01751-7/fulltext", text: "thelancet.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Eli Lilly. TRIUMPH-1 Phase 3 topline results, 2026 (press release, not yet peer-reviewed). ",
          { href: "https://investor.lilly.com/news-releases/news-release-details/lillys-triple-agonist-retatrutide-delivered-powerful-weight-loss", text: "investor.lilly.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. Information on compounding and bulk drug substances (Category 2 / 503A–503B framework; retatrutide has no approved reference product). ",
          { href: "https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-used-compounding-under-section-503a-fdc-act", text: "fda.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds referenced are unapproved, investigational substances sold for laboratory research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "cagrisema-research-guide",
    title: "CagriSema (Cagrilintide + Semaglutide): The Complete Research Guide",
    excerpt:
      "The dual amylin-plus-GLP-1 combination behind Novo Nordisk's Phase 3 REDEFINE program — and the important distinction between an approved finished drug, its bulk research-grade peptide, and an unapproved co-formulation.",
    category: "Stacks",
    date: "August 2026",
    readTime: "8 min read",
    content: [
      {
        type: "disclaimer",
        text: "Research use only. CagriSema as a combination product is investigational and not FDA-approved. While semaglutide is approved as a specific finished drug, the bulk research-grade peptide and any cagrilintide-plus-semaglutide co-formulation sold as a research chemical are NOT the approved medicine and have not been evaluated for safety, purity, or bioavailability as sold. Nothing here is medical advice or dosing guidance. Do not use these compounds on humans or animals.",
      },
      {
        type: "intro",
        text: "CagriSema is a fixed-dose combination of cagrilintide (a long-acting amylin analog) and semaglutide (a GLP-1 receptor agonist), developed by Novo Nordisk and studied in the Phase 3 REDEFINE program. The pairing engages two distinct satiety systems at once. This guide covers what the combination is, the trial evidence behind it, and — critically — the difference between the approved drug semaglutide, the bulk peptide sold for research, and this unapproved co-formulation.",
      },
      {
        type: "callout",
        text: "Legal status, up front: CagriSema as a combination is investigational and NOT approved for any use. Cagrilintide has never been approved as a standalone product. Semaglutide IS approved — but only as specific finished drugs (e.g., Ozempic, Wegovy) manufactured to defined standards. Bulk semaglutide peptide sold for research, and any research-chemical cagrilintide+semaglutide blend, are not those approved products and are sold strictly for laboratory research use only.",
      },
      { type: "h2", text: "What Is CagriSema?" },
      {
        type: "p",
        text: "Semaglutide reduces appetite and food intake through the GLP-1 receptor — the mechanism behind the well-known weight-management and glycemic-control drugs. Cagrilintide works through the amylin/calcitonin receptor system, a satiety pathway that is separate from and complementary to GLP-1. The rationale for combining them is that engaging two independent satiety systems may produce a greater effect than either alone.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "p",
        text: "The combination has genuine clinical data behind it, which distinguishes it from many research blends. A Phase 2 study of concomitant cagrilintide and semaglutide was published in The Lancet in 2021. The combination then advanced to Novo Nordisk's Phase 3 REDEFINE program in obesity, with topline results reported in which CagriSema produced greater average weight reduction than either cagrilintide or semaglutide monotherapy and placebo.",
      },
      {
        type: "callout",
        text: "Important caveat on the research-grade version: published trial data describes a specific manufactured, dose-controlled formulation studied under clinical conditions. It does not validate the safety, purity, dosing, or bioavailability of a research-chemical blend sold in a vial. Trial results should not be read as evidence about any particular vendor's product.",
      },
      { type: "h2", text: "Regulatory and Enforcement Context" },
      {
        type: "p",
        text: "Because CagriSema as a combination is still investigational, it has no approval as a finished product. And while semaglutide itself is approved, its manufacturer has actively pursued sellers of compounded and bulk semaglutide — including litigation against multiple distributors — as approved-drug supply normalized. Researchers should treat semaglutide-containing research products as a category under active brand and regulatory scrutiny, and prioritize vendors with third-party testing and batch-specific Certificates of Analysis.",
      },
      { type: "h2", text: "Sourcing for Research" },
      {
        type: "p",
        text: "As a two-peptide co-formulation, CagriSema requires independent verification of both components' identity and purity. We only surface vendors that provide third-party HPLC testing and batch-specific Certificates of Analysis. This combination is currently carried by two vendors in our index.",
      },
      {
        type: "button",
        text: "View the CagriSema product page",
        productSlug: "cagrisema",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is CagriSema FDA-approved?",
            a: "No. As a combination it is investigational and not approved for any use. Semaglutide alone is approved as specific finished drugs, but neither cagrilintide nor the combination is approved, and research-grade material is not the approved medicine.",
          },
          {
            q: "How is CagriSema different from semaglutide alone?",
            a: "It adds cagrilintide, an amylin analog, to semaglutide's GLP-1 action — engaging a second, independent satiety pathway. In the REDEFINE program the combination produced greater weight reduction than either component alone.",
          },
          {
            q: "Does clinical trial data apply to research-chemical CagriSema?",
            a: "No. Trial data describes a specific manufactured formulation under clinical conditions. It says nothing about the purity, dosing, or safety of a research-chemical blend, which is sold for laboratory use only.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Enebo LB, et al. \"Safety, tolerability, pharmacokinetics, and pharmacodynamics of concomitant administration of multiple doses of cagrilintide with semaglutide 2.4 mg for weight management: a randomised, controlled, phase 1b trial.\" The Lancet, 2021. ",
          { href: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01751-7/fulltext", text: "thelancet.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Novo Nordisk. REDEFINE Phase 3 program in obesity (cagrilintide 2.4 mg + semaglutide 2.4 mg), topline results. ",
          { href: "https://www.novonordisk.com/news-and-media/news-and-ir-materials.html", text: "novonordisk.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Lau DCW, et al. \"Once-weekly cagrilintide for weight management in people with overweight and obesity: a multicentre, randomised, double-blind, placebo-controlled and active-controlled, dose-finding phase 2 trial.\" The Lancet, 2021. ",
          { href: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01751-7/fulltext", text: "thelancet.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. FDA. Medications containing semaglutide — approved drug products and compounding risk alerts. ",
          { href: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/medications-containing-semaglutide-marketed-type-2-diabetes-or-weight-loss", text: "fda.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. The combination described is an unapproved, investigational research chemical sold for laboratory research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "tirzepatide-research-guide",
    title: "Tirzepatide: The Complete Research Guide",
    excerpt:
      "The dual GIP/GLP-1 agonist behind Mounjaro and Zepbound — and the gap between the approved drug and what's actually sold as a research compound.",
    category: "Body Composition",
    date: "July 2026",
    readTime: "8 min read",
    content: [
      {
        type: "intro",
        text: "Tirzepatide is one of the few compounds on this site with a completed, FDA-approved drug behind it — twice over, under two different brand names for two different indications. That makes its research-vendor version a different story than BPC-157 or Retatrutide: the question isn't whether the molecule works, it's whether what a research vendor ships is the same thing the trials were run on.",
      },
      { type: "h2", text: "What Is Tirzepatide?" },
      {
        type: "p",
        text: "Tirzepatide is a synthetic peptide that activates two separate incretin receptors in one molecule: the GIP (glucose-dependent insulinotropic polypeptide) receptor and the GLP-1 (glucagon-like peptide-1) receptor. It was developed by Eli Lilly and is marketed as Mounjaro (type 2 diabetes) and Zepbound (chronic weight management).",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "Structural and signaling studies describe tirzepatide as an imbalanced, biased dual agonist — it engages the GIP receptor more like native GIP itself, while at the GLP-1 receptor it's biased toward cAMP generation over β-arrestin recruitment. In practical terms: it isn't simply \"semaglutide plus a second appetite hormone.\" The dual-receptor engagement pattern is qualitatively different from a single-agonist GLP-1 drug, which researchers point to as the mechanistic explanation for its larger effect size in head-to-head trials.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "p",
        text: "Unlike most compounds on this site, tirzepatide's evidence base is Phase 3, peer-reviewed, and the basis for an actual FDA approval — not preclinical or press-release data.",
      },
      {
        type: "ul",
        items: [
          "SURMOUNT-1 (n=2,539, no diabetes): mean weight reduction of 15.0% (5mg), 19.5% (10mg), and 20.9% (15mg) vs. 3.1% for placebo at 72 weeks",
          "SURMOUNT-5 (head-to-head vs. semaglutide): 20.2% weight loss vs. 13.7% — roughly 47% greater reduction than semaglutide at 72 weeks",
          "SURMOUNT-1 also recorded significant reductions in systolic and diastolic blood pressure at 72 weeks",
          "Post hoc SURMOUNT-1 analysis found improvements in both β-cell function and insulin sensitivity in participants with prediabetes",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Tirzepatide has two FDA approvals: Mounjaro (May 13, 2022) for glycemic control in type 2 diabetes, and Zepbound (November 8, 2023) for chronic weight management in adults with a BMI of 30+, or 27+ with a weight-related comorbidity. Both are real, completed approvals — not an investigational or bulk-substance question like BPC-157 or TB-500.",
      },
      {
        type: "callout",
        text: "The gap is on the supply side, not the science. Tirzepatide sold by research vendors is not Mounjaro or Zepbound — it is unapproved bulk peptide material, has not been established as equivalent to the approved drug in purity, formulation, or bioavailability, and is not legally sold for human use or consumption.",
      },
      { type: "h2", text: "Where to Source Tirzepatide for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the Tirzepatide product page",
        productSlug: "tirzepatide",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is the tirzepatide sold by research vendors the same as Mounjaro or Zepbound?",
            a: "No. Mounjaro and Zepbound are specific FDA-approved manufactured products. Tirzepatide sold for research use is unapproved bulk peptide material and has not been established as equivalent to the approved drug in purity, formulation, or bioavailability.",
          },
          {
            q: "Why does tirzepatide outperform semaglutide in trials?",
            a: "It engages both the GIP and GLP-1 receptors with an imbalanced, biased signaling profile rather than simply adding a second appetite-suppressing pathway — SURMOUNT-5 recorded roughly 47% greater weight loss than semaglutide at matched follow-up (20.2% vs. 13.7% at 72 weeks).",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. \"Tirzepatide is an imbalanced and biased dual GIP and GLP-1 receptor agonist.\" PMC. ",
          { href: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7526454/", text: "ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. \"Structural determinants of dual incretin receptor agonism by tirzepatide.\" PMC. ",
          { href: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9060465/", text: "ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. \"Efficacy and safety of once-weekly tirzepatide for weight management... including the latest SURMOUNT-2 trial.\" PMC. ",
          { href: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11445313/", text: "ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. \"Tirzepatide Treatment and Associated Changes in β-Cell Function and Insulin Sensitivity... A Post Hoc Analysis From the SURMOUNT-1 Trial.\" Diabetes Care. ",
          { href: "https://diabetesjournals.org/care/article/48/9/1622/163002/Tirzepatide-Treatment-and-Associated-Changes-in", text: "diabetesjournals.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Mounjaro FDA Approval History. Drugs.com. ",
          { href: "https://www.drugs.com/history/mounjaro.html", text: "drugs.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Zepbound FDA Approval History. Drugs.com. ",
          { href: "https://www.drugs.com/history/zepbound.html", text: "drugs.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "semaglutide-research-guide",
    title: "Semaglutide: The Complete Research Guide",
    excerpt:
      "The GLP-1 agonist behind Ozempic and Wegovy has the deepest evidence base of any compound on the site — and the widest gap between the approved drug and what's actually sold as a research compound.",
    category: "Body Composition",
    date: "July 2026",
    readTime: "10 min read",
    content: [
      {
        type: "intro",
        text: "Semaglutide has more human trial data behind it than every other compound on this site combined — ten completed Phase 3 trials, an FDA approval, and a cardiovascular-outcomes trial on top of that. It's also the compound where the line between \"what the evidence supports\" and \"what's actually in the vial\" matters most. This guide keeps those two facts separate on purpose.",
      },
      { type: "h2", text: "What Is Semaglutide?" },
      {
        type: "p",
        text: "Semaglutide is a modified version of human GLP-1 (94% sequence homology) engineered to resist the enzyme, DPP-4, that normally breaks native GLP-1 down within minutes. That structural change is what turns a hormone with a half-life under two minutes into a once-weekly injection.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "Semaglutide acts on three separate physiological systems, and each contributes differently to the weight-loss result:",
      },
      {
        type: "ul",
        items: [
          "Pancreas — glucose-dependent insulin release. GLP-1 receptor activation on pancreatic beta cells amplifies insulin secretion, but only when blood glucose is already elevated. This \"glucose-dependent\" qualifier is why the drug carries a comparatively low hypoglycemia risk on its own.",
          "Stomach — delayed gastric emptying. Slower stomach emptying extends the feeling of fullness after a meal and blunts the post-meal blood sugar spike.",
          "Brain — appetite suppression via the vagus nerve and hypothalamus. This does most of the weight-loss work. GLP-1 signals reach appetite-control centers largely through vagal afferent neurons carrying signals from the gut to the brainstem, with further modulation of hypothalamic neurons involved in hunger and food reward.",
        ],
      },
      {
        type: "p",
        text: "In plain terms: semaglutide doesn't burn fat directly. It reduces how much food you want to eat and how quickly your body processes each meal — the weight loss is a downstream consequence of reduced intake, which is also why the STEP trials paired it with behavioral and dietary counseling rather than testing the drug in isolation.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "p",
        text: "This is the strongest evidence base of any compound on the site. The STEP trial program — ten completed Phase 3 randomized controlled trials plus a teen trial — is the basis for FDA approval of Wegovy (2.4 mg/week) for chronic weight management:",
      },
      {
        type: "ul",
        items: [
          "STEP 1 (obesity/overweight, no diabetes, 68 weeks): −14.9% body weight vs. −2.4% for placebo.",
          "STEP 3 (added intensive behavioral therapy, 68 weeks): −16.0% vs. −5.7% for placebo.",
          "STEP 5 (long-term maintenance, 2 years): −15.2% vs. −2.6% for placebo.",
          "STEP 8 (head-to-head vs. liraglutide): −15.8% for semaglutide; both semaglutide and liraglutide outperformed placebo.",
        ],
      },
      {
        type: "p",
        text: "STEP 1's extension found that weight regain resumed after stopping the drug — participants gained back a majority of the lost weight by 120 weeks. That's directly relevant to anyone expecting a \"cycle on, cycle off\" research protocol to hold results.",
      },
      { type: "h2", text: "The Line Between the Approved Drug and What's Sold as \"Research\" Semaglutide" },
      {
        type: "callout",
        text: "This is the compliance-relevant distinction. The evidence above is for FDA-approved Ozempic and Wegovy — specific manufactured pharmaceutical products. What research-peptide vendors sell as \"semaglutide\" is compounded material, and FDA has specifically warned that some compounded products use salt forms — semaglutide sodium or semaglutide acetate — which are chemically different active ingredients than the approved drug, with no evidence they're equivalent. FDA also documented patients self-administering 5–20x the intended dose due to compounded-product measuring errors, and issued 25 warning letters to telehealth companies over false or misleading compounded-GLP-1 marketing.",
      },
      {
        type: "p",
        text: "The STEP trials are real evidence for the molecule's mechanism and effect — but they were conducted with the approved pharmaceutical product, not a compounded research-vial version. The two are not established as equivalent, and nothing on this page should be read as a claim that they are.",
      },
      { type: "h2", text: "Where to Source Semaglutide for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the Semaglutide product page",
        productSlug: "semaglutide",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is the semaglutide sold by research vendors the same as Ozempic or Wegovy?",
            a: "No. Ozempic and Wegovy are specific FDA-approved manufactured products. Semaglutide sold for research use is compounded material, sometimes in a different salt form, and has not been established as equivalent to the approved drug.",
          },
          {
            q: "Does the weight loss last after stopping semaglutide?",
            a: "The STEP 1 trial extension found that most participants regained a majority of the lost weight within about a year of stopping the drug — the effect appears to require continued use, not a one-time reset.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Semaglutide, Mechanism of Action. StatPearls / NCBI Bookshelf. ",
          { href: "https://www.ncbi.nlm.nih.gov/books/NBK603723/", text: "ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Chao AM, et al. \"Semaglutide for the treatment of overweight and obesity: A review.\" PMC. ",
          { href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10092086/", text: "pmc.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. FDA. \"FDA's Concerns with Unapproved GLP-1 Drugs Used for Weight Loss.\" ",
          { href: "https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss", text: "fda.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Reuters. \"US FDA warns online vendors selling unapproved weight-loss drugs,\" Dec 2024. ",
          { href: "https://www.reuters.com/business/healthcare-pharmaceuticals/us-fda-warns-online-vendors-selling-unapproved-weight-loss-drugs-2024-12-17/", text: "reuters.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Schirra J, Göke B. \"The physiological role of GLP-1 in human: incretin, ileal brake or what?\" PubMed, 2005. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/15780430/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Moiz A, et al. \"Mechanisms of GLP-1 Receptor Agonist-Induced Weight Loss,\" 2025. ",
          { href: "https://www.sciencedirect.com/science/article/pii/S0002934325000592", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "cagrilintide-research-guide",
    title: "Cagrilintide: The Complete Research Guide",
    excerpt:
      "An amylin analog studied on its own and — more compellingly — alongside semaglutide, where combination data shows an effect neither compound produces by itself. Unlike semaglutide, no form of this compound has ever been FDA-approved.",
    category: "Body Composition",
    date: "August 2026",
    readTime: "8 min read",
    content: [
      {
        type: "intro",
        text: "Cagrilintide is easy to mistake for another entry in the GLP-1 family because it's almost always discussed alongside semaglutide. It isn't one. It works through an entirely separate hormone system — amylin, not incretin — and that distinction is the reason researchers pair the two rather than picking one.",
      },
      { type: "h2", text: "What Is Cagrilintide?" },
      {
        type: "p",
        text: "Cagrilintide is a synthetic long-acting analog of amylin, a hormone co-secreted with insulin from pancreatic beta cells after meals. Like semaglutide, it uses a fatty-acid side-chain modification to bind albumin in the bloodstream, extending its half-life enough to support once-weekly dosing — but the receptor it acts on is different. Structurally, cagrilintide is classified as a dual amylin and calcitonin receptor agonist (DACRA), engineered for higher potency at both receptors than natural amylin.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "Amylin signaling and GLP-1 signaling both suppress appetite, but through largely non-overlapping pathways:",
      },
      {
        type: "ul",
        items: [
          "Area postrema (hindbrain) — amylin receptors are concentrated in this brainstem region, which lacks a full blood-brain barrier and receives signals directly from circulating hormones. Activation here drives satiety and slows gastric emptying independent of the vagal/hypothalamic circuit GLP-1 relies on.",
          "Glucagon suppression — amylin analogs blunt post-meal glucagon release, complementing (rather than duplicating) GLP-1's glucose-dependent insulin effect.",
          "Calcitonin receptor co-activation — cagrilintide's dual-receptor binding is what distinguishes it from earlier amylin analogs like pramlintide, and is credited with its improved potency in structural studies.",
        ],
      },
      {
        type: "p",
        text: "Because the two pathways are largely separate, combining an amylin analog with a GLP-1 agonist has produced greater appetite suppression in trials than either compound alone at comparable doses — the basis for Novo Nordisk's combination candidate, CagriSema.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "p",
        text: "Cagrilintide has been studied both as a standalone compound and in combination with semaglutide:",
      },
      {
        type: "ul",
        items: [
          "Phase 2 monotherapy (Lau et al., 2021): 706 participants randomized across cagrilintide doses (0.3–4.5 mg), liraglutide 3.0 mg, and placebo. Cagrilintide produced significant, dose-dependent weight reduction and was well tolerated.",
          "Phase 1b combination (Enebo et al., 2021): 96 adults received ascending cagrilintide doses plus semaglutide 2.4 mg for 20 weeks. Cagrilintide 2.4 mg + semaglutide produced −17.1% weight loss vs. −9.8% for placebo + semaglutide alone — the first human data showing the combination outperforms semaglutide by itself.",
          "Phase 3 REDEFINE 1 (CagriSema, topline Dec 2024, published in NEJM): 3,417 adults with obesity/overweight. CagriSema produced 22.7% mean weight reduction on-treatment (20.4% under the intent-to-treat estimand, vs. 3.0% placebo) at 68 weeks — outperforming both the cagrilintide-alone arm (6.0% achieving ≥25% loss) and the semaglutide-alone arm (16.2% achieving ≥25% loss) on that threshold.",
        ],
      },
      {
        type: "p",
        text: "REDEFINE 1's result was also notable for falling short of the roughly 25%+ weight loss some analysts had expected based on earlier-phase data — only 57% of participants reached the highest CagriSema dose during the trial, which affected the topline number. That gap between anticipated and delivered results became significant enough to draw shareholder litigation against Novo Nordisk in 2026, which is a useful reminder that even well-funded Phase 3 programs can undershoot expectations built on smaller earlier trials.",
      },
      { type: "h2", text: "Cagrilintide Alone vs. CagriSema" },
      {
        type: "p",
        text: "It's worth being precise about what the strongest evidence actually supports. The most dramatic weight-loss numbers in the research literature — REDEFINE 1's 20–23% range — describe cagrilintide combined with semaglutide, not cagrilintide by itself. Monotherapy data (the Lau 2021 trial) shows real, dose-dependent effect, but the combination is where the larger, more clinically meaningful results live. Anyone researching cagrilintide as a single compound should calibrate expectations against the monotherapy trials, not the CagriSema headlines.",
      },
      {
        type: "callout",
        text: "Regulatory status is the most important distinction between cagrilintide and semaglutide. Semaglutide is FDA-approved in specific manufactured forms (Ozempic, Wegovy). Cagrilintide — alone or as CagriSema — has never been FDA-approved in any form; Novo Nordisk filed a New Drug Application for CagriSema, but it remains investigational. Everything currently sold as \"research cagrilintide\" is synthesized/compounded material with no approved reference product to even compare it to, not a compounded copy of an approved drug the way research-grade semaglutide is.",
      },
      { type: "h2", text: "Where to Source Cagrilintide for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the Cagrilintide product page",
        productSlug: "cagrilintide",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is cagrilintide the same thing as semaglutide or part of the GLP-1 family?",
            a: "No. Cagrilintide is an amylin analog acting on amylin and calcitonin receptors — a separate hormone system from GLP-1. It's frequently studied alongside semaglutide because the two pathways are complementary, not because they're the same mechanism.",
          },
          {
            q: "Is cagrilintide FDA-approved?",
            a: "No, in any form. Unlike semaglutide (approved as Ozempic/Wegovy), cagrilintide and the CagriSema combination remain investigational — an NDA has been filed for CagriSema, but nothing has been approved.",
          },
          {
            q: "Does cagrilintide alone produce the same weight loss as CagriSema?",
            a: "No. The largest weight-loss figures reported (20–23% at 68 weeks) come from CagriSema, the semaglutide combination. Cagrilintide monotherapy trials show real but more modest dose-dependent effects.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Lau DCW, et al. \"Once-weekly cagrilintide for weight management in people with overweight and obesity: a multicentre, randomised, double-blind, placebo-controlled and active-controlled, dose-finding phase 2 trial.\" The Lancet, 2021. ",
          { href: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(21)01751-7/abstract", text: "thelancet.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Enebo LB, et al. \"Safety, tolerability, pharmacokinetics, and pharmacodynamics of concomitant administration of multiple doses of cagrilintide with semaglutide 2·4 mg for weight management: a randomised, controlled, phase 1b trial.\" PubMed, 2021. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/33894838/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. \"CagriSema 2.4 mg/2.4 mg demonstrated 22.7% mean weight reduction in adults with overweight or obesity in REDEFINE 1, published in NEJM.\" PR Newswire, Dec 2024. ",
          { href: "https://www.prnewswire.com/news-releases/cagrisema-2-4-mg--2-4-mg-demonstrated-22-7-mean-weight-reduction-in-adults-with-overweight-or-obesity-in-redefine-1--published-in-nejm-302487770.html", text: "prnewswire.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Structural and mechanistic insights into dual activation of cagrilintide in amylin and calcitonin receptors. Acta Pharmacologica Sinica / Nature, 2025. ",
          { href: "https://www.nature.com/articles/s41401-025-01635-2", text: "nature.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Novo Nordisk Submits NDA to FDA for CagriSema. PharmExec. ",
          { href: "https://www.pharmexec.com/view/novo-nordisk-submits-nda-fda-cagrisema", text: "pharmexec.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. \"Why shareholders are suing Novo Nordisk over next-generation weight-loss drug.\" CNBC, Jul 2026. ",
          { href: "https://www.cnbc.com/2026/07/29/novo-nordisk-lawsuit-cagrisema-weight-loss-drug.html", text: "cnbc.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "epithalon-research-guide",
    ruo: true,
    title: "Epithalon: A Research Literature Summary",
    excerpt:
      "A synthetic tetrapeptide, Ala-Glu-Asp-Gly, modelled on a pineal-gland extract. What laboratory studies have measured — telomerase activity and telomere length in cultured fibroblasts — and what is still unknown.",
    category: "Short Peptides & Neuropeptides",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Epithalon (also written Epitalon) comes from Vladimir Khavinson's group at the Saint Petersburg Institute of Bioregulation and Gerontology. It is often confused with Epithalamin, the extract it was modelled on, and the evidence for the two is not interchangeable. This summary covers what Epithalon is, what laboratory studies have measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Epithalon is the synthetic tetrapeptide Ala-Glu-Asp-Gly (AEDG; molecular formula C14H22N4O9, molecular weight 390.4 g/mol, CAS 307297-39-8). It was synthesised based on the amino-acid composition of Epithalamin, a polypeptide extract of bovine pineal glands (Araj et al., 2025). Epithalamin is a mixture; Epithalon is one defined molecule.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The most specific findings are on telomerase. Khavinson and colleagues (Bulletin of Experimental Biology and Medicine, 2003) reported that adding Epithalon to telomerase-negative human fetal fibroblast cultures induced expression of the telomerase catalytic subunit, telomerase enzymatic activity and telomere elongation. In a follow-up (2004), fetal lung fibroblasts that stopped dividing at passage 34 regained telomere length comparable to early passages after Epithalon was added, and went on to 44 passages, ten more than controls.",
      },
      {
        type: "p",
        text: "A 2025 review (Araj et al., International Journal of Molecular Sciences) summarises other reported activities across in vitro, in vivo and in silico work: an influence on melatonin synthesis, changes in interleukin-2 mRNA, modulation of murine thymocyte mitogenic activity, and increased activity of enzymes including acetylcholinesterase, butyrylcholinesterase and telomerase. The reviewers note it is uncertain whether these are its only mechanisms, and that physico-chemical and structural studies of the peptide remain limited.",
      },
      {
        type: "callout",
        text: "These findings come from cultured human cells and animal models, and studies of Epithalamin, the extract, are a separate literature. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Telomerase catalytic-subunit expression, telomerase activity and telomere elongation in telomerase-negative fetal fibroblasts (Khavinson et al., 2003)",
          "Telomere length restored and ten extra passages in fetal lung fibroblasts past their division limit (Khavinson et al., 2004)",
          "Reported effects on melatonin synthesis, IL-2 mRNA, thymocyte mitogenic activity and several enzymes, by review (Araj et al., 2025)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Independent replication: the telomerase findings come from one research group and have not been widely reproduced elsewhere.",
          "Mechanism: how a four-residue peptide would switch on the telomerase gene is not established.",
          "Structure: physico-chemical and structural characterisation of the peptide is limited (Araj et al., 2025).",
          "Epithalon and Epithalamin are often cited interchangeably; results for the extract should not be read as results for the synthetic peptide.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Epithalon is not approved by the FDA for any use. Epitalon-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 24, 2026, as candidates for the 503A bulk drug substances list, and the committee voted to recommend it. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies Epithalon as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is Epithalon the same as Epithalamin?",
            a: "No. Epithalamin is a polypeptide extract of bovine pineal glands. Epithalon is a synthetic tetrapeptide, Ala-Glu-Asp-Gly, designed from Epithalamin's amino-acid composition.",
          },
          {
            q: "What kind of evidence exists for Epithalon?",
            a: "Cell-culture work on telomerase and telomere length in human fibroblasts, and animal and in silico studies summarised in reviews. No laboratory result here shows an effect in people.",
          },
          {
            q: "Is Epithalon FDA-approved?",
            a: "No. A July 2026 FDA advisory committee voted to recommend it for the 503A bulk drug substances list; that vote is advisory and is not an approval.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Khavinson VK, Bondarev IE, Butyugov AA. \"Epithalon peptide induces telomerase activity and telomere elongation in human somatic cells.\" Bulletin of Experimental Biology and Medicine. 2003;135(6):590-592. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/12937682/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Khavinson VK, Bondarev IE, Butyugov AA, Smirnova TD. \"Peptide promotes overcoming of the division limit in human somatic cell.\" Bulletin of Experimental Biology and Medicine. 2004;137(5):503-506. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/15455129/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Araj SK, Brzezik J, Mądra-Gackowska K, et al. \"Overview of Epitalon—Highly Bioactive Pineal Tetrapeptide with Promising Properties.\" International Journal of Molecular Sciences. 2025;26(6):2691. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/40141333/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by NCPA, July 31, 2026: ",
          { href: "https://ncpa.org/newsroom/qam/2026/07/31/fda-advisory-committee-nominates-six-peptides-pharmacies-compound", text: "ncpa.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "tesamorelin-research-guide",
    ruo: true,
    title: "Tesamorelin: A Research Literature Summary",
    excerpt:
      "Full-length GHRH(1–44) amide with a trans-3-hexenoyl group on Tyr1. What non-clinical studies have measured — resistance to DPP-IV, slower breakdown in plasma, and GH and IGF-1 responses in animals — and what is still unknown.",
    category: "GH-Axis Peptides",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Tesamorelin, developed as TH9507, is a growth hormone–releasing hormone (GHRH) analog with one small change to the native sequence. It was designed to resist the enzyme that inactivates native GHRH. This summary covers its chemistry, what non-clinical studies have measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Tesamorelin is the full 44-residue human GHRH sequence, amidated at the C-terminus (hGRF1–44NH2), with a trans-3-hexenoyl group added to the N-terminal tyrosine (molecular formula C221H366N72O67S, molecular weight 5136.0 g/mol, CAS 218949-48-5). Sermorelin, by comparison, is only residues 1–29 and has no N-terminal modification.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Native GHRH is inactivated by dipeptidyl aminopeptidase-IV (DPP-IV), which cleaves its first two residues. Ferdinandi and colleagues (Basic & Clinical Pharmacology & Toxicology, 2007), from the developer Theratechnologies, reported that the trans-3-hexenoyl group made TH9507 resistant to DPP-IV deactivation, slowed its in vitro degradation in rat, dog and human plasma compared with natural hGRF1–44NH2, and prolonged its plasma elimination in vivo.",
      },
      {
        type: "p",
        text: "In the same non-clinical programme, plasma growth hormone and IGF-1 rose markedly in pigs, rats and dogs given repeated TH9507. In subchronic studies of up to four months in rats and dogs, the authors reported body-weight gain alongside the biomarker response, and in dogs reversible liver, kidney and blood findings that they attributed to sustained supraphysiological GH and IGF-1. The apparent elimination half-life in dogs was 21 to 45 minutes.",
      },
      {
        type: "callout",
        text: "These findings come from plasma stability assays and animal pharmacology and toxicology studies. They describe how tesamorelin behaves in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Resistant to DPP-IV deactivation because of the N-terminal trans-3-hexenoyl group (Ferdinandi et al., 2007)",
          "Slower in vitro degradation than natural GHRH(1–44) in rat, dog and human plasma (Ferdinandi et al., 2007)",
          "Marked plasma GH and IGF-1 increases in pigs, rats and dogs (Ferdinandi et al., 2007)",
          "Reversible organ and blood findings in dogs with prolonged exposure, attributed to sustained high GH and IGF-1 (Ferdinandi et al., 2007)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Source of the data: the non-clinical characterisation was published by the developer; independent laboratory pharmacology is limited.",
          "Species differences: dogs showed more pronounced effects than rats in the same studies, so the choice of species matters when interpreting results.",
          "Downstream effects: tesamorelin acts through GH and IGF-1, so effects measured in an experiment may reflect either hormone, or both.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Tesamorelin is the active ingredient of an FDA-approved prescription medicine. Research-grade material sold for laboratory use is not that approved product and is not for human use. Tesamorelin was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies tesamorelin as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "How does tesamorelin differ from sermorelin?",
            a: "Tesamorelin is the full 44-residue GHRH sequence with a trans-3-hexenoyl group on Tyr1. Sermorelin is the 29-residue fragment with no N-terminal modification.",
          },
          {
            q: "Why the trans-3-hexenoyl group?",
            a: "It protects the N-terminus from DPP-IV, the enzyme that inactivates native GHRH, which slowed breakdown in plasma in the developer's studies (Ferdinandi et al., 2007).",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Plasma stability assays and animal pharmacology and toxicology studies. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Ferdinandi ES, Brazeau P, High K, et al. \"Non-clinical pharmacology and safety evaluation of TH9507, a human growth hormone-releasing factor analogue.\" Basic & Clinical Pharmacology & Toxicology. 2007;100(1):49-58. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/17214611/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. PubChem. Tesamorelin (CID 16137828). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/16137828", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "ghk-cu-research-guide",
    ruo: true,
    title: "GHK-Cu (Copper Peptide): A Research Literature Summary",
    excerpt:
      "The tripeptide Gly-His-Lys bound to copper(II), first reported in human serum in 1973. What laboratory studies have measured — extracellular-matrix synthesis, cell recruitment and gene-expression shifts — and what is still unknown.",
    category: "Cofactors & Conjugates",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "GHK has one of the longest research histories of any compound we carry: Loren Pickart reported it in human serum in 1973. Most of the literature since then studies it as its copper complex, GHK-Cu. This summary covers what it is, what laboratory studies have measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "GHK-Cu is the tripeptide glycyl-L-histidyl-L-lysine (Gly-His-Lys) bound to a copper(II) ion, which is held by the glycine amino nitrogen, the glycine–histidine amide nitrogen and a histidine ring nitrogen (molecular formula C14H23CuN6O4+, molecular weight 402.9 g/mol, CAS 89030-95-5). GHK occurs naturally in human plasma, saliva and urine (Pickart et al., 2015).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The original 1973 work (Pickart and Thaler, Nature New Biology) described a tripeptide in human serum that prolonged the survival of normal liver cells in culture. Later laboratory work summarised in a 2015 review by Pickart and colleagues reports that GHK stimulates both synthesis and breakdown of collagen and glycosaminoglycans, increases collagen, dermatan sulfate, chondroitin sulfate and the proteoglycan decorin, modulates matrix metalloproteinases and their inhibitors, and attracts immune and endothelial cells in injury models in rats, mice, pigs and dogs.",
      },
      {
        type: "p",
        text: "A second line uses gene-expression data. Pickart's group reports that GHK shifts the expression of at least 4,000 human genes (Pickart et al., 2015), and has described changes in genes of the ubiquitin–proteasome system, DNA repair, antioxidant systems and TGF-β superfamily signaling (Pickart et al., 2014).",
      },
      {
        type: "callout",
        text: "These findings come from cell culture, animal injury models and analyses of gene-expression datasets. A shift in gene expression is not a measured physiological result, and none of this is evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Tripeptide in human serum prolonged survival of normal liver cells in culture (Pickart and Thaler, 1973)",
          "Collagen, glycosaminoglycan and decorin synthesis, and metalloproteinase modulation, by review (Pickart et al., 2015)",
          "Recruitment of immune and endothelial cells in rat, mouse, pig and dog injury models, by review (Pickart et al., 2015)",
          "Expression changes reported in at least 4,000 human genes (Pickart et al., 2015)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Concentration of authorship: the main reviews come from Loren Pickart's group, which works for a skin-care company (Skin Biology, Bellevue, Washington); independent reviews are fewer.",
          "Copper versus peptide: how much of each effect comes from the peptide and how much from copper delivery is not fully separated.",
          "Gene data: the gene-expression figures come from the same group and describe expression changes, not tested mechanisms.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "GHK-Cu is not approved by the FDA as a drug, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies GHK-Cu as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "What is the difference between GHK and GHK-Cu?",
            a: "GHK is the tripeptide Gly-His-Lys. GHK-Cu is that tripeptide bound to a copper(II) ion; most of the research literature studies the copper complex.",
          },
          {
            q: "How long has GHK been studied?",
            a: "Since 1973, when Pickart and Thaler reported a tripeptide in human serum that prolonged the survival of liver cells in culture.",
          },
          {
            q: "What kind of evidence exists for GHK-Cu?",
            a: "Cell-culture and animal injury studies, and gene-expression analyses, mostly reviewed by one research group. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Pickart L, Thaler MM. \"Tripeptide in human serum which prolongs survival of normal liver cells and stimulates growth in neoplastic liver.\" Nature New Biology. 1973;243:85-87. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/4349963/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Pickart L, Vasquez-Soltero JM, Margolina A. \"GHK Peptide as a Natural Modulator of Multiple Cellular Pathways in Skin Regeneration.\" BioMed Research International. 2015;2015:648108. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/26236730/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Pickart L, Vasquez-Soltero JM, Margolina A. \"GHK and DNA: resetting the human genome to health.\" BioMed Research International. 2014;2014:151479. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/25302294/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Copper(II) coordination of GHK (crystal structure). Inorganica Chimica Acta. ",
          { href: "https://www.sciencedirect.com/science/article/pii/S002016930082544X", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "igf-1-lr3-research-guide",
    ruo: true,
    title: "IGF-1 LR3: A Research Literature Summary",
    excerpt:
      "An engineered 83-residue analog of insulin-like growth factor 1. What laboratory studies have measured — IGF-binding-protein escape and potency in cultured cells — and what is still unknown.",
    category: "GH-Axis Peptides",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "IGF-1 LR3 (Long R3 IGF-I) is not a natural peptide. It was engineered in Adelaide in the early 1990s as a laboratory reagent for studying how insulin-like growth factor 1 (IGF-1) acts, and it is still used that way in cell culture. This summary covers how it was designed, what laboratory studies have measured, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "IGF-1 LR3 is an 83-residue polypeptide (molecular formula C400H625N111O115S9, molecular weight 9117.6 g/mol, CAS 143045-27-6). It is the 70-residue human IGF-1 sequence with arginine in place of glutamic acid at position 3, preceded by a 13-residue N-terminal extension: the first 11 residues of methionyl porcine growth hormone followed by Val-Asn. Its developers named it Long [Arg3]-IGF-I.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "In circulation and in many cell cultures, IGF-1 is held by IGF-binding proteins (IGFBPs), which limit how much of it can reach the IGF-1 receptor. King and colleagues (1992) showed that replacing Glu-3 with Arg or Gly made IGF-1 bind very poorly to IGF-binding protein-2 while binding the type-1 receptor only slightly less well, and concluded that reduced IGFBP binding explains the analogs' greater potency.",
      },
      {
        type: "p",
        text: "Francis and colleagues (1992) added the N-terminal extension and compared the resulting \"Long\" analogs. In L6 rat myoblasts, all of them were more potent than IGF-1 at stimulating protein and DNA synthesis and at inhibiting protein breakdown. In cell lines that secrete IGFBPs, Long [Arg3]-IGF-I was the most potent; in chicken embryo fibroblasts, which secrete no detectable IGFBPs, it was less potent than IGF-1. That pattern is the evidence that its potency comes from escaping the binding proteins, not from a stronger receptor interaction.",
      },
      {
        type: "callout",
        text: "These findings come from cultured cell lines and binding assays. They describe how IGF-1 LR3 behaves in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Arg-3 and Gly-3 substitutions: very poor binding to IGF-binding protein-2, near-normal receptor binding, in rat L6 myoblasts (King et al., 1992)",
          "Long analogs more potent than IGF-1 at protein and DNA synthesis and at inhibiting protein breakdown in L6 myoblasts (Francis et al., 1992)",
          "Potency advantage present in IGFBP-secreting cell lines and absent in chicken embryo fibroblasts, which secrete none (Francis et al., 1992)",
          "The IGF-1 receptor is described as crucial for tumour transformation and malignant-cell survival, and only partly involved in normal cell growth (Larsson et al., 2005, review)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Tumour biology: the IGF-1 receptor is central to tumour transformation and malignant-cell survival in the cancer literature (Larsson et al., 2005), and IGF-1 LR3 was built to reach that receptor more easily. That needs weighing in any experimental system that includes transformed cells.",
          "Tissue selectivity: the receptor is widely expressed, so effects measured in one cell type say little about others.",
          "Most of the primary characterisation is from the original 1990s work; later papers mostly use IGF-1 LR3 as a reagent rather than studying it directly.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "IGF-1 LR3 is not approved by the FDA for any use, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies IGF-1 LR3 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "What does \"LR3\" mean?",
            a: "\"Long\" for the 13-residue N-terminal extension, and \"R3\" for arginine at position 3 of the IGF-1 sequence, where human IGF-1 has glutamic acid.",
          },
          {
            q: "Why is IGF-1 LR3 more potent than IGF-1 in cell culture?",
            a: "Because it binds IGF-binding proteins very poorly, more of it reaches the IGF-1 receptor. Where cells secrete no binding proteins, the advantage disappears (Francis et al., 1992).",
          },
          {
            q: "What kind of evidence exists for IGF-1 LR3?",
            a: "Binding assays and cell-culture potency studies from the original development work, and its use as a laboratory reagent since. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Francis GL, Ross M, Ballard FJ, et al. \"Novel recombinant fusion protein analogues of insulin-like growth factor (IGF)-I indicate the relative importance of IGF-binding protein and receptor binding for enhanced biological potency.\" Journal of Molecular Endocrinology. 1992;8(3):213-223. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/1378742/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. King R, Wells JR, Krieg P, et al. \"Production and characterization of recombinant insulin-like growth factor-I (IGF-I) and potent analogues of IGF-I, with Gly or Arg substituted for Glu3, following their expression in Escherichia coli as fusion proteins.\" Journal of Molecular Endocrinology. 1992;8(1):29-41. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/1311930/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Larsson O, Girnita A, Girnita L. \"Role of insulin-like growth factor 1 receptor signalling in cancer.\" British Journal of Cancer. 2005;92:2097-2101. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/15956962/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. PubChem. Substance record for IGF-1 LR3 (SID 381123731). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/substance/381123731", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "aod-9604-research-guide",
    ruo: true,
    title: "AOD-9604: A Research Literature Summary",
    excerpt:
      "A 16-residue C-terminal fragment of human growth hormone. What laboratory studies have measured about its effects on lipid metabolism in mice, why its β3-adrenergic mechanism is often misstated, and what is still unknown.",
    category: "Peptide Fragments",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "4 min read",
    content: [
      {
        type: "intro",
        text: "AOD-9604 is a synthetic fragment from the C-terminal end of human growth hormone (hGH). It was developed to study the lipid-metabolism activity of that region separately from the rest of the hormone. This summary covers what it is, what its main laboratory study found, a common misreading of that study, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "AOD-9604 is a synthetic 16-residue peptide: residues 177–191 of human growth hormone with an added N-terminal tyrosine (molecular formula C78H123N23O23S2, molecular weight 1815.1 g/mol, CAS 221231-10-3).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The main mechanistic study is Heffernan and colleagues (Endocrinology, 2001). In obese mice, 14 days of hGH or AOD-9604 changed body weight and body fat and raised expression of β3-adrenergic receptor (β3-AR) RNA, the main lipolytic receptor in fat cells, back toward lean-mouse levels. In β3-AR knockout mice, long-term administration of either compound did not produce the changes in body weight and lipolysis seen in normal mice. In a short experiment, however, AOD-9604 still increased energy expenditure and fat oxidation in the knockout mice.",
      },
      {
        type: "p",
        text: "The authors concluded that the lipolytic actions of hGH and AOD-9604 are not mediated directly through the β3-AR, even though both raise β3-AR expression, which may then add to lipolytic sensitivity. AOD-9604 is often described as a β3-adrenergic agonist; the study that tested that idea does not support it.",
      },
      {
        type: "callout",
        text: "These findings come from mouse models, including receptor-knockout mice. They describe what AOD-9604 does to lipid-metabolism measurements in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Body weight, body fat and β3-AR RNA expression changed in obese mice after 14 days (Heffernan et al., 2001)",
          "Long-term changes absent in β3-AR knockout mice (Heffernan et al., 2001)",
          "Short-term energy expenditure and fat oxidation still increased in knockout mice (Heffernan et al., 2001)",
          "Conclusion: lipolytic action not mediated directly through the β3-AR (Heffernan et al., 2001)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Receptor: if not the β3-AR directly, what AOD-9604 binds to start its lipolytic effect is not identified.",
          "Short versus long term: the short-term knockout result and the long-term knockout result point in different directions, and how they fit together is unresolved.",
          "Breadth: the mechanistic picture rests mainly on one mouse study, and independent laboratory work is limited.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "AOD-9604 is not approved by the FDA for any use, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies AOD-9604 as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is AOD-9604 a β3-adrenergic agonist?",
            a: "The study that tested this concluded its lipolytic action is not mediated directly through the β3-adrenergic receptor, although it raises that receptor's expression (Heffernan et al., 2001).",
          },
          {
            q: "Which part of growth hormone is it?",
            a: "Residues 177–191 of the C-terminal end, with a tyrosine added at the N-terminus.",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Mouse studies, including knockout mice. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Heffernan M, Summers RJ, Thorburn A, et al. \"The effects of human GH and its lipolytic fragment (AOD9604) on lipid metabolism following chronic treatment in obese mice and β3-AR knock-out mice.\" Endocrinology. 2001;142(12):5182-5189. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/11713213/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. PubChem. AOD-9604 (CID 71300630). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/71300630", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "sermorelin-research-guide",
    ruo: true,
    title: "Sermorelin: A Research Literature Summary",
    excerpt:
      "GHRH(1–29) amide, the shortest synthetic fragment with the full activity of growth hormone–releasing hormone. What laboratory studies of the GHRH receptor have measured, its regulatory history, and what is still unknown.",
    category: "GH-Axis Peptides",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Sermorelin is the N-terminal 29-residue fragment of human growth hormone–releasing hormone (GHRH), amidated at the C-terminus. Its fragment, GRF(1–29)-NH2, became the standard scaffold for laboratory work on the GHRH receptor in the 1980s. This summary covers its chemistry, what receptor studies have measured, its regulatory history and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Sermorelin is a synthetic 29-residue peptide whose sequence matches residues 1–29 of human GHRH, amidated at the C-terminus (molecular formula C149H246N44O42S, molecular weight 3357.9 g/mol, CAS 86168-78-7). It is described as the shortest synthetic peptide with the full biological activity of GHRH (Prakash and Goa, 1999).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "GHRH and its fragment act on the GHRH receptor of anterior pituitary somatotroph cells, where they stimulate growth hormone secretion. Robberecht and colleagues (Peptides, 1986) tested 30 synthetic GRF(1–29)-NH2 analogs on membranes from rat adenopituitary, liver and pancreas. In pituitary membranes the analogs acted on specific GRF receptors; in liver and pancreas they acted on VIP receptors instead. The C-terminal part of the peptide was responsible for receptor recognition, while the N-terminal part (positions 1–10) was critical for activating adenylate cyclase, and single substitutions there produced antagonists.",
      },
      {
        type: "callout",
        text: "These findings come from rat tissue membranes and adenylate cyclase assays. They describe how the peptide interacts with receptors in those preparations.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Shortest synthetic fragment with the full biological activity of GHRH (Prakash and Goa, 1999, review)",
          "GRF receptors in rat adenopituitary membranes; VIP receptors in liver and pancreas (Robberecht et al., 1986)",
          "C-terminal region for receptor recognition, N-terminal residues 1–10 for adenylate cyclase activation (Robberecht et al., 1986)",
          "N-terminal substitutions such as N-Ac-Tyr1, D-Arg2 turn the fragment into a receptor antagonist (Robberecht et al., 1986)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Receptor cross-talk: GRF(1–29) analogs also act on VIP receptors outside the pituitary, so tissue choice affects which receptor a result reflects.",
          "Stability: native GHRH fragments are broken down quickly in biological media, which has driven decades of analog design; results with the unmodified fragment have to be read with that in mind.",
          "Much of the receptor pharmacology dates from the 1980s and 1990s; modern structural data on the GHRH receptor are newer and still being connected to the older analog work.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Sermorelin acetate was previously an FDA-approved prescription drug. The manufacturer discontinued it, and in 2013 FDA determined that the product was not withdrawn from sale for reasons of safety or effectiveness. Research-grade material sold for laboratory use is not an approved drug. Aura Protocols supplies sermorelin as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "How is sermorelin related to GHRH?",
            a: "It is residues 1–29 of the 44-residue human hormone, with a C-terminal amide. That fragment keeps the hormone's full activity.",
          },
          {
            q: "Which part of the peptide does what?",
            a: "In rat pituitary membranes, the C-terminal region was needed for receptor recognition and the N-terminal residues for activating adenylate cyclase (Robberecht et al., 1986).",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Receptor and enzyme assays on rat tissue membranes, a review of the molecule and FDA's regulatory record. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Robberecht P, Waelbroeck M, Coy D, et al. \"Comparative structural requirements of thirty GRF analogs for interaction with GRF- and VIP receptors and coupling to adenylate cyclase in rat adenopituitary, liver and pancreas.\" Peptides. 1986;7 Suppl 1:53-59. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/3018703/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Prakash A, Goa KL. \"Sermorelin: a review of its use in the diagnosis and treatment of children with idiopathic growth hormone deficiency.\" BioDrugs. 1999;12(2):139-157. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18031173/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. FDA, Federal Register, March 4, 2013: determination that sermorelin acetate injection was not withdrawn from sale for reasons of safety or effectiveness. ",
          { href: "https://www.federalregister.gov/documents/2013/03/04/2013-04827/determination-that-geref-sermorelin-acetate-injection-05-milligrams-basevial-and-10-milligrams", text: "federalregister.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "nad-plus-research-guide",
    ruo: true,
    title: "NAD+: A Research Literature Summary",
    excerpt:
      "A dinucleotide coenzyme, not a peptide. What laboratory research has established about its roles as a redox cofactor and as the substrate of sirtuins and PARPs, how cells take up its precursors, and what is still unknown.",
    category: "Cofactors & Conjugates",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "NAD+ is present in every living cell. It is not a peptide but a dinucleotide coenzyme, and it is one of the most studied molecules in cell metabolism. This summary covers its chemistry, the enzyme systems that depend on it, what laboratory work shows about how cells take up NAD+ precursors, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "NAD+ (nicotinamide adenine dinucleotide, oxidized form; molecular formula C21H27N7O14P2, molecular weight 663.4 g/mol, CAS 53-84-9) is a dinucleotide: an adenine nucleotide and a nicotinamide nucleotide joined through their phosphate groups. It cycles between the oxidized form, NAD+, and the reduced form, NADH.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "NAD+ has two kinds of roles. As a redox cofactor it carries electrons in energy metabolism. It is also consumed as a substrate by several enzyme families, including the sirtuins and the poly(ADP-ribose) polymerases (PARPs) (Ratajczak et al., 2016). Sirtuins couple the breakdown of NAD+ to the removal of acyl groups from proteins, which links cellular energy status to protein regulation (Imai and Guarente, 2016). Reviews describe a systemic decrease in NAD+ with age across multiple tissues (Johnson and Imai, 2018).",
      },
      {
        type: "p",
        text: "Cellular uptake is a central research question. Using genetic models and stable-isotope-labelled compounds, Ratajczak and colleagues (Nature Communications, 2016) showed that nicotinamide riboside kinase 1 (NRK1) is necessary and rate-limiting for cells to use external nicotinamide riboside (NR) and nicotinamide mononucleotide (NMN), and that extracellular NMN is first converted to NR, which cells then take up and turn into NAD+.",
      },
      {
        type: "callout",
        text: "These findings come from cell biology, biochemistry and animal models. They describe how NAD+ and its precursors behave in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Redox cofactor and substrate for sirtuins and PARPs (Ratajczak et al., 2016; Imai and Guarente, 2016)",
          "Sirtuin activity coupled to NAD+ breakdown and protein deacylation (Imai and Guarente, 2016)",
          "Systemic decrease in NAD+ with age across multiple tissues, by review (Johnson and Imai, 2018)",
          "NRK1 required for cells to use external NR and NMN; extracellular NMN converted to NR before uptake (Ratajczak et al., 2016)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Extracellular NAD+: whether NAD+ supplied outside the cell is used intact or first broken down to smaller precursors such as NMN and NR is a live research question, and it matters for any experiment that adds NAD+ to the medium.",
          "Compartments: NAD+ pools in the nucleus, cytoplasm and mitochondria are regulated separately, and whole-cell measurements can hide shifts between them.",
          "Competition: sirtuins, PARPs and other NAD+-consuming enzymes draw on the same pool, so changing NAD+ availability can affect several systems at once.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "NAD+ was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies NAD+ as a research chemical for laboratory use only; it is not sold as a drug or a dietary supplement.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is NAD+ a peptide?",
            a: "No. It is a dinucleotide coenzyme: two nucleotides joined through their phosphate groups.",
          },
          {
            q: "How do cells take up NAD+ precursors?",
            a: "In the work of Ratajczak and colleagues (2016), extracellular NMN was converted to NR before uptake, and the enzyme NRK1 was required to turn NR into NAD+ inside the cell.",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Cell biology, biochemistry and animal-model research, and reviews of that work. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Ratajczak J, Joffraud M, Trammell SA, et al. \"NRK1 controls nicotinamide mononucleotide and nicotinamide riboside metabolism in mammalian cells.\" Nature Communications. 2016;7:13103. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27725675/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Imai SI, Guarente L. \"It takes two to tango: NAD+ and sirtuins in aging/longevity control.\" NPJ Aging and Mechanisms of Disease. 2016;2:16017. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/28721271/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Johnson S, Imai SI. \"NAD+ biosynthesis, aging, and disease.\" F1000Research. 2018;7:132. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/29744033/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. PubChem. Nicotinamide adenine dinucleotide (CID 5892). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/5892", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "kpv-research-guide",
    ruo: true,
    title: "KPV: A Research Literature Summary",
    excerpt:
      "The tripeptide Lys-Pro-Val, the C-terminal end of alpha-MSH. What laboratory studies have measured — PepT1 uptake, NF-κB inhibition in intestinal and immune cells, and inflammation markers in mouse colitis models — and what is still unknown.",
    category: "Peptide Fragments",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "KPV is a three-residue fragment of alpha-melanocyte-stimulating hormone (α-MSH). Its laboratory literature is small and focused: how it enters cells, what it does to inflammatory signaling, and how it behaves in mouse models of intestinal inflammation. This summary covers those studies and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "KPV is the tripeptide Lys-Pro-Val (molecular formula C16H30N4O4, molecular weight 342.4 g/mol, CAS 67727-97-3), residues 11–13 of α-MSH, written α-MSH(11–13).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Uptake and signaling: Dalmasso and colleagues (Gastroenterology, 2008) showed that KPV enters human intestinal epithelial cells (Caco2-BBE, HT29-Cl.19A) and T cells (Jurkat) through PepT1, a di- and tripeptide transporter. At nanomolar concentrations it inhibited activation of NF-κB and MAP kinase inflammatory signaling and reduced pro-inflammatory cytokine secretion in cells stimulated with cytokines.",
      },
      {
        type: "p",
        text: "Mouse colitis models: in the same paper, KPV in drinking water lowered pro-inflammatory cytokine expression in DSS- and TNBS-induced colitis. Kannengiesser and colleagues (Inflammatory Bowel Diseases, 2008) measured body weight, colon histology and myeloperoxidase activity in DSS and transfer colitis, and found reduced inflammatory infiltrates and myeloperoxidase activity with KPV. Mice lacking a functional melanocortin-1 receptor still responded, so the authors concluded the effect is at least partly independent of MC1R, the receptor through which α-MSH acts.",
      },
      {
        type: "callout",
        text: "These findings come from human cell lines and mouse models. They describe what KPV does to signaling pathways and inflammation markers in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "PepT1-mediated uptake into intestinal epithelial and T cells; NF-κB and MAP kinase inhibition at nanomolar concentrations (Dalmasso et al., 2008)",
          "Lower pro-inflammatory cytokine expression in DSS and TNBS mouse colitis (Dalmasso et al., 2008)",
          "Reduced inflammatory infiltrates and myeloperoxidase activity in DSS and transfer colitis; effect partly independent of MC1R (Kannengiesser et al., 2008)",
          "In a mouse colitis-associated tumour model, KPV changed tumour formation in wild-type mice but not in PepT1-knockout mice, tying its activity to PepT1 (Viennois et al., 2016)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Receptor: KPV's activity is at least partly independent of MC1R, and the intracellular target through which it inhibits NF-κB is not identified.",
          "Transport dependence: PepT1 is expressed at low levels in healthy colon and rises with inflammation (Viennois et al., 2016), so results may depend on the inflammatory state of the tissue.",
          "Breadth: most work is in intestinal models from a few groups; other tissues are much less studied.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "KPV is not approved by the FDA for any use. KPV-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 23, 2026, as candidates for the 503A bulk drug substances list, and the committee voted to recommend it. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies KPV as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "How is KPV related to α-MSH?",
            a: "It is the C-terminal tripeptide of α-MSH, residues 11–13 (Lys-Pro-Val).",
          },
          {
            q: "Does KPV act through the melanocortin receptor?",
            a: "Not only. In mice without a functional MC1R, KPV still reduced colitis measures, so its effect appears at least partly independent of that receptor (Kannengiesser et al., 2008).",
          },
          {
            q: "What kind of evidence exists for KPV?",
            a: "Human cell-line and mouse studies, mostly of intestinal inflammation. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Dalmasso G, Charrier-Hisamuddin L, Nguyen HT, et al. \"PepT1-mediated tripeptide KPV uptake reduces intestinal inflammation.\" Gastroenterology. 2008;134(1):166-178. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18061177/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Kannengiesser K, Maaser C, Heidemann J, et al. \"Melanocortin-derived tripeptide KPV has anti-inflammatory potential in murine models of inflammatory bowel disease.\" Inflammatory Bowel Diseases. 2008;14(3):324-331. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18092346/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Viennois E, Ingersoll SA, Ayyadurai S, et al. \"Critical role of PepT1 in promoting colitis-associated cancer and therapeutic benefits of the anti-inflammatory PepT1-mediated tripeptide KPV in a murine model.\" Cellular and Molecular Gastroenterology and Hepatology. 2016;2(3):340-357. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27458604/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by NCPA, July 31, 2026: ",
          { href: "https://ncpa.org/newsroom/qam/2026/07/31/fda-advisory-committee-nominates-six-peptides-pharmacies-compound", text: "ncpa.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "mots-c-research-guide",
    ruo: true,
    title: "MOTS-c: A Research Literature Summary",
    excerpt:
      "A 16-residue peptide encoded in mitochondrial DNA. What laboratory studies have measured — folate-cycle inhibition, AICAR accumulation and AMPK activation in cells and mice — and what is still unknown.",
    category: "Mitochondrial & Metabolic",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "MOTS-c is unusual among research peptides because it is encoded in mitochondrial DNA rather than in the cell nucleus. It was described in 2015 by Changhan Lee, Pinchas Cohen and colleagues at the University of Southern California. This summary covers what laboratory studies have measured, how strong the evidence is, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "MOTS-c (mitochondrial open reading frame of the 12S rRNA-c) is the 16-residue peptide Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg (MRWQEMGYIFYPRKLR; molecular formula C101H152N28O22S2, molecular weight 2174.6 g/mol, CAS 1627580-64-6). Its sequence sits inside a short open reading frame in the mitochondrial 12S rRNA gene, MT-RNR1.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The founding study (Lee et al., Cell Metabolism, 2015) reported that MOTS-c inhibits the folate cycle and the de novo purine synthesis tethered to it, which leads to activation of AMPK, a cellular energy sensor. In HEK293 cells engineered to overexpress MOTS-c, the purine intermediate AICAR, itself an AMPK activator, accumulated to more than 20 times control levels. The authors identified skeletal muscle as its main target organ.",
      },
      {
        type: "p",
        text: "In the same paper, mice fed a high-fat diet and given MOTS-c showed AMPK activation and higher GLUT4 expression in skeletal muscle. The authors also reported effects on diet-induced weight gain and on insulin sensitivity in those mice, and on age-dependent insulin sensitivity in older mice.",
      },
      {
        type: "callout",
        text: "These findings come from cultured cells and mice. They describe what MOTS-c does to metabolic pathways and measurements in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Folate-cycle and de novo purine synthesis inhibition, leading to AMPK activation (Lee et al., 2015)",
          "AICAR above 20 times control levels in HEK293 cells overexpressing MOTS-c (Lee et al., 2015)",
          "AMPK activation and GLUT4 expression in skeletal muscle of high-fat-diet mice (Lee et al., 2015)",
          "Diet-induced weight gain and insulin sensitivity measured in high-fat-diet and aging mouse models (Lee et al., 2015)",
          "Later reviews summarise its role in muscle and fat metabolism across rodent studies (Lee et al., 2016; Gao et al., 2023)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Receptor: how MOTS-c acts on cells, and whether it has a receptor at the cell surface, is not established.",
          "Model gap: the core findings come from cell lines and mice; how well they carry over to other species is unknown.",
          "Endogenous role: how much circulating MOTS-c normally varies, and what controls its release from mitochondria, are still being worked out.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "MOTS-c is not approved by the FDA for any use. MOTS-c-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 23, 2026, as candidates for the 503A bulk drug substances list, and the committee voted to recommend it. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies MOTS-c as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Where is MOTS-c encoded?",
            a: "In mitochondrial DNA, inside a short open reading frame of the 12S rRNA gene (MT-RNR1), rather than in the cell nucleus.",
          },
          {
            q: "What kind of evidence exists for MOTS-c?",
            a: "Cell-culture and mouse studies of metabolic pathways, led by the 2015 Cell Metabolism paper, plus reviews of that work. No laboratory result here shows an effect in people.",
          },
          {
            q: "Is MOTS-c FDA-approved?",
            a: "No. A July 2026 FDA advisory committee voted to recommend it for the 503A bulk drug substances list; that vote is advisory and is not an approval.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Lee C, Zeng J, Drew BG, et al. \"The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance.\" Cell Metabolism. 2015;21(3):443-454. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/25738459/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Lee C, Kim KH, Cohen P. \"MOTS-c: A novel mitochondrial-derived peptide regulating muscle and fat metabolism.\" Free Radical Biology and Medicine. 2016;100:182-187. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27216708/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Gao Y, Wei X, Wei P, et al. \"MOTS-c Functionally Prevents Metabolic Disorders.\" Metabolites. 2023;13. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/36677050/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. UniProt. Mitochondrial-derived peptide MOTS-c (A0A0C5B5G6). ",
          { href: "https://www.uniprot.org/uniprotkb/A0A0C5B5G6/entry", text: "uniprot.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by NPR, July 23, 2026: ",
          { href: "https://www.npr.org/2026/07/23/nx-s1-5903202/fda-peptides-restrictions", text: "npr.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "wolverine-stack-research-guide",
    title: "Wolverine Stack: BPC-157 + TB-500 Research Guide",
    excerpt:
      "Why these two peptides are combined, what the literature shows for each, and what's actually established about the pair versus each compound alone.",
    category: "Stacks",
    date: "July 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "The Wolverine Stack pairs BPC-157 and TB-500 in a single vial — the two most commonly co-administered peptides in tissue-repair research, and the base every other blend on this site builds on. Here's what each compound contributes, and what's confirmed versus assumed about combining them.",
      },
      { type: "h2", text: "What's in a Wolverine Stack" },
      {
        type: "p",
        text: "A standard vial is BPC-157 and TB-500 co-lyophilized in a 1:1 ratio — commonly 10mg of each, 20mg total. Reconstitution and dosing math work the same as for either compound alone; the calculator on this site handles mixed-vial concentration the same way.",
      },
      { type: "h2", text: "Two Different Mechanisms in One Vial" },
      {
        type: "p",
        text: "BPC-157 is a synthetic pentadecapeptide first identified from a protective protein in gastric juice. In tendon fibroblasts, it activates the FAK–paxillin pathway, which researchers have linked to increased fibroblast outgrowth, better cell survival under stress, and increased migration from tendon explants.",
      },
      {
        type: "p",
        text: "TB-500 is a synthetic version of a fragment of thymosin beta-4, a naturally occurring protein your cells use during repair. Its defining mechanism is different from BPC-157's: it binds actin, and the original 1997 study showed it acts as a chemoattractant for endothelial cells — stimulating migration four- to six-fold in vitro. A later review describes thymosin beta-4 more broadly as promoting the mobilization, migration, and differentiation of stem and progenitor cells that go on to form new blood vessels.",
      },
      { type: "h2", text: "Why the Two Are Paired" },
      {
        type: "p",
        text: "The two mechanisms are complementary rather than redundant: BPC-157's studied effects center on local tissue survival and fibroblast activity at the injury site, while TB-500's studied effect is recruiting and moving the cells that populate the surrounding area. Vendors and researchers who stack the two are, in effect, targeting the repair site and the cell-migration pipeline feeding it in the same reconstitution.",
      },
      {
        type: "callout",
        text: "What's not established: neither compound's studies were designed to test the combination. Each peptide's evidence base comes from studies where it was administered alone. Combining two well-studied peptides is not the same as having a study of the combination — that's a real gap, not a technicality.",
      },
      {
        type: "p",
        parts: [
          "For the full mechanism and regulatory-status writeup on BPC-157 specifically, see the ",
          { href: "/blog/bpc-157-complete-guide", text: "complete BPC-157 research guide" },
          ".",
        ],
      },
      { type: "h2", text: "Sourcing the Wolverine Stack" },
      {
        type: "p",
        text: "We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis for the finished blend, not just the individual peptides.",
      },
      {
        type: "button",
        text: "View the Wolverine Stack product page",
        productSlug: "bpc-157-tb-500-blend",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Has the BPC-157 + TB-500 combination itself been studied, or just each peptide separately?",
            a: "Just each peptide separately, as far as the published literature shows. BPC-157's evidence and TB-500's evidence both come from studies administering each compound alone. No co-administration trial for the specific combination was found in the literature reviewed for this guide.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Chang CH, et al. \"The promoting effect of pentadecapeptide BPC 157 on tendon fibroblasts.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/21030672/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Malinda KM, Goldstein AL, Kleinman HK. \"Thymosin beta 4 stimulates directional migration of human umbilical vein endothelial cells.\" FASEB J, 1997. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/9194528/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. \"Thymosin β4: a multi-functional regenerative peptide. Basic properties and clinical applications.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/22074294/", text: "PubMed", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "glow-blend-research-guide",
    ruo: true,
    title: "BPC-157 / TB-500 / GHK-Cu: A Research Literature Summary",
    excerpt:
      "A three-component blend: BPC-157, TB-500 and the copper tripeptide GHK-Cu in one vial. What each component's laboratory literature covers, and why no study has examined the combination.",
    category: "Blends",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "4 min read",
    content: [
      {
        type: "intro",
        text: "This blend combines three compounds that each have their own laboratory literature: BPC-157, TB-500 and GHK-Cu. No published study has examined the three together. This summary sets out what each component is, what its own research covers, and what that does and does not tell you about the blend.",
      },
      { type: "h2", text: "Components" },
      {
        type: "ul",
        items: [
          "BPC-157: a synthetic 15-residue peptide, Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
          "TB-500: the N-acetylated heptapeptide Ac-LKKTETQ, residues 17–23 of thymosin beta-4",
          "GHK-Cu: the tripeptide Gly-His-Lys bound to a copper(II) ion",
        ],
      },
      { type: "h2", text: "What Each Component's Literature Covers" },
      {
        type: "p",
        text: "BPC-157's laboratory work centres on VEGFR2–Akt–eNOS signaling in endothelial cells and on tendon-fibroblast migration and growth hormone receptor expression. TB-500's literature is mostly about full-length thymosin beta-4 and its role as an actin-sequestering protein, with thinner work on the fragment itself. GHK-Cu's covers extracellular-matrix synthesis: Maquart and colleagues (FEBS Letters, 1988) found it stimulated collagen synthesis in fibroblast cultures independently of any change in cell number.",
      },
      {
        type: "callout",
        text: "No published study tests BPC-157, TB-500 and GHK-Cu together. Each component's findings come from studies of that compound alone, in cell culture and animal models, and none of them is evidence of any effect in people.",
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Interaction: whether the three compounds affect each other's stability or activity when combined in one solution has not been studied.",
          "Copper: GHK-Cu brings a bound copper(II) ion into the mixture, and its effect on the other two peptides in solution is uncharacterised.",
          "Attribution: in any experiment with the blend, an observed effect cannot be assigned to one component without single-compound controls.",
        ],
      },
      {
        type: "p",
        parts: [
          "Component summaries: ",
          { href: "/blog/bpc-157-complete-guide", text: "BPC-157" },
          ", ",
          { href: "/blog/tb-500-complete-guide", text: "TB-500" },
          ", ",
          { href: "/blog/ghk-cu-research-guide", text: "GHK-Cu" },
          ".",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "None of the three components is approved by the FDA for any use, and the blend has not been reviewed as a product. Aura Protocols supplies this blend as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Has this combination been studied?",
            a: "No. Each component has its own laboratory literature, but no published study examines the three together.",
          },
          {
            q: "Was this blend called something else before?",
            a: "Yes. It was sold under the name GLOW; blends are now named by composition.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Maquart FX, Pickart L, Laurent M, et al. \"Stimulation of collagen synthesis in fibroblast cultures by the tripeptide-copper complex glycyl-L-histidyl-L-lysine-Cu2+.\" FEBS Letters. 1988;238(2):343-346. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/3169264/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Hsieh MJ, Liu HT, Wang CN, et al. \"Therapeutic potential of pro-angiogenic BPC157 is associated with VEGFR2 activation and up-regulation.\" Journal of Molecular Medicine. 2017;95(3):323-333. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27847966/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Ho EN, Kwok WH, Lau MY, et al. \"Doping control analysis of TB-500, a synthetic version of an active region of thymosin β4, in equine urine and plasma by liquid chromatography-mass spectrometry.\" Journal of Chromatography A. 2012;1265:57-69. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/23084823/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "klow-blend-research-guide",
    ruo: true,
    title: "BPC-157 / TB-500 / GHK-Cu / KPV: A Research Literature Summary",
    excerpt:
      "A four-component blend: BPC-157, TB-500, GHK-Cu and the tripeptide KPV in one vial. What each component's laboratory literature covers, and why no study has examined the combination.",
    category: "Blends",
    date: "July 2026",
    lastUpdated: "October 2026",
    readTime: "4 min read",
    content: [
      {
        type: "intro",
        text: "This blend is the BPC-157 / TB-500 / GHK-Cu blend with a fourth component, KPV. Each of the four has its own laboratory literature; no published study has examined them together. This summary sets out what KPV adds, what each component's research covers, and what that does and does not tell you about the blend.",
      },
      { type: "h2", text: "Components" },
      {
        type: "ul",
        items: [
          "BPC-157: a synthetic 15-residue peptide, Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
          "TB-500: the N-acetylated heptapeptide Ac-LKKTETQ, residues 17–23 of thymosin beta-4",
          "GHK-Cu: the tripeptide Gly-His-Lys bound to a copper(II) ion",
          "KPV: the tripeptide Lys-Pro-Val, residues 11–13 of alpha-melanocyte-stimulating hormone (α-MSH)",
        ],
      },
      { type: "h2", text: "What KPV's Literature Covers" },
      {
        type: "p",
        text: "Dalmasso and colleagues (Gastroenterology, 2008) found that KPV is taken up into human intestinal epithelial cells and T cells by PepT1, a di- and tripeptide transporter, and that nanomolar concentrations inhibited NF-κB and MAP kinase inflammatory signaling and reduced pro-inflammatory cytokine secretion in those cells. In two mouse colitis models (DSS and TNBS), KPV given in drinking water lowered pro-inflammatory cytokine expression. The other three components are covered in the BPC-157 / TB-500 / GHK-Cu summary.",
      },
      {
        type: "callout",
        text: "No published study tests these four compounds together. Each component's findings come from studies of that compound alone, in cell culture and animal models, and none of them is evidence of any effect in people.",
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Interaction: whether the four compounds affect each other's stability or activity when combined in one solution has not been studied.",
          "Transport: KPV's activity in the 2008 study depended on PepT1 uptake, which other components may or may not share or compete for.",
          "Attribution: in any experiment with the blend, an observed effect cannot be assigned to one component without single-compound controls.",
        ],
      },
      {
        type: "p",
        parts: [
          "Component summaries: ",
          { href: "/blog/kpv-research-guide", text: "KPV" },
          ", and ",
          { href: "/blog/glow-blend-research-guide", text: "BPC-157 / TB-500 / GHK-Cu" },
          ".",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "None of the four components is approved by the FDA for any use, and the blend has not been reviewed as a product. Aura Protocols supplies this blend as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Has this combination been studied?",
            a: "No. Each component has its own laboratory literature, but no published study examines the four together.",
          },
          {
            q: "Was this blend called something else before?",
            a: "Yes. It was sold under the name KLOW; blends are now named by composition.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Dalmasso G, Charrier-Hisamuddin L, Nguyen HT, et al. \"PepT1-mediated tripeptide KPV uptake reduces intestinal inflammation.\" Gastroenterology. 2008;134(1):166-178. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18061177/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Maquart FX, Pickart L, Laurent M, et al. \"Stimulation of collagen synthesis in fibroblast cultures by the tripeptide-copper complex glycyl-L-histidyl-L-lysine-Cu2+.\" FEBS Letters. 1988;238(2):343-346. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/3169264/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "wolverine-vs-glow-vs-klow",
    title: "Wolverine vs. GLOW vs. KLOW: Choosing a Blend",
    excerpt:
      "Three pre-blended stacks, each adding one peptide to the last. Here's what actually changes between them, and what stays the same.",
    category: "Stacks",
    date: "July 2026",
    readTime: "5 min read",
    pinned: true,
    categoryLead: true,
    content: [
      {
        type: "intro",
        text: "Wolverine, GLOW, and KLOW are the same core pairing — BPC-157 and TB-500 — with one peptide added at each step. They're not three unrelated formulas to weigh against each other; they're a single base plus increasingly specific coverage. Here's what each addition actually changes.",
      },
      { type: "h2", text: "The Three Stacks at a Glance" },
      { type: "h3", text: "Wolverine — BPC-157 + TB-500" },
      {
        type: "p",
        parts: [
          "The base pairing: tissue-repair signaling (BPC-157) plus cell-migration signaling (TB-500). See the ",
          { href: "/blog/wolverine-stack-research-guide", text: "Wolverine Stack guide" },
          " for the mechanism detail.",
        ],
      },
      { type: "h3", text: "GLOW — Wolverine + GHK-Cu" },
      {
        type: "p",
        parts: [
          "Adds a third peptide studied for collagen synthesis and broader gene-expression effects. See the ",
          { href: "/blog/glow-blend-research-guide", text: "GLOW Blend guide" },
          ".",
        ],
      },
      { type: "h3", text: "KLOW — GLOW + KPV" },
      {
        type: "p",
        parts: [
          "Adds a fourth peptide studied for NF-κB inflammatory signaling and gut-lining research. See the ",
          { href: "/blog/klow-blend-research-guide", text: "KLOW Blend guide" },
          ".",
        ],
      },
      { type: "h2", text: "What Changes Between Them" },
      {
        type: "ul",
        items: [
          "Angiogenesis / cell-migration research — present in all three (BPC-157 + TB-500 base)",
          "Collagen synthesis / gene-expression research — added in GLOW and KLOW only (GHK-Cu)",
          "NF-κB / anti-inflammatory research — present in KLOW only (KPV)",
          "Gut-lining / cytokine-signaling research — present in KLOW only (KPV)",
        ],
      },
      { type: "h2", text: "What Doesn't Change" },
      {
        type: "p",
        text: "Vendors that carry more than one of the three typically keep the BPC-157/TB-500 ratio consistent across all of them — GLOW and KLOW aren't a different repair formula, they're the same one with additional peptides layered on top. None of the three has been studied as a combined formulation; every mechanism referenced above comes from research on that individual peptide.",
      },
      { type: "h2", text: "Choosing Between Them" },
      {
        type: "ul",
        items: [
          "Research is specifically about tissue/tendon/muscle repair with no need for the skin or inflammatory angles — Wolverine covers the base mechanisms without the extra peptides",
          "Research also touches collagen, skin, or follicular pathways — GLOW adds that coverage",
          "Research also touches inflammatory signaling or gut-lining pathways — KLOW adds that coverage on top of GLOW",
        ],
      },
      {
        type: "callout",
        text: "This is a research-use-only comparison of documented mechanisms per compound, not a recommendation that more peptides produce a stronger effect. Each addition is a different, independently studied mechanism — not a dose increase.",
      },
      { type: "h2", text: "Sourcing" },
      {
        type: "button",
        text: "View the Wolverine Stack product page",
        productSlug: "bpc-157-tb-500-blend",
      },
      {
        type: "button",
        text: "View the GLOW Stack product page",
        productSlug: "glow-stack",
      },
      {
        type: "button",
        text: "View the KLOW Stack product page",
        productSlug: "klow-stack",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Should I just buy KLOW since it has the most peptides?",
            a: "Not necessarily. Each addition targets a specific, separate mechanism (collagen/gene-expression for GHK-Cu, anti-inflammatory/gut-lining for KPV) rather than making the base repair mechanism stronger. Which stack fits depends on what the research protocol is actually studying, not on peptide count.",
          },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "dsip-research-guide",
    ruo: true,
    title: "DSIP (Delta Sleep-Inducing Peptide): A Research Literature Summary",
    excerpt:
      "A nonapeptide isolated from rabbit cerebral venous blood in 1977. What laboratory studies have measured, why its receptor, gene and natural source are still unknown, and what remains open.",
    category: "Short Peptides & Neuropeptides",
    date: "August 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "DSIP has a research history of almost fifty years and a mechanism that is still unresolved. It was isolated while testing the idea that a circulating factor in the blood promotes slow-wave sleep, and its name records that hypothesis rather than an established function. This summary covers what DSIP is, what laboratory work has measured, and why so much remains open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "DSIP is the nonapeptide Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu (molecular formula C35H48N10O15, molecular weight 848.8 g/mol, CAS 62568-57-4). Its compounding name is emideltide. The Schoenenberger–Monnier group in Basel isolated it from rabbit cerebral venous blood and compared the original and synthetic peptide in 1977 (Monnier et al., 1977). Its structure is unlike that of any other known peptide family (Kovalzon and Strekalova, 2006).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Early animal work reported mainly delta-sleep effects in rabbits, rats and mice, with a more pronounced REM effect in cats, and a U-shaped relationship between the amount given and the response. DSIP-like material was detected by radioimmunoassay and immunohistochemistry in rat brain and peripheral organs and in the plasma of several mammals. Studies also reported effects on electrophysiological activity, brain neurotransmitter levels, circadian and locomotor patterns and hormone levels (Graf and Kastin, 1984).",
      },
      {
        type: "p",
        text: "What has never been found is as important. Kovalzon and Strekalova (Journal of Neurochemistry, 2006) note that the DSIP gene, a precursor protein and a receptor have not been isolated, so the link to sleep was never characterised further. They propose that one or more related \"DSIP-like\" peptides may account at least partly for DSIP-like immunoreactivity and activity, citing its distribution in hypothalamic neurosecretory nuclei, the sleep-promoting activity of certain synthetic analogs, and a structurally similar peptide, dermorphin-decapeptide, studied in rabbits.",
      },
      {
        type: "callout",
        text: "These findings come from animal studies, tissue assays and reviews. They describe what DSIP and DSIP-like material do in those systems. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Isolated from rabbit cerebral venous blood; original and synthetic nonapeptide compared (Monnier et al., 1977)",
          "Delta-sleep effects in rabbits, rats and mice; U-shaped response curve; DSIP-like immunoreactivity in brain, peripheral organs and plasma (Graf and Kastin, 1984)",
          "No gene, precursor protein or receptor isolated; DSIP-like peptides proposed as the source of its activity (Kovalzon and Strekalova, 2006)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Receptor and gene: neither has been identified, which leaves every functional result without a defined mechanism.",
          "Natural source: whether DSIP itself, or a related DSIP-like peptide, is the endogenous molecule is unresolved.",
          "Age of the evidence: much of the primary work dates from the 1970s and 1980s, and modern replication is limited.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "DSIP is not approved by the FDA for any use. Emideltide-related bulk drug substances were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 24, 2026, as candidates for the 503A bulk drug substances list, and the vote failed, 6 in favor to 7 against with 1 abstention. It was the only one of the seven substances reviewed at that meeting that the committee did not recommend. Aura Protocols supplies DSIP as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Does DSIP have a known receptor?",
            a: "No. Its gene, precursor protein and receptor have not been isolated (Kovalzon and Strekalova, 2006).",
          },
          {
            q: "Where was DSIP first found?",
            a: "In rabbit cerebral venous blood, by the Schoenenberger–Monnier group in Basel, reported in 1977.",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Animal studies, tissue assays and reviews. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Monnier M, Dudler L, Gächter R, et al. \"The delta sleep inducing peptide (DSIP). Comparative properties of the original and synthetic nonapeptide.\" Experientia. 1977;33(4):548-552. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/862769/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Graf MV, Kastin AJ. \"Delta-sleep-inducing peptide (DSIP): a review.\" Neuroscience and Biobehavioral Reviews. 1984;8(1):83-93. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/6145137/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Kovalzon VM, Strekalova TV. \"Delta sleep-inducing peptide (DSIP): a still unresolved riddle.\" Journal of Neurochemistry. 2006;97(2):303-309. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/16539679/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by the FDA Law Blog, July 2026: ",
          { href: "https://www.thefdalawblog.com/2026/07/the-peptide-l-wave-rolls-on-pcac-adds-two-more-bulk-drug-substances-for-the-503a-list/", text: "thefdalawblog.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "glutathione-research-guide",
    ruo: true,
    title: "Glutathione (GSH): A Research Literature Summary",
    excerpt:
      "The tripeptide γ-glutamyl-cysteinyl-glycine, the most abundant low-molecular-weight thiol in animal cells. What biochemistry has established about its synthesis and its GSH/GSSG redox couple, and what is still unknown.",
    category: "Cofactors & Conjugates",
    date: "August 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Glutathione is one of the best-characterised molecules in cell biochemistry. It sits at the centre of cellular redox balance and of the detoxification of many foreign compounds. This summary covers its chemistry, how cells make it, what laboratory research has established about its roles, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Glutathione (GSH) is the tripeptide γ-glutamyl-cysteinyl-glycine (molecular formula C10H17N3O6S, molecular weight 307.3 g/mol, CAS 70-18-8). The bond between glutamate and cysteine runs through glutamate's side-chain (γ) carboxyl group rather than the usual α-carboxyl, and the cysteine thiol is its reactive group. Two GSH molecules oxidise to glutathione disulfide (GSSG).",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Synthesis: GSH is made in the cytosol from glutamate, cysteine and glycine by two enzymes in sequence, glutamate-cysteine ligase (GCL, also called γ-glutamylcysteine synthetase) and GSH synthetase. Its rate is set mainly by GCL activity, cysteine availability and feedback inhibition by GSH itself (Wu et al., 2004). GCL has catalytic (GCLC) and modifier (GCLM) subunits, and the genes for GCL and GSH synthetase are regulated by transcription factors including Nrf2 through the antioxidant response element, AP-1 and NF-κB (Lu, 2013).",
      },
      {
        type: "p",
        text: "Roles: GSH/GSSG is the major redox couple in animal cells (Wu et al., 2004). Glutathione takes part in antioxidant defence, in the detoxification of xenobiotics, and in regulating gene expression, cell proliferation and apoptosis, signal transduction and protein glutathionylation (Wu et al., 2004; Lu, 2013).",
      },
      {
        type: "callout",
        text: "These are findings of cell biochemistry and enzymology. They describe how glutathione is made and what it does inside cells. They are not evidence of any effect of adding glutathione in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Most abundant low-molecular-weight thiol; GSH/GSSG the major redox couple in animal cells (Wu et al., 2004)",
          "Two-step cytosolic synthesis by glutamate-cysteine ligase and GSH synthetase, limited by GCL activity and cysteine (Wu et al., 2004; Lu, 2013)",
          "Synthesis genes regulated by Nrf2/ARE, AP-1 and NF-κB (Lu, 2013)",
          "Roles in antioxidant defence, xenobiotic detoxification and cell signalling (Wu et al., 2004; Lu, 2013)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Uptake: intact glutathione added outside cells is not simply taken up; how much enters cells intact, versus being broken down and resynthesised, depends on the cell type and conditions.",
          "Oxidation in handling: GSH oxidises to GSSG in solution, so the GSH/GSSG ratio measured in an experiment can reflect sample handling as well as biology.",
          "Compartments: glutathione pools in the cytosol, mitochondria and nucleus are regulated separately, and whole-cell measurements can hide shifts between them.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Glutathione was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies glutathione as a research chemical for laboratory use only; it is not sold as a drug or a dietary supplement.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "What makes glutathione's structure unusual?",
            a: "The glutamate–cysteine bond uses glutamate's side-chain (γ) carboxyl group rather than the α-carboxyl group of an ordinary peptide bond.",
          },
          {
            q: "What is the difference between GSH and GSSG?",
            a: "GSH is reduced glutathione. GSSG is glutathione disulfide, formed when two GSH molecules are oxidised and joined through their cysteine sulfur atoms.",
          },
          {
            q: "What kind of evidence is summarised here?",
            a: "Biochemistry and enzymology reviews. No laboratory result here shows an effect in people.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Wu G, Fang YZ, Yang S, et al. \"Glutathione metabolism and its implications for health.\" Journal of Nutrition. 2004;134(3):489-492. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/14988435/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Lu SC. \"Glutathione synthesis.\" Biochimica et Biophysica Acta. 2013;1830(5):3143-3153. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/22995213/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. PubChem. Glutathione (CID 124886). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/124886", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "pinealon-research-guide",
    ruo: true,
    title: "Pinealon: A Research Literature Summary",
    excerpt:
      "The synthetic tripeptide Glu-Asp-Arg (EDR). What laboratory studies have measured — reactive oxygen species and cell death in three cell types, dendritic spines in a mouse model, and DNA docking — and what is still unknown.",
    category: "Short Peptides & Neuropeptides",
    date: "August 2026",
    lastUpdated: "October 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "Pinealon is one of the short \"bioregulator\" peptides from Vladimir Khavinson's group at the Saint Petersburg Institute of Bioregulation and Gerontology, the same program behind Epithalon. Published work measures oxidative-stress markers, cell survival and gene-related endpoints in cell-culture and rodent models. This summary covers those studies and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Pinealon is the synthetic tripeptide Glu-Asp-Arg (EDR; molecular formula C15H26N6O8, molecular weight 418.4 g/mol, CAS 175175-23-2). It is a different molecule from Epithalon (Ala-Glu-Asp-Gly), although both come from the same research program.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "Khavinson and colleagues (Rejuvenation Research, 2011) reported that Pinealon reduced reactive oxygen species (ROS) accumulation in a concentration-dependent way in cerebellar granule cells, neutrophils and PC12 cells under induced oxidative stress, and decreased necrotic cell death. The effect came with delayed ERK1/2 activation and changes in the cell cycle. Because the ROS and cell-death effects plateaued at lower concentrations while cell-cycle changes continued at higher ones, the authors proposed that Pinealon also interacts directly with the cell genome.",
      },
      {
        type: "p",
        text: "A 2021 study from the same group (Pharmaceuticals) examined EDR and the related tripeptide KED in 5xFAD mice, a transgenic Alzheimer's disease model. Dendritic spine loss seen in those mice was not seen with either peptide. Molecular docking found binding sites for EDR in the promoter regions of several genes, including CASP3, GAP43, APOE and SOD2.",
      },
      {
        type: "callout",
        text: "These findings come from cell culture, a transgenic mouse model and computer docking. They describe what Pinealon does to those endpoints in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Concentration-dependent reduction of ROS and necrotic cell death in cerebellar granule cells, neutrophils and PC12 cells (Khavinson et al., 2011)",
          "Delayed ERK1/2 activation and cell-cycle changes in the same study (Khavinson et al., 2011)",
          "Dendritic spine loss not seen in 5xFAD mice given EDR or KED (Khavinson et al., 2021)",
          "Docking predicts EDR binding sites in gene promoter regions (Khavinson et al., 2021)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Independent replication: the literature comes almost entirely from one research group.",
          "Genome interaction: the proposal that a tripeptide binds DNA rests on indirect evidence and docking, and has not been shown experimentally.",
          "Specificity: how much of the effect is specific to the EDR sequence, rather than shared by related short peptides such as KED, is not settled.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Pinealon is not approved by the FDA for any use, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies Pinealon as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is Pinealon the same as Epithalon?",
            a: "No. Pinealon is the tripeptide Glu-Asp-Arg; Epithalon is the tetrapeptide Ala-Glu-Asp-Gly. They come from the same research program but are different molecules.",
          },
          {
            q: "What kind of evidence exists for Pinealon?",
            a: "Cell-culture and transgenic-mouse studies and computer docking, almost all from one research group. No laboratory result here shows an effect in people.",
          },
          {
            q: "What does EDR stand for?",
            a: "The one-letter codes of its three amino acids: E (glutamic acid), D (aspartic acid), R (arginine).",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Khavinson V, Ribakova Y, Kulebiakin K, et al. \"Pinealon increases cell viability by suppression of free radical levels and activating proliferative processes.\" Rejuvenation Research. 2011;14(5):535-541. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/21978084/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Khavinson V, Ilina A, Kraskovskaya N, et al. \"Neuroprotective Effects of Tripeptides-Epigenetic Regulators in Mouse Model of Alzheimer's Disease.\" Pharmaceuticals. 2021;14(6):515. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/34071923/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  // Research-literature summaries (RUO template, 2026-10-10): identity, laboratory
  // findings by model, open questions, regulatory status, references. No amounts given
  // to animals or people, no human outcomes, no product links, no sourcing section.
  {
    slug: "semax-research-guide",
    ruo: true,
    title: "Semax: A Research Literature Summary",
    excerpt:
      "A synthetic heptapeptide built from the ACTH(4–7) fragment plus a Pro-Gly-Pro tail. What laboratory studies have measured — neurotrophin gene expression, monoamine turnover and ischemia transcriptomics in rodents — and what is still unknown.",
    category: "Short Peptides & Neuropeptides",
    date: "October 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "Semax is a synthetic heptapeptide developed at the Institute of Molecular Genetics of the Russian Academy of Sciences. Its published research base is large for a short peptide but concentrated: most of it is rodent and cell work from a small network of Moscow laboratories. This summary covers what those laboratory studies measured, how strong the evidence is, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Semax is the heptapeptide Met-Glu-His-Phe-Pro-Gly-Pro (molecular formula C37H51N9O10S, molecular weight 813.9 g/mol, CAS 80714-61-0). Its first four residues are residues 4–7 of adrenocorticotropic hormone (ACTH); the C-terminal Pro-Gly-Pro (PGP) tripeptide was added in place of ACTH residues 8–10. The literature often calls it an ACTH(4–10) analog for that reason.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The most-cited line of work concerns brain-derived neurotrophic factor (BDNF). Dolotov and colleagues (Brain Research, 2006) reported that Semax raised BDNF protein and trkB receptor phosphorylation in the rat hippocampus, along with BDNF exon III and trkB mRNA, and proposed that the hippocampal BDNF/trkB system mediates its activity in that model.",
      },
      {
        type: "p",
        text: "A second line looks at monoamines. Eremin and colleagues (Neurochemical Research, 2005) found that Semax alone increased striatal levels of the serotonin metabolite 5-HIAA in rodents without changing dopamine or its metabolites, but enhanced the striatal dopamine release produced by D-amphetamine.",
      },
      {
        type: "p",
        text: "A third uses whole-transcriptome methods in a rat model of focal cerebral ischemia (permanent middle cerebral artery occlusion). Medvedeva and colleagues (BMC Genomics, 2014) reported that Semax mainly shifted the expression of immune-system genes, notably immunoglobulins and chemokines, plus a smaller set of vascular-system genes. Dmitrieva and colleagues (Cellular and Molecular Neurobiology, 2010) found that Semax and its PGP fragment both changed transcription of neurotrophins and their receptors in the same model, with Semax acting selectively in ischemic cortex and PGP largely non-specifically.",
      },
      {
        type: "callout",
        text: "These findings come from rodent models and tissue measurements: gene expression, protein levels and neurotransmitter metabolites. They describe what Semax does to those endpoints in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Hippocampal BDNF protein, trkB phosphorylation and BDNF/trkB mRNA increased in rats (Dolotov et al., 2006)",
          "Striatal 5-HIAA increased; dopamine release from D-amphetamine enhanced; dopamine alone unchanged, in rodents (Eremin et al., 2005)",
          "Immune- and vascular-gene expression shifted in rat cortex after focal ischemia, by genome-wide analysis (Medvedeva et al., 2014)",
          "Neurotrophin and receptor transcription changed by Semax and by its PGP fragment in the same model (Dmitrieva et al., 2010)",
          "In vitro, Semax inhibited enkephalin-degrading enzymes from human serum (IC50 about 10 µM), as did its pentapeptide fragment (Kost et al., 2001)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Independent replication: nearly all of the work comes from one Moscow research network, and outside replication is sparse.",
          "Active species: the PGP fragment is active by itself in some assays, so how much of each result comes from the intact heptapeptide and how much from its fragments is unresolved.",
          "Stability: how fast Semax breaks down in biological media is an active research topic (Shevchenko et al., 2013), and it affects how every in vivo result should be read.",
          "Many of the primary papers are in Russian-language journals with English abstracts only, which limits independent review of methods.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Semax is not approved by the FDA for any use. Semax (free base) and Semax acetate were reviewed at the FDA Pharmacy Compounding Advisory Committee meeting on July 24, 2026, as candidates for the 503A bulk drug substances list; the committee voted 8–5 in favor. The vote is advisory and not binding, and FDA had taken no final action as of this writing. Aura Protocols supplies Semax as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "How is Semax related to ACTH?",
            a: "Its first four residues, Met-Glu-His-Phe, are residues 4–7 of adrenocorticotropic hormone. The Pro-Gly-Pro tail is not part of ACTH; it replaces residues 8–10.",
          },
          {
            q: "What kind of evidence exists for Semax?",
            a: "Mostly rodent studies measuring gene expression, protein levels and neurotransmitter metabolites, plus in vitro enzyme work. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
          {
            q: "Is the Pro-Gly-Pro fragment active on its own?",
            a: "In some assays, yes. Dmitrieva and colleagues (2010) found PGP alone changed neurotrophin transcription in ischemic rat cortex, though less selectively than Semax.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Dolotov OV, Karpenko EA, Inozemtseva LS, et al. \"Semax, an analog of ACTH(4-10) with cognitive effects, regulates BDNF and trkB expression in the rat hippocampus.\" Brain Research. 2006;1117(1):54-60. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/16996037/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Eremin KO, Kudrin VS, Saransaari P, et al. \"Semax, an ACTH(4-10) analogue with nootropic properties, activates dopaminergic and serotoninergic brain systems in rodents.\" Neurochemical Research. 2005;30(12):1493-1500. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/16362768/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Medvedeva EV, Dmitrieva VG, Povarova OV, et al. \"The peptide semax affects the expression of genes related to the immune and vascular systems in rat brain focal ischemia: genome-wide transcriptional analysis.\" BMC Genomics. 2014;15:228. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/24661604/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Dmitrieva VG, Povarova OV, Skvortsova VI, et al. \"Semax and Pro-Gly-Pro activate the transcription of neurotrophins and their receptor genes after cerebral ischemia.\" Cellular and Molecular Neurobiology. 2010;30(1):71-79. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/19633950/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Kost NV, Sokolov OIu, Gabaeva MV, et al. \"Semax and selank inhibit the enkephalin-degrading enzymes from human serum.\" Bioorganicheskaia Khimiia. 2001;27(3):180-183. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/11443939/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Shevchenko KV, Nagaev IY, Andreeva LA, et al. \"Stability of Semax acetyl to proteolysis in various biological media.\" Doklady Biological Sciences. 2013;449:110-112. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/23652441/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "7. FDA. \"July 23-24, 2026: Meeting of the Pharmacy Compounding Advisory Committee.\" ",
          { href: "https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026", text: "fda.gov", external: true },
          " Vote reported by RAPS, 24 July 2026: ",
          { href: "https://www.raps.org/resource/fda-advisory-committee-backs-two-more-peptides-rejects-one-for-compounding-list.html", text: "raps.org", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
  {
    slug: "selank-research-guide",
    ruo: true,
    title: "Selank: A Research Literature Summary",
    excerpt:
      "A synthetic heptapeptide: the tetrapeptide tuftsin extended with Pro-Gly-Pro. What laboratory studies have measured — GABAergic gene expression, GABA receptor binding and immune-gene expression in rodents — and what is still unknown.",
    category: "Short Peptides & Neuropeptides",
    date: "October 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "Selank is a synthetic heptapeptide from the same Moscow research community as Semax (the Institute of Molecular Genetics and the Zakusov Institute of Pharmacology). Its laboratory literature centres on two themes: the GABA system and immune-gene expression. This summary covers what those studies measured, how strong the evidence is, and the questions that remain open.",
      },
      { type: "h2", text: "Chemical Identity" },
      {
        type: "p",
        text: "Selank is the heptapeptide Thr-Lys-Pro-Arg-Pro-Gly-Pro (molecular formula C33H57N11O9, molecular weight 751.9 g/mol, CAS 129954-34-3). Its first four residues are tuftsin (Thr-Lys-Pro-Arg), a naturally occurring tetrapeptide; the C-terminal Pro-Gly-Pro is the same tail used in Semax. Papers usually describe it as a tuftsin analog.",
      },
      { type: "h2", text: "Mechanisms Examined in Laboratory Studies" },
      {
        type: "p",
        text: "The main mechanistic hypothesis involves the GABA system. In receptor-binding experiments on isolated brain-cell membranes, Vyunova and colleagues (Protein & Peptide Letters, 2018) reported that Selank acted on [3H]GABA binding as a positive allosteric modulator, and that combining it with diazepam or olanzapine changed binding in a non-additive way. Volkova and colleagues (Frontiers in Pharmacology, 2016) measured 84 neurotransmission genes in rat frontal cortex and found Selank and GABA altered the expression of many of the same genes, with correlated changes one hour after administration.",
      },
      {
        type: "p",
        text: "A behavioral line uses standard rodent stress models. Kasian and colleagues (Behavioural Neurology, 2017) compared Selank, diazepam and the two together in rats under unpredictable chronic mild stress, scoring anxiety-related behavior in the elevated plus maze. Earlier work by Kozlovskaya and colleagues (2003) compared Selank with ten tuftsin-family peptides in rodent conflict-stress tests.",
      },
      {
        type: "p",
        text: "A third line concerns immune-gene expression. Kolomin and colleagues (Molecular Immunology, 2014) tracked complement C3, Casp1, Il2rg and Xcr1 mRNA in mouse spleen after Selank or its Gly-Pro fragment, and found the two produced largely matching expression profiles.",
      },
      {
        type: "callout",
        text: "These findings come from membrane preparations, rodent tissue and rodent behavior tests. They describe what Selank does to those endpoints in those models. They are not evidence of any effect in people.",
      },
      { type: "h2", text: "Published Research at a Glance" },
      {
        type: "ul",
        items: [
          "Positive allosteric modulation of [3H]GABA binding in brain-cell membranes (Vyunova et al., 2018)",
          "Expression of neurotransmission genes in rat frontal cortex changed, correlating with GABA's own pattern (Volkova et al., 2016)",
          "Anxiety-related elevated plus maze measures compared for Selank, diazepam and both, in rats under chronic mild stress (Kasian et al., 2017)",
          "Inflammation-related gene expression in mouse spleen changed by Selank and its Gly-Pro fragment (Kolomin et al., 2014)",
          "In vitro, Selank inhibited enkephalin-degrading enzymes from human serum (IC50 about 20 µM) (Kost et al., 2001)",
        ],
      },
      { type: "h2", text: "Open Questions" },
      {
        type: "ul",
        items: [
          "Independent replication: almost all of the literature comes from one Moscow research network.",
          "Binding site: the receptor-binding work suggests Selank's site on the GABA receptor complex differs from diazepam's, but it has not been identified.",
          "Active species: the Gly-Pro fragment reproduces several of the gene-expression results, so the contribution of the intact heptapeptide versus its fragments is unresolved.",
          "Many of the primary papers are in Russian-language journals with English abstracts only.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "Selank is not approved by the FDA for any use, and it was not among the substances reviewed at the FDA Pharmacy Compounding Advisory Committee meeting of July 23–24, 2026. Aura Protocols supplies Selank as a research chemical for laboratory use only.",
      },
      {
        type: "faq",
        faq: [
          {
            q: "How are Selank and Semax related?",
            a: "Both are heptapeptides that end in Pro-Gly-Pro and come from the same research community. They start differently: Selank with tuftsin (Thr-Lys-Pro-Arg), Semax with the ACTH(4–7) fragment (Met-Glu-His-Phe).",
          },
          {
            q: "What kind of evidence exists for Selank?",
            a: "Receptor-binding work on brain membranes, gene-expression studies in rodent tissue and rodent behavior tests, plus in vitro enzyme work. This summary does not cover clinical literature, and no laboratory result here shows an effect in people.",
          },
          {
            q: "What is tuftsin?",
            a: "A naturally occurring tetrapeptide, Thr-Lys-Pro-Arg. Selank's first four residues are tuftsin.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Vyunova TV, Andreeva L, Shevchenko K, Myasoedov N. \"Peptide-based Anxiolytics: The Molecular Aspects of Heptapeptide Selank Biological Activity.\" Protein & Peptide Letters. 2018;25(10):914-923. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/30255741/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Volkova A, Shadrina M, Kolomin T, et al. \"Selank Administration Affects the Expression of Some Genes Involved in GABAergic Neurotransmission.\" Frontiers in Pharmacology. 2016;7:31. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/26924987/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Kasian A, Kolomin T, Andreeva L, et al. \"Peptide Selank Enhances the Effect of Diazepam in Reducing Anxiety in Unpredictable Chronic Mild Stress Conditions in Rats.\" Behavioural Neurology. 2017;2017:5091027. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/28280289/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Kozlovskaya MM, Kozlovskii II, Val'dman EA, Seredenin SB. \"Selank and short peptides of the tuftsin family in the regulation of adaptive behavior in stress.\" Neuroscience and Behavioral Physiology. 2003;33(9):853-860. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/14969422/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Kolomin T, Morozova M, Volkova A, et al. \"The temporary dynamics of inflammation-related genes expression under tuftsin analog Selank action.\" Molecular Immunology. 2014;58(1):50-55. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/24291245/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Kost NV, Sokolov OIu, Gabaeva MV, et al. \"Semax and selank inhibit the enkephalin-degrading enzymes from human serum.\" Bioorganicheskaia Khimiia. 2001;27(3):180-183. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/11443939/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "7. PubChem. Selank (CID 11765600) and Tuftsin (CID 156080). ",
          { href: "https://pubchem.ncbi.nlm.nih.gov/compound/11765600", text: "pubchem.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This summary describes published laboratory research. It is not medical advice. All products sold by Aura Protocols are for research use only — not for human or veterinary use.",
      },
    ],
  },
];
