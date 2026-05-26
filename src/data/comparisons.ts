export type VendorScore = {
  category: string;
  vendorA: number;
  vendorB: number;
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
      "Core Peptides and Swiss Chems are two of the most active vendors in the current research peptide market. Core Peptides dominates the US domestic space with fast shipping and clean documentation, while Swiss Chems brings a broader international catalog that extends into SARMs and ancillary compounds. Here's a full breakdown to help you decide.",
    winner: "A",
    winnerReason:
      "For US-based researchers, Core Peptides offers faster shipping and stronger documentation for the most popular compounds. Swiss Chems is the better pick for international buyers or those needing SARMs alongside peptides.",
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both provide third-party HPLC testing; Core Peptides publishes batch-specific COAs more consistently" },
      { category: "Catalog Size", vendorA: 3, vendorB: 5, note: "Swiss Chems carries peptides plus SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Both are competitively priced; Swiss Chems edges ahead on some niche compounds" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Core Peptides ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "Core Peptides provides COAs per batch; Swiss Chems documentation varies by compound" },
    ],
    vendorASummary:
      "Core Peptides has emerged as one of the most trusted US-based peptide vendors, particularly for recovery and performance compounds. Their catalog covers the highest-demand research compounds with clean documentation, fast domestic shipping, and a straightforward checkout experience.",
    vendorBSummary:
      "Swiss Chems is an internationally-focused vendor with one of the broadest catalogs in the space — covering peptides, SARMs, oral peptides, and ancillary compounds. They've built a strong reputation with competitive pricing on niche compounds.",
    vendorAPros: [
      "Fast domestic US shipping (same-day)",
      "Batch-specific COAs published consistently",
      "Best-in-class selection for popular research compounds",
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
      "10% discount code available for your audience",
    ],
    vendorBCons: [
      "Slower US domestic shipping vs Core Peptides",
      "COA detail varies by compound",
    ],
    verdict:
      "US researchers focused on recovery or growth hormone compounds should go with Core Peptides — faster shipping and cleaner documentation. If you need SARMs alongside your peptides, or you're sourcing internationally, Swiss Chems is the stronger option.",
    vendorAUrl: "https://www.corepeptides.com",
    vendorBUrl: "https://swisschems.is/ref/6782/",
    faq: [
      {
        q: "Which vendor has better purity testing?",
        a: "Both Core Peptides and Swiss Chems provide third-party HPLC testing. Core Peptides publishes batch-specific COAs more consistently across their catalog, giving them a slight edge for documentation-heavy research protocols.",
      },
      {
        q: "Which is better for semaglutide?",
        a: "Neither currently — Core Peptides delisted semaglutide in April 2026 and Swiss Chems received an FDA enforcement letter regarding GLP-1 compounds in 2025. We recommend GLP-1 Research Lab for semaglutide.",
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
      "Limitless Life Nootropics and Swiss Chems both serve the research peptide market with strong catalogs and tested compounds — but they target different research needs. Limitless dominates the GH secretagogue and performance stack category, while Swiss Chems offers a broader international catalog with SARMs and ancillaries.",
    winner: "A",
    winnerReason:
      "Limitless Life Nootropics earns the edge for US researchers focused on growth hormone and performance protocols, thanks to its specialized GH stack catalog, pre-blended combinations, and fast domestic shipping.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party HPLC testing with COAs available on request" },
      { category: "Catalog Size", vendorA: 4, vendorB: 5, note: "Swiss Chems carries peptides, SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 3, vendorB: 4, note: "Swiss Chems is more competitive on individual compound pricing" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Limitless ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs; detail is comparable across their core peptide offerings" },
    ],
    vendorASummary:
      "Limitless Life Nootropics (also known as Limitless Biotech) has carved out a strong niche in growth hormone secretagogues and performance peptide stacks. Their pre-blended CJC-1295/Ipamorelin combinations and USA manufacturing make them a top choice for GH-focused research programs.",
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
      "If your research focuses on growth hormone optimization, anti-aging, or performance stacks, Limitless Biotech is the stronger catalog pick. For broader compound access including SARMs and ancillaries, Swiss Chems wins.",
    vendorAUrl: "https://limitlesslifenootropics.com",
    vendorBUrl: "https://swisschems.is/ref/6782/",
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
        a: "Swiss Chems is a strong source for PT-141 with competitive pricing and consistent availability.",
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
      "Core Peptides and Limitless Life Nootropics both occupy the mid-tier vendor space — quality products, competitive prices, and a focus on the most popular research compounds. But there are key differences in catalog and specialization that matter depending on your research focus.",
    winner: "B",
    winnerReason:
      "Limitless Life Nootropics edges ahead on specialization in GH secretagogue stacks like CJC-1295/Ipamorelin, making it the stronger choice for performance and anti-aging research.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both offer third-party HPLC testing with COAs available" },
      { category: "Catalog Size", vendorA: 3, vendorB: 4, note: "Limitless carries more stack combinations and nootropic compounds" },
      { category: "Pricing", vendorA: 4, vendorB: 3, note: "Core Peptides has slight pricing edge on individual compounds" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 4, note: "Both ship within 1–3 business days domestically" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs on request with comparable detail" },
    ],
    vendorASummary:
      "Core Peptides has built strong credibility in the research peptide space, particularly for recovery compounds. Clean website, competitive pricing, and strong documentation make it a reliable partner for weight management and recovery-focused research.",
    vendorBSummary:
      "Limitless Life Nootropics specializes in GH secretagogues, nootropics, and performance-focused peptide stacks. Their catalog of combo products (like CJC-1295/Ipamorelin blends) is difficult to match elsewhere.",
    vendorAPros: [
      "Strong reputation for recovery and performance compounds",
      "Competitive per-mg pricing",
      "Clean and easy checkout experience",
      "Batch-specific COAs",
    ],
    vendorACons: [
      "Smaller catalog vs Limitless",
      "Less specialization in GH secretagogues",
      "Semaglutide delisted April 2026",
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
      "For recovery and weight management research, Core Peptides is the go-to. For growth hormone, anti-aging, and performance-focused research — especially CJC-1295/Ipamorelin stacks — Limitless Life Nootropics offers more relevant inventory.",
    vendorAUrl: "https://corepeptides.com",
    vendorBUrl: "https://limitlesslifenootropics.com",
    faq: [
      {
        q: "Which is better for CJC-1295 / Ipamorelin?",
        a: "Limitless Life Nootropics is the stronger choice for GH secretagogue stacks. They carry pre-blended CJC-1295/Ipamorelin combinations with competitive pricing and solid documentation.",
      },
      {
        q: "Which is better for semaglutide?",
        a: "Neither currently. Core Peptides delisted semaglutide in April 2026. We recommend GLP-1 Research Lab for semaglutide research.",
      },
      {
        q: "Which has better pricing?",
        a: "Core Peptides has a slight edge on per-mg pricing for individual compounds. Limitless Life Nootropics is more competitive on pre-blended stack products.",
      },
    ],
  },
  {
    slug: "glp1-research-lab-vs-core-peptides",
    vendorA: "GLP-1 Research Lab",
    vendorB: "Core Peptides",
    headline: "GLP-1 Research Lab vs Core Peptides (2026): Best for GLP-1 Research?",
    intro:
      "GLP-1 Research Lab and Core Peptides both serve the research peptide market but from different angles. GLP-1 Research Lab is specialized exclusively in semaglutide and tirzepatide with a 90-day cookie window, while Core Peptides offers a broader peptide catalog with strong domestic shipping across recovery and performance compounds.",
    winner: "A",
    winnerReason:
      "For researchers focused on GLP-1 compounds, GLP-1 Research Lab wins on catalog specialization, USA sourcing, and a 90-day cookie window. Core Peptides is the stronger pick if you need GLP-1 compounds alongside recovery and performance peptides.",
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both provide third-party testing; GLP-1 Research Lab is USA-sourced with consistent COA publishing" },
      { category: "Catalog Size", vendorA: 2, vendorB: 4, note: "GLP-1 Research Lab focuses exclusively on GLP-1 compounds; Core Peptides has a broader catalog" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Competitive pricing across both vendors for available compounds" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 5, note: "Core Peptides has a slight edge with same-day domestic shipping" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "GLP-1 Research Lab publishes COAs consistently for all compounds" },
    ],
    vendorASummary:
      "GLP-1 Research Lab is a USA-sourced, third-party tested vendor specializing in GLP-1 receptor agonists including semaglutide and tirzepatide. Their 90-day cookie window and focused catalog make them the go-to source for GLP-1 research.",
    vendorBSummary:
      "Core Peptides is a well-established US-based vendor with a broad peptide catalog spanning recovery, growth hormone, and wellness compounds. Their same-day domestic shipping and batch-specific COAs make them a reliable partner for multi-compound research programs.",
    vendorAPros: [
      "USA-sourced with third-party testing",
      "Specialized GLP-1/tirzepatide catalog",
      "90-day cookie window",
      "Consistent COA publishing across all compounds",
    ],
    vendorACons: [
      "Narrow catalog — GLP-1 compounds only",
      "Not a fit for recovery or performance peptide research",
    ],
    vendorBPros: [
      "Broad peptide catalog for multi-compound research",
      "Same-day domestic US shipping",
      "Batch-specific COAs published consistently",
      "Established reputation",
    ],
    vendorBCons: [
      "Semaglutide delisted as of April 2026",
      "Not specialized for GLP-1 research",
    ],
    verdict:
      "If your research focuses on GLP-1 compounds, weight management, or metabolic health, GLP-1 Research Lab is the stronger pick — specialized catalog and a 90-day cookie. For researchers who need GLP-1 compounds alongside recovery or performance peptides in one order, Core Peptides is the more versatile option.",
    vendorAUrl: "https://glp1researchlab.com/?aff=84",
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
      {
        q: "Is GLP-1 Research Lab third-party tested?",
        a: "Yes. GLP-1 Research Lab is USA-sourced and publishes third-party COAs consistently across their catalog.",
      },
    ],
  },
  {
    slug: "ignite-peptides-vs-core-peptides",
    vendorA: "Ignite Peptides",
    vendorB: "Core Peptides",
    headline: "Ignite Peptides vs Core Peptides (2026): Which US Vendor Wins?",
    intro:
      "Ignite Peptides and Core Peptides are two competitive US-based research peptide vendors, both offering high-purity compounds with fast domestic shipping. Ignite brings a broader catalog including GH secretagogues and GLP-1 compounds, while Core Peptides has built its reputation on documentation quality and reliability.",
    winner: "tie",
    winnerReason:
      "Both are strong US-based options. Ignite Peptides stands out for catalog breadth and GLP-1 availability; Core Peptides leads on documentation consistency and established reputation.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party HPLC testing with COAs available" },
      { category: "Catalog Size", vendorA: 5, vendorB: 3, note: "Ignite carries BPC-157, TB-500, Sermorelin, CJC-1295, Ipamorelin, and GLP-1 compounds" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Competitive pricing on both sides; Ignite edges ahead on GLP-1 pricing" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 5, note: "Both ship domestically; Core Peptides offers same-day shipping" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 5, note: "Core Peptides publishes batch-specific COAs more consistently across their catalog" },
    ],
    vendorASummary:
      "Ignite Peptides is a Minnesota-based research peptide vendor (est. 2022) with one of the broadest domestic catalogs — covering BPC-157, TB-500, Sermorelin, CJC-1295 No DAC, Ipamorelin, and GLP-1 compounds. Their built-in dosage calculator and clean UX make them a standout for researchers.",
    vendorBSummary:
      "Core Peptides has earned a strong reputation for documentation quality and domestic shipping reliability. Their batch-specific COAs and straightforward checkout make them a consistent partner, particularly for recovery and performance peptide research.",
    vendorAPros: [
      "Broad catalog including GLP-1 and GH secretagogues",
      "US-based (Minnesota) — fast domestic shipping",
      "Built-in dosage calculator",
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
      "Both are solid US-based options. Choose Ignite Peptides if you need GLP-1 compounds alongside GH secretagogues and want a one-stop domestic source. Choose Core Peptides if documentation consistency and an established track record are your priorities.",
    vendorAUrl: "https://ignitepeptides.com",
    vendorBUrl: "https://www.corepeptides.com",
    faq: [
      {
        q: "Is Ignite Peptides legit?",
        a: "Yes. Ignite Peptides is a Minnesota-based vendor established in 2022 with third-party tested compounds and a growing reputation in the US research peptide market.",
      },
      {
        q: "Which carries more compounds?",
        a: "Ignite Peptides has a broader catalog, carrying BPC-157, TB-500, Sermorelin, CJC-1295 No DAC, Ipamorelin, and GLP-1 compounds. Core Peptides focuses on a tighter selection.",
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
      "Behemoth Labz and Swiss Chems both offer broader-than-average research peptide catalogs. Behemoth specializes in nasal spray delivery formats, while Swiss Chems brings SARMs and international reach alongside their peptide catalog.",
    winner: "B",
    winnerReason:
      "Swiss Chems edges ahead on catalog breadth including SARMs and international availability. Behemoth Labz is the stronger pick for researchers specifically interested in nasal spray delivery formats.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party testing; COA accessibility is comparable" },
      { category: "Catalog Size", vendorA: 4, vendorB: 5, note: "Swiss Chems carries peptides, SARMs, and ancillaries; Behemoth specializes in nasal spray formats" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Both competitive; Behemoth has edge on nasal spray formats" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 3, note: "Behemoth ships domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs with comparable detail across their core compounds" },
    ],
    vendorASummary:
      "Behemoth Labz has carved a niche in nasal spray delivery formats for research peptides — including BPC-157, TB-500 combo, Ipamorelin, and PT-141. Their unique delivery formats make them a standout for researchers exploring non-injection protocols.",
    vendorBSummary:
      "Swiss Chems operates one of the broadest catalogs in the research chemical space — peptides, SARMs, oral peptides, and ancillary compounds — with a strong international shipping network.",
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
      "10% discount code available for your audience",
    ],
    vendorBCons: [
      "Slower US domestic shipping vs Behemoth",
      "No nasal spray delivery formats",
    ],
    verdict:
      "For researchers specifically interested in nasal spray peptide delivery or PT-141, Behemoth Labz is a unique and valuable source. For catalog breadth — especially if your research spans SARMs and ancillaries — Swiss Chems is the stronger option.",
    vendorAUrl: "https://behemothlabz.com",
    vendorBUrl: "https://swisschems.is/ref/6782/",
    faq: [
      {
        q: "What makes Behemoth Labz different from other vendors?",
        a: "Behemoth Labz specializes in nasal spray delivery formats — including BPC-157, a BPC-157/TB-500 combo spray, Ipamorelin, and PT-141. Most US vendors don't carry nasal spray formats.",
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
