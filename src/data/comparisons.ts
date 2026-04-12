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
  vendorACommission: string;
  vendorBCommission: string;
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
      "For US-based researchers, Core Peptides offers faster shipping, a higher affiliate commission, and stronger documentation for the most popular compounds. Swiss Chems is the better pick for international buyers or those needing SARMs alongside peptides.",
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both provide third-party HPLC testing; Core Peptides publishes batch-specific COAs more consistently" },
      { category: "Catalog Size", vendorA: 3, vendorB: 5, note: "Swiss Chems carries peptides plus SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 4, vendorB: 4, note: "Both are competitively priced; Swiss Chems edges ahead on some niche compounds" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Core Peptides ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "Core Peptides provides COAs per batch; Swiss Chems documentation varies by compound" },
      { category: "Affiliate Commission", vendorA: 5, vendorB: 3, note: "Core Peptides offers 12% flat vs Swiss Chems at 10%" },
    ],
    vendorASummary:
      "Core Peptides has emerged as one of the most trusted US-based peptide vendors, particularly for GLP-1 compounds like semaglutide and tirzepatide. Their catalog covers the highest-demand research compounds with clean documentation, fast domestic shipping, and a 12% affiliate commission.",
    vendorBSummary:
      "Swiss Chems is an internationally-focused vendor with one of the broadest catalogs in the space — covering peptides, SARMs, oral peptides, and ancillary compounds. They've built a strong international reputation with competitive pricing on niche compounds.",
    vendorAPros: [
      "Fast domestic US shipping (same-day)",
      "12% affiliate commission",
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
      "Tiered affiliate commission (up to 15%)",
    ],
    vendorBCons: [
      "Slower US domestic shipping vs Core Peptides",
      "COA detail varies by compound",
      "Lower base commission rate (10%)",
    ],
    verdict:
      "US researchers focused on GLP-1, recovery, or growth hormone compounds should go with Core Peptides — better commission, faster shipping, and cleaner documentation. If you need SARMs alongside your peptides, or you're sourcing internationally, Swiss Chems is the stronger option.",
    vendorAUrl: "https://www.corepeptides.com",
    vendorBUrl: "https://swisschems.is",
    vendorACommission: "12%",
    vendorBCommission: "10%",
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
      {
        q: "Which has better affiliate commissions?",
        a: "Core Peptides offers a flat 12% commission. Swiss Chems starts at 10% with tiered increases for higher referral volumes. For most affiliates, Core Peptides provides better baseline earnings.",
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
      "Limitless Life Nootropics earns the edge for US researchers focused on growth hormone and performance protocols, thanks to its 15% affiliate commission, specialized GH stack catalog, and fast domestic shipping.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both provide third-party HPLC testing with COAs available on request" },
      { category: "Catalog Size", vendorA: 4, vendorB: 5, note: "Swiss Chems carries peptides, SARMs, oral peptides, and ancillaries" },
      { category: "Pricing", vendorA: 3, vendorB: 4, note: "Swiss Chems is more competitive on individual compound pricing" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Limitless ships same-day domestically; Swiss Chems has longer international lead times" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs; detail is comparable across their core peptide offerings" },
      { category: "Affiliate Commission", vendorA: 5, vendorB: 3, note: "Limitless offers 15% vs Swiss Chems at 10% — a meaningful gap" },
    ],
    vendorASummary:
      "Limitless Life Nootropics (also known as Limitless Biotech) has carved out a strong niche in growth hormone secretagogues and performance peptide stacks. Their pre-blended CJC-1295/Ipamorelin combinations, 15% affiliate commission, and USA manufacturing make them a top choice for GH-focused research programs.",
    vendorBSummary:
      "Swiss Chems operates one of the broader catalogs in the research chemical market — covering peptides, SARMs, oral peptides, and ancillary compounds. Their international shipping network and competitive pricing on niche compounds give them a strong position outside the US domestic market.",
    vendorAPros: [
      "Highest affiliate commission in this comparison (15%)",
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
      "Lower affiliate commission (10%)",
      "Longer US domestic shipping times",
      "COA detail can vary by compound",
    ],
    verdict:
      "If your research content focuses on growth hormone optimization, anti-aging, or performance stacks — and you want the highest commission rate — Limitless Life Nootropics is the clear winner. For broader compound access including SARMs, or for international sourcing, Swiss Chems is the more versatile pick.",
    vendorAUrl: "https://limitlesslifenootropics.com",
    vendorBUrl: "https://swisschems.is",
    vendorACommission: "15%",
    vendorBCommission: "10%",
    faq: [
      {
        q: "Which has better affiliate commissions?",
        a: "Limitless Life Nootropics offers 15% commission vs Swiss Chems at 10%. On $5,000 in referred sales per month, that's $750 vs $500 — a $250/month difference that compounds significantly at scale.",
      },
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
      "Core Peptides and Limitless Life Nootropics both occupy the mid-tier vendor space — quality products, competitive prices, and a focus on the most popular research compounds. But there are key differences in catalog, commission structure, and specialization that matter depending on your research focus.",
    winner: "B",
    winnerReason:
      "Limitless Life Nootropics edges ahead on affiliate commission rates (15%) and specialization in GH secretagogue stacks like CJC-1295/Ipamorelin, making it the stronger choice for affiliates focusing on the performance and anti-aging research market.",
    scores: [
      { category: "Purity & Testing", vendorA: 4, vendorB: 4, note: "Both offer third-party HPLC testing with COAs available" },
      { category: "Catalog Size", vendorA: 3, vendorB: 4, note: "Limitless carries more stack combinations and nootropic compounds" },
      { category: "Pricing", vendorA: 4, vendorB: 3, note: "Core Peptides has slight pricing edge on individual compounds" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 4, note: "Both ship within 1–3 business days domestically" },
      { category: "COA Accessibility", vendorA: 4, vendorB: 4, note: "Both provide COAs on request with comparable detail" },
      { category: "Affiliate Commission", vendorA: 5, vendorB: 5, note: "LLN offers 15% vs Core Peptides 12% — both among the highest available" },
    ],
    vendorASummary:
      "Core Peptides has built strong credibility in the GLP-1 research space, particularly for semaglutide and related compounds. Clean website, competitive pricing, and a 12% affiliate commission make it a reliable partner for weight management-focused content.",
    vendorBSummary:
      "Limitless Life Nootropics specializes in GH secretagogues, nootropics, and performance-focused peptide stacks. Their 15% commission rate is among the highest in the space, and their catalog of combo products (like CJC-1295/Ipamorelin blends) is difficult to match.",
    vendorAPros: [
      "12% affiliate commission",
      "Strong reputation for GLP-1 compounds",
      "Competitive per-mg pricing",
      "Clean and easy checkout experience",
    ],
    vendorACons: [
      "Smaller catalog vs Limitless",
      "Less specialization in GH secretagogues",
    ],
    vendorBPros: [
      "15% affiliate commission — highest in this comparison",
      "Best-in-class GH secretagogue stacks",
      "Broader nootropic and performance catalog",
      "Pre-blended stacks save reconstitution complexity",
    ],
    vendorBCons: [
      "Slightly higher pricing on individual compounds",
      "Less established for GLP-1 compounds vs Core Peptides",
    ],
    verdict:
      "For affiliates building content around weight loss and GLP-1 research, Core Peptides is the go-to. For growth hormone, anti-aging, and performance-focused content — especially if you're promoting CJC-1295/Ipamorelin stacks — Limitless Life Nootropics offers better commission rates and more relevant inventory.",
    vendorAUrl: "https://corepeptides.com",
    vendorBUrl: "https://limitlesslifenootropics.com",
    vendorACommission: "12%",
    vendorBCommission: "15%",
    faq: [
      {
        q: "Which has better affiliate commissions?",
        a: "Limitless Life Nootropics offers 15% commission vs Core Peptides at 12%. At scale, that 3% difference is significant — on $10,000 in referred sales, that's $300 more per month.",
      },
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
];
