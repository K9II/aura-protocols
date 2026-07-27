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
          "Step 1 — Connect a wearable for free at auraprotocols.com (Whoop, Oura, or Apple Health)",
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
            a: "Yes. You can connect a wearable and get a data-matched starting protocol for free at auraprotocols.com. The optional MD-prescribed path is a separate, supervised step you choose only when you're ready.",
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
        text: "View PT-141 at Swiss Chems",
        productSlug: "pt-141",
        vendor: "Swiss Chems",
        affiliateUrl: "https://swisschems.is/product/pt-141-10mg-price-is-per-vial/?ref=AuraPro",
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
    title: "BPC-157: The Complete Research Guide",
    excerpt:
      "Mechanism of action, preclinical evidence, and regulatory status — every claim linked to its source.",
    category: "Recovery",
    date: "July 2026",
    readTime: "9 min read",
    content: [
      {
        type: "intro",
        text: "BPC-157 is one of the most searched research peptides for tissue repair. Here's what the preclinical literature actually shows — mechanism, evidence by tissue type, and current regulatory status — with the primary source for every claim.",
      },
      { type: "h2", text: "What Is BPC-157?" },
      {
        type: "p",
        text: "BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide — a 15-amino-acid sequence — derived from a partial sequence of a protective protein identified in human gastric juice. It has been studied since the 1990s, almost entirely in animal and cell-culture models.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "The most consistently reproduced mechanism across the literature is activation of the VEGFR2 pathway, which drives angiogenesis — new blood vessel formation — through downstream Akt–eNOS signaling and nitric oxide production.",
      },
      {
        type: "p",
        text: "In tendon fibroblasts specifically, BPC-157 activates the FAK–paxillin pathway, linked to increased fibroblast outgrowth from tendon explants, better cell survival under stress, and increased fibroblast migration — a proposed mechanism for its studied effects on tendon repair.",
      },
      {
        type: "callout",
        text: "A 2025 paper proposes a further upstream mechanism — BPC-157 binding SH3 domains on Src-family kinases — based on computational modeling rather than lab experiments. Worth knowing this exists, but it hasn't been confirmed experimentally.",
      },
      { type: "h2", text: "What the Preclinical Research Shows" },
      {
        type: "p",
        text: "All of the following is animal and cell-culture data. By tissue type, per a 2025 systematic review of the orthopaedic sports-medicine literature:",
      },
      {
        type: "ul",
        items: [
          "Tendon — accelerated fibroblast outgrowth and migration; increased growth hormone receptor expression in tendon fibroblasts",
          "Muscle — improved healing outcomes reported across multiple animal injury models",
          "Skin / wound healing — accelerated closure in both acute and chronic wound models",
          "Gastrointestinal mucosa — restoration of blood supply and vascular perfusion in colitis models, the tissue BPC-157 was originally isolated from",
        ],
      },
      { type: "h2", text: "Regulatory & Safety Status" },
      {
        type: "p",
        text: "BPC-157 was nominated in September 2023 for FDA's Category 2 list of bulk drug substances — the category for substances the agency says \"may present significant safety risks.\" That nomination was later withdrawn, which is what cleared the way for the review below: the substance became eligible to be formally evaluated for the opposite outcome — legal inclusion on FDA's list of substances compounding pharmacies can prepare.",
      },
      {
        type: "h3",
        text: "The July 23–24, 2026 FDA Advisory Vote",
      },
      {
        type: "p",
        text: "Over two days, FDA's Pharmacy Compounding Advisory Committee (PCAC) reviewed seven peptides — including BPC-157 — for possible addition to the Section 503A Bulk Drug Substances List, the roster licensed compounding pharmacies can legally prepare against a prescription. The specific use under review for BPC-157 was treating ulcerative colitis, an inflammatory bowel disease. FDA's own scientific staff told the committee there is a \"lack of evidence\" to support that use and noted the agency has already approved multiple drugs for ulcerative colitis. The committee voted in favor of expanding access anyway — one of six peptides (of seven reviewed) the panel backed; only Emideltide was voted down.",
      },
      {
        type: "callout",
        text: "This is a non-binding recommendation, not a rule change or an approval. FDA isn't required to follow PCAC's vote, though it typically does. If FDA moves forward, it happens through formal rulemaking that could take until 2027 or 2028 — this is not something that makes BPC-157 legally compoundable today. NPR's reporting on the vote is direct on this point: \"the decision to place the products on the FDA's official list for compounding doesn't come close to the standards for drug approval.\" As of this writing (July 26, 2026), nothing about BPC-157's actual legal status has changed — it remains not FDA-approved for any human use.",
      },
      {
        type: "p",
        text: "Worth knowing before weighting this vote too heavily: NPR reported that eight new PCAC members were seated ahead of this meeting, most with ties to the peptide industry, and that they voted almost uniformly to loosen restrictions — while FDA's own scientists recommended against all seven substances, citing a lack of reliable human safety and efficacy data. At least one panelist voted no specifically over that dynamic, saying she was \"concerned that we are responding to market induced demand rather than a decision based in solid science.\" We're reporting the vote as real news, not as new evidence that BPC-157 works or is safe for human use — those are separate questions the vote doesn't resolve.",
      },
      {
        type: "p",
        text: "None of this changes the underlying legal basis for \"Research Use Only\" labeling today: BPC-157 has never been reviewed or approved by FDA as a drug for any human use, and selling an unapproved drug for human use can implicate misbranding and adulteration law independent of its bulk-substance list status.",
      },
      {
        type: "callout",
        text: "FDA rulemaking and advisory outcomes change over time — this status was verified directly against fda.gov, NPR, and U.S. News reporting on 2026-07-26. If you're making a decision based on current regulatory status, re-verify it directly rather than relying on this page's snapshot.",
      },
      {
        type: "p",
        text: "Separately, a preclinical review reports no lethal dose was reached across the animal toxicity studies it surveyed. That's animal toxicology, not a human safety guarantee.",
      },
      { type: "h2", text: "Where to Source BPC-157 for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the BPC-157 product page",
        productSlug: "bpc-157",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is BPC-157 approved by the FDA for human use?",
            a: "No. On July 23, 2026, an FDA advisory committee voted to recommend adding BPC-157 to the list of substances compounding pharmacies can legally prepare — specifically for treating ulcerative colitis, over FDA staff's own objection that the evidence doesn't support it. That's a non-binding recommendation, not an approval; formal FDA rulemaking, if it happens, could take until 2027 or 2028. As of today, BPC-157 remains not FDA-approved for any human use.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Vasireddi N, et al. \"Emerging Use of BPC-157 in Orthopaedic Sports Medicine.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/40756949/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Chang CH, et al. \"The promoting effect of pentadecapeptide BPC 157 on tendon fibroblasts.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/21030672/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. \"Gastric pentadecapeptide body protection compound BPC 157 and its role in accelerating musculoskeletal soft tissue healing.\" ",
          { href: "https://link.springer.com/article/10.1007/s00441-019-03016-8", text: "Cell and Tissue Research", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. \"BPC-157 and GHK-Cu in Wound Healing and Tissue Repair: A Review of Clinical Efficacy and Safety.\" ",
          { href: "https://www.researchgate.net/publication/404069524", text: "ResearchGate", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. \"BPC-157 Binding to SH3 Domains and Activation of Src Family Kinases: In Silico Modeling.\" Preprint, not peer-reviewed. ",
          { href: "https://www.researchgate.net/publication/398398323", text: "ResearchGate", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. \"Pentadecapeptide BPC 157 enhances the growth hormone receptor expression in tendon fibroblasts.\" ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/25415472/", text: "PubMed", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "7. FDA. \"Substances in Compounding that May Present Significant Safety Risks.\" ",
          { href: "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks", text: "FDA.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "8. Stone W. \"FDA panel supports broadening access to peptides popular on the gray market.\" NPR, July 23–24, 2026. ",
          { href: "https://www.npr.org/2026/07/23/nx-s1-5903202/fda-peptides-restrictions", text: "npr.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "9. Smith-Schoenwalder C. \"FDA Committee Votes on These 7 Peptides.\" U.S. News & World Report, July 24, 2026. ",
          { href: "https://www.usnews.com/news/national-news/articles/2026-07-24/fda-committee-votes-on-7-peptides-what-are-they", text: "usnews.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "semaglutide-vs-tirzepatide",
    title: "Semaglutide vs. Tirzepatide: What the Research Shows",
    excerpt:
      "Comparing two of the most researched GLP-1 receptor agonists for body composition and metabolic health.",
    category: "Weight Management",
    date: "March 2026",
    readTime: "7 min read",
    content: [
      {
        type: "intro",
        text: "GLP-1 receptor agonists have fundamentally changed the metabolic research landscape. Semaglutide and tirzepatide are the two most studied compounds in this class — but they work through meaningfully different mechanisms. Here's what the literature actually shows.",
      },
      {
        type: "h2",
        text: "Mechanism of Action",
      },
      {
        type: "h3",
        text: "Semaglutide",
      },
      {
        type: "p",
        text: "Semaglutide is a GLP-1 (glucagon-like peptide-1) receptor agonist. It mimics the endogenous GLP-1 hormone, which is released after eating. Its primary effects include slowing gastric emptying, stimulating insulin secretion in a glucose-dependent manner, and suppressing glucagon release. The net result is reduced appetite, improved glycemic control, and significant reductions in body weight.",
      },
      {
        type: "h3",
        text: "Tirzepatide",
      },
      {
        type: "p",
        text: "Tirzepatide is a dual GIP/GLP-1 receptor agonist — it activates both the glucose-dependent insulinotropic polypeptide (GIP) receptor and the GLP-1 receptor. This dual agonism appears to produce synergistic effects on insulin secretion, fat metabolism, and appetite suppression, which may explain its more pronounced effects in head-to-head comparisons.",
      },
      {
        type: "h2",
        text: "Head-to-Head: What Studies Show",
      },
      {
        type: "ul",
        items: [
          "SURMOUNT-5 trial: Tirzepatide produced ~20% greater weight loss than semaglutide in people with obesity",
          "Semaglutide (STEP trials): Average 15–17% body weight reduction over 68 weeks",
          "Tirzepatide (SURMOUNT trials): Average 20–22% body weight reduction over 72 weeks",
          "Both show significant cardiovascular risk reduction in large outcome trials",
          "Tirzepatide shows stronger HbA1c reduction in T2D populations",
        ],
      },
      {
        type: "h2",
        text: "Side Effect Profiles",
      },
      {
        type: "p",
        text: "Both compounds share a similar GI side effect profile — nausea, vomiting, and diarrhea are the most commonly reported, particularly during dose escalation. These effects typically diminish over time. Tirzepatide's GIP activity may modulate some of the GI tolerability seen with pure GLP-1 agonists, though clinical differences are modest.",
      },
      {
        type: "h2",
        text: "Which Is Right for Research?",
      },
      {
        type: "p",
        parts: [
          "The choice between ",
          { href: "/products/semaglutide", text: "semaglutide" },
          " and tirzepatide for research purposes depends on the specific question being studied. Semaglutide has a longer research track record and more published data — see the ",
          { href: "/products/retatrutide", text: "retatrutide" },
          " page for how the newer triple-agonist class compares on trial results. Tirzepatide represents the current frontier of dual-agonist research and shows greater magnitude of effect in weight-focused studies.",
        ],
      },
      {
        type: "callout",
        text: "Neither semaglutide nor tirzepatide is approved for general use outside of specific medical indications. Research applications require appropriate institutional oversight.",
      },
      {
        type: "cta",
        text: "View Semaglutide Vendors",
        productSlug: "semaglutide",
        vendor: "GLP-1 Research Lab",
        affiliateUrl: "https://www.glp1researchlab.com/product/semaglutide?aff=84",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "cjc-1295-ipamorelin-stack",
    title: "CJC-1295 / Ipamorelin Stack: Growth Hormone Optimization",
    excerpt:
      "Why this combo has become the gold standard for GH-axis support in research settings.",
    category: "Growth & Performance",
    date: "March 2026",
    readTime: "6 min read",
    content: [
      {
        type: "intro",
        text: "Among growth hormone secretagogue combinations, CJC-1295 paired with Ipamorelin has emerged as one of the most researched and consistently cited stacks. The synergy between these two compounds — one a GHRH analogue, the other a selective ghrelin mimetic — produces robust, pulsatile GH release with a favorable safety profile compared to exogenous GH administration.",
      },
      {
        type: "h2",
        text: "Understanding Each Compound",
      },
      {
        type: "h3",
        text: "CJC-1295 (with DAC)",
      },
      {
        type: "p",
        text: "CJC-1295 is a synthetic analogue of growth hormone-releasing hormone (GHRH). The DAC (Drug Affinity Complex) modification extends its half-life from minutes to approximately 6–8 days by binding to serum albumin. This produces sustained elevation of baseline GH and IGF-1 levels rather than sharp pulses.",
      },
      {
        type: "h3",
        text: "Ipamorelin",
      },
      {
        type: "p",
        text: "Ipamorelin is a selective growth hormone secretagogue and ghrelin receptor agonist (GHSR). It is notable for its high selectivity — it stimulates GH release without significantly elevating cortisol or prolactin, which distinguishes it from older GH secretagogues like GHRP-2 and GHRP-6.",
      },
      {
        type: "h2",
        text: "Why the Combination Works",
      },
      {
        type: "p",
        text: "CJC-1295 and Ipamorelin act on two distinct receptors within the GH axis — GHRH receptors and ghrelin receptors respectively. When combined, they produce a synergistic amplification of GH pulse amplitude. Research suggests the combination produces GH release 2–10x greater than either compound alone, while maintaining the physiological pulsatile pattern that exogenous GH disrupts.",
      },
      {
        type: "ul",
        items: [
          "CJC-1295 raises the baseline 'floor' of GH secretion",
          "Ipamorelin amplifies individual GH pulses",
          "Combined effect: higher amplitude pulses on an elevated baseline",
          "Preserves natural GH rhythm unlike exogenous HGH",
          "No significant cortisol or prolactin elevation (Ipamorelin selective)",
        ],
      },
      {
        type: "h2",
        text: "Studied Effects",
      },
      {
        type: "ul",
        items: [
          "Increased lean body mass in multiple animal models",
          "Reduction in adipose tissue in animal models, particularly visceral fat",
          "Improved sleep quality (GH is primarily secreted during slow-wave sleep)",
          "Enhanced recovery from exercise-induced muscle damage in preclinical studies",
          "Improved bone mineral density markers in aging models",
        ],
      },
      {
        type: "callout",
        text: "CJC-1295 and Ipamorelin are research compounds only. They have not been approved by the FDA for human use. All referenced effects are from preclinical studies.",
      },
      {
        type: "cta",
        text: "View CJC-1295 / Ipamorelin at Limitless Life Nootropics",
        productSlug: "cjc-1295-ipamorelin",
        vendor: "Limitless Life Nootropics",
        affiliateUrl: "https://limitlesslifenootropics.com/product/ipamorelin-cjc-1295-no-dac?uid=27&oid=1&affid=10866",
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
        text: "View CJC-1295 / Ipamorelin at Limitless Life Nootropics",
        productSlug: "cjc-1295-ipamorelin",
        vendor: "Limitless Life Nootropics",
        affiliateUrl: "https://limitlesslifenootropics.com/product/ipamorelin-cjc-1295-no-dac?uid=27&oid=1&affid=10866",
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
        vendor: "Swiss Chems",
        affiliateUrl: "https://swisschems.is/product/pt-141-10mg-price-is-per-vial/?ref=AuraPro",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "how-to-read-a-peptide-coa",
    title: "How to Read a Peptide Certificate of Analysis",
    excerpt:
      "A plain-English breakdown of what's in a COA, what to look for, and red flags to avoid.",
    category: "Buyer's Guide",
    date: "February 2026",
    readTime: "5 min read",
    content: [
      {
        type: "intro",
        text: "A Certificate of Analysis (COA) is the single most important document when evaluating a peptide vendor. It's the paper trail between a manufacturer's claims and independent verification. Yet most buyers don't know how to read one. This guide breaks it down.",
      },
      {
        type: "h2",
        text: "What a COA Should Include",
      },
      {
        type: "ul",
        items: [
          "Product name and lot/batch number",
          "Testing laboratory name and accreditation (look for ISO 17025)",
          "Test date (should be recent — within 12 months of purchase)",
          "HPLC purity result (High-Performance Liquid Chromatography)",
          "Mass spectrometry (MS) confirmation of molecular identity",
          "Amino acid composition or sequence confirmation",
          "Moisture content and residual solvent analysis (for lyophilized peptides)",
        ],
      },
      {
        type: "h2",
        text: "The Most Important Number: HPLC Purity",
      },
      {
        type: "p",
        text: "HPLC purity tells you what percentage of the sample is actually the peptide you ordered. Everything else is impurities — which could be related peptide fragments, synthesis byproducts, or in worst cases, entirely different compounds.",
      },
      {
        type: "ul",
        items: [
          "≥99% purity — pharmaceutical grade, ideal for sensitive research",
          "≥98% purity — research grade, acceptable for most applications",
          "95–98% purity — lower grade, use with caution",
          "Below 95% — do not use for any serious research application",
        ],
      },
      {
        type: "h2",
        text: "Mass Spectrometry: Confirming Identity",
      },
      {
        type: "p",
        text: "HPLC tells you how pure the sample is, but mass spectrometry (MS) tells you what it actually is. A COA with both HPLC and MS data is significantly more trustworthy than one with HPLC alone. Look for the reported molecular weight to match the theoretical molecular weight of the compound within a small margin (typically ±0.5 Da).",
      },
      {
        type: "h2",
        text: "Red Flags to Watch For",
      },
      {
        type: "ul",
        items: [
          "No third-party lab — in-house testing only means the vendor is grading their own work",
          "No lab name or accreditation on the COA",
          "COA older than 18 months — peptides degrade, testing should be recent",
          "Purity reported without a specific method (HPLC, MS, etc.)",
          "Generic COA not tied to a specific batch number",
          "COA available only on request — reputable vendors post them publicly",
        ],
      },
      {
        type: "h2",
        text: "How Aura Protocols Vets Vendors",
      },
      {
        type: "p",
        parts: [
          "Every vendor we feature on Aura Protocols must provide batch-specific COAs from accredited third-party laboratories. We manually review these documents before listing any product. If a vendor's documentation doesn't meet our standards, they don't appear on this site — regardless of commission rates. See our full ",
          { href: "/about", text: "vendor vetting methodology" },
          " for the complete criteria, or browse the ",
          { href: "/products", text: "full compound catalog" },
          " to see which vendors carry a specific peptide.",
        ],
      },
      {
        type: "callout",
        text: "When in doubt, email the vendor and ask for the COA for the specific batch you're purchasing. A trustworthy vendor will respond promptly with complete documentation.",
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
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
    slug: "tesamorelin-research-guide",
    title: "Tesamorelin: The Complete Research Guide",
    excerpt:
      "A genuinely FDA-approved GHRH analogue — but the approval covers one narrow HIV-related indication, not general body composition. Here's exactly what it does and doesn't cover.",
    category: "Body Composition",
    date: "July 2026",
    readTime: "8 min read",
    content: [
      {
        type: "intro",
        text: "Tesamorelin is one of the few compounds on this site with a real, standing FDA approval. That approval is also much narrower than the way tesamorelin gets discussed in most research-peptide circles — and getting that distinction right is the entire point of this guide.",
      },
      { type: "h2", text: "What Is Tesamorelin?" },
      {
        type: "p",
        text: "Tesamorelin is a synthetic growth hormone-releasing hormone (GHRH) analogue, sold under the brand names Egrifta and Egrifta WR.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "Tesamorelin doesn't act on fat tissue directly — it works two steps upstream, by restoring a signal the body normally sends to itself. Growth hormone (GH) is released from the pituitary gland in pulses, triggered by GHRH from the hypothalamus. Tesamorelin is a stabilized version of that same GHRH signal, so it amplifies the body's own pulsatile GH release rather than delivering GH directly. That distinction matters for two reasons:",
      },
      {
        type: "ul",
        items: [
          "It preserves the natural feedback loop. GH released this way still triggers the liver to produce IGF-1, which signals back to suppress further GH release — the same brake that keeps GH regulated in healthy physiology. Direct GH injection can override that feedback; a GHRH analogue is designed to work within it.",
          "GH's downstream effect on fat is the actual lipolytic step. Once GH reaches fat tissue, it stimulates hormone-sensitive lipase, the enzyme that breaks down stored fat into free fatty acids. Visceral fat — the metabolically active fat around organs, as opposed to fat just under the skin — is disproportionately responsive to this GH-driven lipolysis, which is why the drug's effect concentrates there.",
        ],
      },
      {
        type: "p",
        text: "One honest caveat worth keeping: a clinical-policy review of the approval data still calls the full mechanism \"unclear\" beyond this GH/IGF-1 chain — the GHRH-to-GH-to-visceral-fat pathway is well-supported, but not every step is fully mapped.",
      },
      { type: "h2", text: "FDA Approval — Read the Indication Carefully" },
      {
        type: "callout",
        text: "Real approval, narrow scope. Tesamorelin is FDA-approved as Egrifta (2010) and the reformulated Egrifta WR (approved March 2025) — but specifically for the reduction of excess abdominal fat in HIV-infected adult patients with lipodystrophy. It is not approved for general-population body composition or weight loss.",
      },
      {
        type: "p",
        text: "Approval was supported by trials showing reductions in visceral adipose tissue, triglycerides, and non-HDL cholesterol, plus increases in lean body mass — in the HIV-lipodystrophy population specifically. Those results don't automatically generalize to a healthy adult using it for general fat loss; that's simply a different population than the one studied.",
      },
      { type: "h2", text: "Regulatory Status for Research Use" },
      {
        type: "p",
        text: "What's sold by research-peptide vendors as tesamorelin is not the approved Egrifta pharmaceutical product — it's compounded material intended for research use, outside the approved indication and outside FDA's review of Egrifta's manufacturing and formulation.",
      },
      {
        type: "p",
        text: "Checked directly against FDA's bulk drug substances list for compounding (fetched July 2026): tesamorelin does not appear in either the active Category 2 table or the nominated-but-withdrawn table.",
      },
      { type: "h2", text: "Where to Source Tesamorelin for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the Tesamorelin product page",
        productSlug: "tesamorelin",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Is tesamorelin FDA-approved?",
            a: "Yes, but only for one narrow indication: reduction of excess abdominal fat in HIV-infected adults with lipodystrophy (brand names Egrifta / Egrifta WR). It is not approved for general fat loss or body composition.",
          },
          {
            q: "Can I use tesamorelin for general fat loss?",
            a: "That use falls outside the approved indication. What's sold as tesamorelin by research vendors is a research compound, not the approved Egrifta pharmaceutical product, and hasn't been evaluated by FDA for that purpose.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. EATG / Theratechnologies. \"FDA approval for EGRIFTA WR (tesamorelin F8),\" March 2025. ",
          { href: "https://www.eatg.org/hiv-news/theratechnologies-receives-fda-approval-for-egrifta-wr-tesamorelin-f8-to-treat-excess-visceral-abdominal-fat-in-adults-with-hiv-and-lipodystrophy/", text: "eatg.org", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Molina Healthcare Clinical Policy 131 (Egrifta/Tesamorelin), citing FDA prescribing information and NDA review documents. ",
          { href: "https://www.molinahealthcare.com/providers/wa/medicaid/resource/PDF/egrifta-tesamorelin-mcp131.pdf", text: "molinahealthcare.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. EGRIFTA WR official HCP site — indication statement. ",
          { href: "https://hcp.egriftawr.com/moa/", text: "hcp.egriftawr.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. Stanley TL, Grinspoon SK. \"Effects of growth hormone-releasing hormone on visceral fat...\" ",
          { href: "https://www.sciencedirect.com/science/article/abs/pii/S1096637414001208", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. Vijayakumar A, et al. \"Biological effects of growth hormone on carbohydrate and lipid metabolism,\" 2010. ",
          { href: "https://www.sciencedirect.com/science/article/abs/pii/S1096637409001178", text: "sciencedirect.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. FDA. \"Certain Bulk Drug Substances for Use in Compounding that May Present Significant Safety Risks.\" ",
          { href: "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks", text: "fda.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "aod-9604-research-guide",
    title: "AOD-9604: The Complete Research Guide",
    excerpt:
      "A growth-hormone fragment marketed on a mechanism its own foundational study didn't confirm — and the one time it was tested for its main proposed use in humans, it failed.",
    category: "Body Composition",
    date: "July 2026",
    readTime: "7 min read",
    content: [
      {
        type: "intro",
        text: "AOD-9604 gets a very different treatment in this guide than the rest of the Body Composition category. Its one completed human efficacy trial did not work, and its most commonly cited mechanism doesn't hold up against the primary literature it's supposedly based on. Both of those facts lead this guide instead of trailing it.",
      },
      { type: "h2", text: "What Is AOD-9604?" },
      {
        type: "p",
        text: "AOD-9604 is a fragment of human growth hormone — just amino acids 176–191, the tail end of the full molecule. Full hGH does two things at once: it promotes fat breakdown (lipolysis), and it drives tissue growth and raises blood sugar, the \"diabetogenic\" effects that make GH itself unsuitable as a casual fat-loss agent. The 176–191 fragment was identified as the region associated with lipolytic activity, with the hope that it would keep the fat-burning effect while dropping the growth and glucose side effects.",
      },
      { type: "h2", text: "Mechanism of Action — More Contested Than Most Guides Let On" },
      {
        type: "callout",
        text: "Nearly every vendor and \"peptide guide\" site states as settled fact that AOD-9604 works via the beta-3 adrenergic receptor pathway. That claim traces back to a 2001 study that set out to test exactly that hypothesis — but the peer-reviewed, published version of that same study, in Endocrinology, concluded the opposite of what gets repeated: \"the lipolytic actions of both hGH and AOD9604 are not mediated directly through the β3-AR.\" We don't repeat the beta-3-receptor claim as established fact. The honest statement is that a specific mechanism was hypothesized and tested, and the primary research available did not confirm it.",
      },
      { type: "h2", text: "Preclinical Signal" },
      {
        type: "p",
        text: "A 2001 study found AOD-9604 reduced body weight and body fat in obese mice over 14 days of chronic administration, comparable to effects seen with full hGH.",
      },
      { type: "h2", text: "Human Evidence" },
      {
        type: "callout",
        text: "AOD-9604 was tested in a Phase 2b human obesity trial — roughly 536 participants, 24 weeks, run by Metabolic Pharmaceuticals. The sponsor's own ASX filing states plainly that results \"do not support the commercial viability of the drug as a treatment for obesity.\" This is a completed, primary-source-confirmed negative result, not an absence of data — an actual failure to beat placebo.",
      },
      {
        type: "p",
        text: "That's meaningfully different framing than BPC-157, where preclinical work is promising and human trials simply haven't happened yet, or Retatrutide, where the compound isn't approved yet but the data so far is strong. For AOD-9604, the one time it was tested properly in humans for its main proposed use, it didn't work.",
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "AOD-9604 appears in FDA's \"nominated but withdrawn\" table, not the active Category 2 table — the same status as BPC-157. That means it isn't currently restricted via that specific compounding mechanism, but it has never been approved for any indication, and its one completed efficacy trial failed.",
      },
      { type: "h2", text: "Where to Source AOD-9604 for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the AOD-9604 product page",
        productSlug: "aod-9604",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Does AOD-9604 work for weight loss?",
            a: "Its one completed human efficacy trial — a Phase 2b obesity study of roughly 536 participants — failed to support its use as an obesity treatment, according to the sponsor's own filing. Preclinical (animal) data was more promising, but that hasn't translated into a positive human trial result.",
          },
          {
            q: "Is AOD-9604 FDA-approved?",
            a: "No. It has never been approved for any indication, and its nomination for FDA's compounding bulk-substances list was withdrawn.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Metabolic Pharmaceuticals. ASX announcement, \"Obesity Drug — Phase 2b Clinical Trial Results,\" Feb 21, 2007 (primary source, sponsor's own filing). ",
          { href: "https://announcements.asx.com.au/asxpdf/20070221/pdf/3111t0ww55jr72.pdf", text: "announcements.asx.com.au", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Heffernan M, et al. \"The effects of human GH and its lipolytic fragment (AOD9604) on lipid metabolism...\" PubMed, 2001. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/11713213/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Heffernan M, et al. Full peer-reviewed publication. Endocrinology 142(12):5182 — conclusion: lipolytic action \"not mediated directly through the β3-AR.\" ",
          { href: "https://academic.oup.com/endo/article-abstract/142/12/5182/2988749", text: "academic.oup.com", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. SEC/ASX filing archive, corroborating dose-group primary endpoint data. ",
          { href: "https://www.sec.gov/Archives/edgar/vprr/0702/07021963.pdf", text: "sec.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. \"Certain Bulk Drug Substances for Use in Compounding that May Present Significant Safety Risks\" — nominated-but-withdrawn table. ",
          { href: "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks", text: "fda.gov", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
  {
    slug: "kpv-research-guide",
    title: "KPV: The Complete Research Guide",
    excerpt:
      "A three-amino-acid fragment of alpha-MSH studied almost entirely in colitis models and human cell lines — with no completed human trials, and a fresh non-binding FDA compounding vote as of July 2026.",
    category: "Recovery",
    date: "July 2026",
    readTime: "7 min read",
    content: [
      {
        type: "intro",
        text: "KPV is one of the smallest peptides on this site — just three amino acids — and one of the most consistently studied for anti-inflammatory activity outside a human body. The evidence base here is real but narrow: strong, repeated preclinical signal, zero completed human trials, and a regulatory status that moved twice in the last few months. This guide keeps all three of those facts in view at once.",
      },
      { type: "h2", text: "What Is KPV?" },
      {
        type: "p",
        text: "KPV (Lysine-Proline-Valine) is a synthetic tripeptide corresponding to residues 11–13 of alpha-melanocyte-stimulating hormone (alpha-MSH) — the C-terminal fragment of the same hormone system that gives rise to compounds like PT-141 and Melanotan II. Unlike those relatives, KPV's research interest isn't in the melanocortin receptor's pigmentation or appetite pathway at all — it's in an anti-inflammatory effect that shows up even when that receptor pathway is blocked.",
      },
      { type: "h2", text: "Mechanism of Action" },
      {
        type: "p",
        text: "The core finding across the KPV literature is that its anti-inflammatory activity is largely independent of the melanocortin-1 receptor (MC1R) that mediates most of alpha-MSH's other effects — one of the original studies found KPV rescued MC1R-deficient mice from colitis just as effectively as normal mice, direct evidence the receptor isn't required for the effect.",
      },
      {
        type: "ul",
        items: [
          "PepT1-mediated uptake. KPV is a substrate for PepT1, a di/tripeptide transporter expressed in the small intestine and specifically upregulated in the colon during inflammatory bowel disease — meaning KPV is preferentially taken up exactly where gut inflammation is already active, in both epithelial and immune cells.",
          "NF-κB and MAPK inhibition. Once inside the cell, nanomolar concentrations of KPV inhibit activation of the NF-κB and MAP kinase pathways — two of the central signaling routes that turn on production of pro-inflammatory cytokines like TNF-α, IL-1β, and IL-6.",
        ],
      },
      {
        type: "p",
        text: "In plain terms: KPV doesn't work by activating a hormone receptor the way its parent molecule alpha-MSH does. It gets pulled into inflamed tissue by a transporter that inflammation itself switches on, then quiets the intracellular signaling that keeps the inflammatory response running.",
      },
      { type: "h2", text: "Research Evidence" },
      {
        type: "callout",
        text: "Every completed KPV efficacy study to date is preclinical — animal models or isolated human cell lines, not human clinical trials. There is no published human trial demonstrating KPV works as a treatment for any condition.",
      },
      {
        type: "ul",
        items: [
          "Murine colitis models. KPV showed significant anti-inflammatory effects in two distinct mouse models of inflammatory bowel disease (DSS colitis and CD45RBhi transfer colitis), reducing inflammatory infiltrates and myeloperoxidase activity, and rescuing MC1R-deficient mice from death during DSS colitis.",
          "Oral dosing via PepT1. A separate study found oral KPV reduced disease severity, colonic inflammation, and pro-inflammatory cytokine expression in both DSS- and TNBS-induced colitis in mice — notable because it demonstrated an oral route working through the PepT1 transporter, not just injection.",
          "Colitis-associated cancer model. A 2016 follow-up found KPV reduced colonic tumor formation in a mouse model of colitis-driven cancer, attributed to the same PepT1-mediated anti-inflammatory activity.",
          "Human cell lines (not human trials). The mechanism work confirming NF-κB/MAPK inhibition and PepT1 uptake was done in human intestinal epithelial cell lines (Caco2-BBE, HT29-CL.19A) and human Jurkat T cells — real human tissue, but isolated cells in a dish, not a human clinical trial.",
        ],
      },
      { type: "h2", text: "Regulatory Status" },
      {
        type: "p",
        text: "KPV is not FDA-approved for any use. Checked directly against FDA's bulk drug substances page for compounding (fetched July 2026): KPV currently sits in the \"nominated but withdrawn\" table, not the active Category 2 restricted table — the same status as BPC-157 and AOD-9604. FDA's own stated reason for flagging it in the first place remains on record: \"FDA has not identified any human exposure data on drug products containing KPV administered via any route of administration... the agency lacks sufficient information to know whether the drug would cause harm when administered to humans.\"",
      },
      {
        type: "callout",
        text: "On July 23, 2026, an FDA Pharmacy Compounding Advisory Committee (PCAC) panel voted to recommend allowing compounding pharmacies to manufacture KPV, alongside BPC-157, TB-500, and MOTS-c. That vote is non-binding — FDA makes the final call, and it's unusual but not unheard of for the agency to go against a PCAC recommendation. Reporting on the panel noted that a majority of the members who voted yes have ties to the peptide industry, which is worth keeping in mind when weighing how much signal to take from the vote itself.",
      },
      {
        type: "p",
        text: "FDA's own briefing materials for that panel noted that KPV is commonly sold pre-mixed with BPC-157, TB-500, AOD-9604, and Follistatin-344 as a \"regenerative combo\" for muscle, joint, and cartilage repair — a combination-product framing that isn't itself backed by any human trial data for the blend.",
      },
      { type: "h2", text: "Where to Source KPV for Research" },
      {
        type: "p",
        text: "For legitimate research applications, purity and accurate dosing are critical. We only list vendors who provide third-party HPLC testing and batch-specific Certificates of Analysis.",
      },
      {
        type: "button",
        text: "View the KPV product page",
        productSlug: "kpv",
      },
      {
        type: "faq",
        faq: [
          {
            q: "Has KPV been tested in humans?",
            a: "Not in a completed clinical trial. The evidence base is mouse models of colitis and isolated human cell lines (intestinal epithelial cells and T cells) — real biology, but not a human trial demonstrating the peptide works as a treatment.",
          },
          {
            q: "Is KPV legal to buy?",
            a: "It's sold as a research-use-only compound, not approved by FDA for human use. A July 2026 FDA advisory panel voted to recommend allowing compounding pharmacies to manufacture it, but that vote is non-binding and FDA has not made a final decision.",
          },
        ],
      },
      { type: "h2", text: "References" },
      {
        type: "p",
        parts: [
          "1. Kannengiesser K, Maaser C, Heidemann J, et al. \"Melanocortin-derived tripeptide KPV has anti-inflammatory potential in murine models of inflammatory bowel disease.\" Inflamm Bowel Dis. 2008;14(3):324-31. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18092346/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "2. Dalmasso G, et al. \"PepT1-mediated tripeptide KPV uptake reduces intestinal inflammation.\" Gastroenterology, 2008. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/18061177/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "3. Dalmasso G, Nguyen HTT, Yan Y, et al. \"Critical role of PepT1 in promoting colitis-associated cancer and therapeutic benefits of the anti-inflammatory PepT1-mediated tripeptide KPV in a murine model.\" Cell Mol Gastroenterol Hepatol. 2016;2(3):340-357. ",
          { href: "https://pubmed.ncbi.nlm.nih.gov/27458604/", text: "pubmed.ncbi.nlm.nih.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "4. FDA. Pharmacy Compounding Advisory Committee Briefing Document — KPV (Free Base) and KPV Acetate, July 2026. ",
          { href: "https://www.fda.gov/media/193346/download", text: "fda.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "5. FDA. \"Certain Bulk Drug Substances for Use in Compounding that May Present Significant Safety Risks\" — nominated-but-withdrawn table. ",
          { href: "https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks", text: "fda.gov", external: true },
        ],
      },
      {
        type: "p",
        parts: [
          "6. Todd S, Lawrence L. \"In win for RFK Jr., FDA advisory panel narrowly votes to allow compounding of unapproved peptides.\" STAT News, July 23, 2026. ",
          { href: "https://www.statnews.com/2026/07/23/fda-panel-okays-peptides-compound-pharmacies-bpc-157-kpv/", text: "statnews.com", external: true },
        ],
      },
      {
        type: "disclaimer",
        text: "This article contains affiliate links. Aura Protocols may earn a commission if you purchase through these links at no additional cost to you. All compounds are for research use only.",
      },
    ],
  },
];
