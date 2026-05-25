export type VendorScore = {
  category: string;
  vendorA: number; // 1–5
  vendorB: number; // 1–5
  note: string;
};

export type Comparison = {
  slug: string;
  vendorA: string;
  vendorB: string;
  headline: string;
  intro: string;
  winner: "A" | "B" | "tie";
  winnerReason: string;
  scores: VendorScore[];
  vendorASummary: string;
  vendorBSummary: string;
  vendorAPros: string[];
  vendorACons: string[];
  vendorBPros: string[];
  vendorBCons: string[];
  verdict: string;
  vendorAUrl: string;
  vendorBUrl: string;
  faq: { q: string; a: string }[];
};

export const comparisons: Comparison[] = [
  {
    slug: "core-peptides-vs-swiss-chems",
    vendorA: "Core Peptides",
    vendorB: "Swiss Chems",
    headline: "Core Peptides vs Swiss Chems (2026): Best Research Peptide Vendor?",
    intro:
      "Core Peptides and Swiss Chems are two of the most active vendors in the current research peptide market. Core Peptides dominates the US domestic space with a focus on GLP-1 compounds, while Swiss Chems brings a broader international catalog that extends into SARMs and ancillary compounds. Here's a full breakdown to help you decide.",
    winner: "A",
    winnerReason:
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both provide third-party HPLC testing; Core Peptides publishes batch-specific COAs more consistently" },
      { category: "Catalog Size", vendorA: 3, vendorB: 5, note: "Swiss Chems carries peptides plus SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Both are competitively priced; Swiss Chems edges ahead on some niche compounds" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Core Peptides ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "Core Peptides provides COAs per batch; Swiss Chems documentation varies by compound" },
    ],
    vendorASummary:
    vendorBSummary:
      "Swiss Chems is an internationally-focused vendor with one of the broadest catalogs in the space — covering peptides, SARMs, oral peptides, and ancillary compounds. They've built a strong international reputation with competitive pricing on niche compounds.",
    vendorAPros: [
      "Fast domestic US shipping (same-day)",
      "Batch-specific COAs published consistently",
      "Best-in-class GLP-1 compound selection",
      "Clean, easy checkout experience",
    ],
    vendorACons: [
      "Smaller catalog — focused on popular compounds only",
      "Limited international shipping",
      "No SARMs or ancillary compounds",
    ],
    vendorBPros: [
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "Competitive pricing on niche peptides",
    ],
    vendorBCons: [
      "Slower US domestic shipping vs Core Peptides",
      "COA detail varies by compound",
    ],
    verdict:
    vendorAUrl: "https://www.corepeptides.com",
    vendorBUrl: "https://swisschems.is",
    faq: [
      {
        q: "Which vendor has better purity testing?",
        a: "Both Core Peptides and Swiss Chems provide third-party HPLC testing. Core Peptides publishes batch-specific COAs more consistently across their catalog, giving them a slight edge for documentation-heavy research protocols.",
      },
      {
        q: "Which is better for semaglutide?",
        a: "Core Peptides is the stronger choice for semaglutide and other GLP-1 compounds. They've built their reputation primarily around this category and offer competitive pricing with solid documentation.",
      },
      {
        q: "Does Swiss Chems carry SARMs?",
        a: "Yes — Swiss Chems carries a broad range of SARMs alongside their peptide catalog. Core Peptides focuses exclusively on peptides and does not carry SARMs.",
      },
    ],
  },
  {
    slug: "limitless-life-nootropics-vs-swiss-chems",
    vendorA: "Limitless Life Nootropics",
    vendorB: "Swiss Chems",
    headline: "Limitless Life Nootropics vs Swiss Chems (2026): Which Vendor Wins?",
    intro:
      "Limitless Life Nootropics and Swiss Chems both serve the research peptide market with strong catalogs and tested compounds — but they target different research needs. Limitless dominates the GH secretagogue and performance stack category, while Swiss Chems offers a broader international catalog with SARMs and ancillaries. Here's how they compare.",
    winner: "A",
    winnerReason:
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party HPLC testing with COAs available on request" },
      { category: "Catalog Size", vendorA: 4, vendorB: 5, note: "Swiss Chems carries peptides, SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 3, vendorB: 4, note: "Swiss Chems is more competitive on individual compound pricing" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Limitless ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs; detail is comparable across their core peptide offerings" },
    ],
    vendorASummary:
    vendorBSummary:
      "Swiss Chems operates one of the broader catalogs in the research chemical market — covering peptides, SARMs, oral peptides, and ancillary compounds. Their international shipping network and competitive pricing on niche compounds give them a strong position outside the US domestic market.",
    vendorAPros: [
      "Best-in-class GH secretagogue stacks (CJC-1295/Ipamorelin blends)",
      "USA-manufactured, same-day domestic shipping",
      "Pre-blended stacks simplify research protocols",
      "99% purity standard with batch COAs",
    ],
    vendorACons: [
      "Higher pricing per mg on individual compounds",
      "Narrower catalog vs Swiss Chems",
      "Less established for non-GH peptides",
    ],
    vendorBPros: [
      "Broadest catalog including SARMs and ancillaries",
      "Competitive pricing on individual peptides",
      "Strong international shipping network",
      "Good option for PT-141 and niche compounds",
    ],
    vendorBCons: [
      "Longer US domestic shipping times",
      "COA detail can vary by compound",
    ],
    verdict:
    vendorAUrl: "https://limitlesslifenootropics.com",
    vendorBUrl: "https://swisschems.is",
    faq: [
      {
        q: "Which is better for CJC-1295/Ipamorelin?",
        a: "Limitless Life Nootropics is the stronger choice. They specialize in GH secretagogue stacks and carry pre-blended CJC-1295/Ipamorelin combinations that are difficult to source elsewhere at comparable quality.",
      },
      {
        q: "Does Swiss Chems carry SARMs?",
        a: "Yes. Swiss Chems carries a broad range of SARMs alongside their peptide catalog. Limitless Life Nootropics focuses on peptides and does not carry SARMs.",
      },
      {
        q: "Which is better for PT-141?",
        a: "Swiss Chems is a strong source for PT-141 (Bremelanotide) with competitive pricing and consistent availability. Both vendors carry it, but Swiss Chems tends to price it more aggressively.",
      },
      {
        q: "Is Limitless Life Nootropics legit?",
        a: "Yes. Limitless Life Nootropics (Limitless Biotech) is a USA-based manufacturer with an established reputation in the GH secretagogue space. They provide batch-specific COAs and ship domestically with fast turnaround.",
      },
    ],
  },
  {
    slug: "core-peptides-vs-limitless-life-nootropics",
    vendorA: "Core Peptides",
    vendorB: "Limitless Life Nootropics",
    headline: "Core Peptides vs Limitless Life Nootropics (2026): Which Delivers More?",
    intro:
    winner: "B",
    winnerReason:
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both offer third-party HPLC testing with COAs available" },
      { category: "Catalog Size", vendorA: 3, vendorB: 4, note: "Limitless carries more stack combinations and nootropic compounds" },
      { category: "Pricing", vendorA: 4, vendorB: 3, note: "Core Peptides has slight pricing edge on individual compounds" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 4, note: "Both ship within 1–3 business days domestically" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs on request with comparable detail" },
    ],
    vendorASummary:
    vendorBSummary:
    vendorAPros: [
      "Strong reputation for GLP-1 compounds",
      "Competitive per-mg pricing",
      "Clean and easy checkout experience",
    ],
    vendorACons: [
      "Smaller catalog vs Limitless",
      "Less specialization in GH secretagogues",
    ],
    vendorBPros: [
      "Best-in-class GH secretagogue stacks",
      "Broader nootropic and performance catalog",
      "Pre-blended stacks save reconstitution complexity",
    ],
    vendorBCons: [
      "Slightly higher pricing on individual compounds",
      "Less established for GLP-1 compounds vs Core Peptides",
    ],
    verdict:
    vendorAUrl: "https://corepeptides.com",
    vendorBUrl: "https://limitlesslifenootropics.com",
    faq: [
      {
        q: "Which is better for CJC-1295 / Ipamorelin?",
        a: "Limitless Life Nootropics is the stronger choice for GH secretagogue stacks. They carry pre-blended CJC-1295/Ipamorelin combinations with competitive pricing and solid documentation.",
      },
      {
        q: "Which is better for semaglutide?",
        a: "Core Peptides is the more established source for semaglutide and GLP-1 compounds in this comparison.",
      },
    ],
  },
  {
    slug: "glp1-research-lab-vs-core-peptides",
    vendorA: "GLP-1 Research Lab",
    vendorB: "Core Peptides",
    headline: "GLP-1 Research Lab vs Core Peptides (2026): Best for GLP-1 Research?",
    intro:
    winner: "A",
    winnerReason:
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both provide third-party testing; GLP-1 Research Lab is USA-sourced with consistent COA publishing" },
      { category: "Catalog Size", vendorA: 2, vendorB: 4, note: "GLP-1 Research Lab focuses exclusively on GLP-1 compounds; Core Peptides has a broader peptide catalog" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Competitive pricing across both vendors for GLP-1 compounds" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 5, note: "Core Peptides has a slight edge with same-day domestic shipping" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "GLP-1 Research Lab publishes COAs consistently for all compounds" },
    ],
    vendorASummary:
    vendorBSummary:
    vendorAPros: [
      "90-day cookie window",
      "USA-sourced with third-party testing",
      "Specialized GLP-1/tirzepatide catalog",
    ],
    vendorACons: [
      "Narrow catalog — GLP-1 compounds only",
      "Not a fit for recovery or performance peptide research",
    ],
    vendorBPros: [
      "Broad peptide catalog for multi-compound research",
      "Same-day domestic US shipping",
      "Batch-specific COAs published consistently",
    ],
    vendorBCons: [
      "Semaglutide delisted as of April 2026",
    ],
    verdict:
    vendorAUrl: "https://glp1researchlab.com?raf=ref6072993",
    vendorBUrl: "https://www.corepeptides.com",
    faq: [
      {
        q: "Does Core Peptides still carry semaglutide?",
        a: "No. Core Peptides delisted semaglutide as of April 2026. GLP-1 Research Lab is the recommended source for semaglutide and tirzepatide research.",
      },
      {
        q: "Which is better for BPC-157 and recovery peptides?",
        a: "Core Peptides is the stronger choice for recovery peptides like BPC-157 and TB-500. GLP-1 Research Lab focuses exclusively on GLP-1 compounds.",
      },
    ],
  },
  {
    slug: "ignite-peptides-vs-core-peptides",
    vendorA: "Ignite Peptides",
    vendorB: "Core Peptides",
    headline: "Ignite Peptides vs Core Peptides (2026): Which US Vendor Wins?",
    intro:
      "Ignite Peptides and Core Peptides are two of the most competitive US-based research peptide vendors, both offering high-purity compounds with fast domestic shipping. Ignite brings a strong breadth of catalog including GH secretagogues and GLP-1 compounds, while Core Peptides has built its reputation on documentation quality and reliability. Here's the full breakdown.",
    winner: "tie",
    winnerReason:
      "Both vendors are strong US-based options. Ignite Peptides stands out for catalog breadth and GLP-1/GH secretagogue availability, while Core Peptides leads on documentation consistency and established reputation. The right choice depends on your research focus.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party HPLC testing with COAs available" },
      { category: "Catalog Size", vendorA: 5, vendorB: 3, note: "Ignite carries BPC-157, TB-500, Sermorelin, CJC-1295, Ipamorelin, and GLP-1 compounds" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Competitive pricing on both sides; Ignite edges ahead on GLP-1 pricing" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 5, note: "Both ship domestically; Core Peptides offers same-day shipping" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 5, note: "Core Peptides publishes batch-specific COAs more consistently across their catalog" },
    ],
    vendorASummary:
      "Ignite Peptides is a Minnesota-based research peptide vendor (est. 2022) with one of the broadest catalogs in the domestic space — covering BPC-157, TB-500, Sermorelin, CJC-1295 No DAC, Ipamorelin, and GLP-1 compounds. Their dosage calculator and clean UX make them a standout for newer researchers.",
    vendorBSummary:
    vendorAPros: [
      "Broad catalog including GLP-1 and GH secretagogues",
      "US-based (Minnesota) — fast domestic shipping",
      "Built-in dosage calculator",
      "Established since 2022 with growing reputation",
      "Competitive GLP-1 pricing",
    ],
    vendorACons: [
      "Newer vendor vs Core Peptides' longer track record",
      "PT-141 not currently listed",
    ],
    vendorBPros: [
      "Batch-specific COAs published consistently",
      "Same-day domestic shipping",
      "Established reputation in the space",
    ],
    vendorBCons: [
      "Semaglutide delisted as of April 2026",
      "Narrower catalog vs Ignite",
    ],
    verdict:
    vendorAUrl: "https://ignitepeptides.com",
    vendorBUrl: "https://www.corepeptides.com",
    faq: [
      {
        q: "Is Ignite Peptides legit?",
        a: "Yes. Ignite Peptides is a Minnesota-based vendor established in 2022 with third-party tested compounds and a growing reputation in the US research peptide market.",
      },
      {
        q: "Which carries more compounds?",
        a: "Ignite Peptides has a broader catalog, carrying BPC-157, TB-500, Sermorelin, CJC-1295 No DAC, Ipamorelin, and GLP-1 compounds. Core Peptides focuses on a tighter selection of high-demand compounds.",
      },
      {
        q: "Which is better for semaglutide?",
        a: "Ignite Peptides carries GLP-1 (semaglutide) at competitive pricing. Core Peptides delisted semaglutide in April 2026.",
      },
    ],
  },
  {
    slug: "behemoth-labz-vs-swiss-chems",
    vendorA: "Behemoth Labz",
    vendorB: "Swiss Chems",
    headline: "Behemoth Labz vs Swiss Chems (2026): Best for Broad-Catalog Peptide Research?",
    intro:
      "Behemoth Labz and Swiss Chems both offer broader-than-average research peptide catalogs, and both carry compounds beyond the standard BPC-157/TB-500/Sermorelin stack. Behemoth specializes in nasal spray delivery formats, while Swiss Chems brings SARMs and international reach alongside their peptide catalog. Here's how they compare.",
    winner: "B",
    winnerReason:
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party testing; COA accessibility is comparable" },
      { category: "Catalog Size", vendorA: 4, vendorB: 5, note: "Swiss Chems carries peptides, SARMs, and ancillaries; Behemoth specializes in nasal spray formats" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Both competitive; Behemoth has edge on nasal spray formats" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 3, note: "Behemoth ships domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs with comparable detail across their core compounds" },
    ],
    vendorASummary:
      "Behemoth Labz has carved a niche in nasal spray delivery formats for research peptides — including BPC-157, TB-500 combo, Ipamorelin, and PT-141. Their tiered affiliate program (7–20%) rewards active content creators, making them a strong partner for affiliates who produce consistent output.",
    vendorBSummary:
    vendorAPros: [
      "Nasal spray formats — unique delivery option",
      "BPC-157 + TB-500 combo nasal spray",
      "PT-141 available in both nasal spray and vial",
      "Domestic US shipping",
    ],
    vendorACons: [
      "No Sermorelin, CJC-1295, or semaglutide",
      "Smaller catalog focused on spray formats",
    ],
    vendorBPros: [
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "10% discount code for your audience",
    ],
    vendorBCons: [
      "Slower US domestic shipping vs Behemoth",
      "No nasal spray delivery formats",
    ],
    verdict:
    vendorAUrl: "https://behemothlabz.com",
    vendorBUrl: "https://swisschems.is",
    faq: [
      {
        q: "What makes Behemoth Labz different from other vendors?",
        a: "Behemoth Labz specializes in nasal spray delivery formats for research peptides — a format that most US vendors don't carry. This includes BPC-157 nasal spray, a BPC-157/TB-500 combo spray, Ipamorelin, and PT-141.",
      },
      {
        q: "Does Swiss Chems carry nasal spray peptides?",
        a: "No. Swiss Chems focuses on standard vial/powder formats. If nasal spray delivery is your research focus, Behemoth Labz is the better source.",
      },
      {
        q: "Which is better for PT-141?",
        a: "Both carry PT-141. Swiss Chems offers competitive pricing in standard vial format; Behemoth Labz is unique in offering PT-141 as a nasal spray alongside the traditional vial option.",
      },
    ],
  },
];
