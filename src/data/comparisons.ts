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
    slug: "peptide-sciences-vs-core-peptides",
    vendorA: "Peptide Sciences",
    vendorB: "Core Peptides",
    headline: "Peptide Sciences vs Core Peptides (2026): Which Is Worth Your Research Budget?",
    intro:
      "Peptide Sciences and Core Peptides are two of the most referenced vendors in the research peptide community. Both offer third-party tested compounds, but they differ meaningfully in catalog depth, pricing, commission structure, and customer experience. We broke down both in detail so you don't have to.",
    winner: "A",
    winnerReason:
      "Peptide Sciences edges out Core Peptides on catalog breadth and COA transparency, making it the stronger choice for multi-compound research programs.",
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both offer HPLC testing; Peptide Sciences provides more detailed batch documentation" },
      { category: "Catalog Size", vendorA: 5, vendorB: 3, note: "Peptide Sciences carries 100+ compounds vs Core Peptides' focused lineup" },
      { category: "Pricing", vendorA: 3, vendorB: 4, note: "Core Peptides is generally 10–15% less expensive per mg" },
      { category: "Shipping Speed", vendorA: 4, vendorB: 4, note: "Both ship within 1–3 business days domestically" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "Peptide Sciences publishes COAs publicly per batch; Core Peptides available on request" },
      { category: "Affiliate Commission", vendorA: 3, vendorB: 5, note: "Core Peptides offers 12% vs Peptide Sciences at 10%" },
    ],
    vendorASummary:
      "Peptide Sciences has been operating since 2012 and is widely considered the gold standard for research peptide sourcing in North America. Their catalog spans over 100 compounds with publicly posted, batch-specific COAs from accredited third-party labs.",
    vendorBSummary:
      "Core Peptides is a newer entrant that has quickly built a strong reputation for consistent quality and competitive pricing. Their catalog is more focused — covering the most popular research compounds — but what they carry is well-documented and competitively priced.",
    vendorAPros: [
      "Largest catalog in the industry (100+ compounds)",
      "Publicly posted batch-specific COAs",
      "HPLC + MS verification standard",
      "Long track record since 2012",
      "Fast domestic shipping",
    ],
    vendorACons: [
      "Higher price per mg vs competitors",
      "Lower affiliate commission (10%)",
      "Website UX is dated",
    ],
    vendorBPros: [
      "12% affiliate commission — highest in this comparison",
      "10–15% lower price points",
      "Clean, easy-to-navigate site",
      "Strong reputation for GLP-1 compounds (semaglutide)",
    ],
    vendorBCons: [
      "Smaller catalog — may not carry niche compounds",
      "COAs available on request, not always public",
      "Less established track record",
    ],
    verdict:
      "For researchers needing broad catalog access and maximum documentation transparency, Peptide Sciences is the stronger pick. For buyers focused on GLP-1 peptides (semaglutide, tirzepatide) at lower price points — and affiliates who want higher commissions — Core Peptides is hard to beat.",
    vendorAUrl: "https://www.peptidesciences.com",
    vendorBUrl: "https://corepeptides.com",
    vendorACommission: "10%",
    vendorBCommission: "12%",
    faq: [
      {
        q: "Which vendor has better purity testing?",
        a: "Both vendors provide HPLC testing. Peptide Sciences publishes batch-specific COAs publicly, while Core Peptides provides them on request. For documentation-heavy research protocols, Peptide Sciences has the edge.",
      },
      {
        q: "Which is cheaper — Peptide Sciences or Core Peptides?",
        a: "Core Peptides is generally 10–15% less expensive per milligram across comparable compounds. For high-volume research orders, this difference is meaningful.",
      },
      {
        q: "Which vendor is better for semaglutide?",
        a: "Core Peptides has built a strong reputation specifically for GLP-1 compounds including semaglutide. Their pricing and documentation for this compound are competitive.",
      },
      {
        q: "Which has better affiliate commissions?",
        a: "Core Peptides offers 12% commission vs Peptide Sciences at 10%. On a $200 order that's $24 vs $20 — a meaningful difference at scale.",
      },
    ],
  },
  {
    slug: "peptide-sciences-vs-swiss-chems",
    vendorA: "Peptide Sciences",
    vendorB: "Swiss Chems",
    headline: "Peptide Sciences vs Swiss Chems (2026): Best for Research Peptides?",
    intro:
      "Peptide Sciences dominates the domestic US market while Swiss Chems has carved out a strong international reputation. The two vendors serve overlapping but distinct audiences. Here's a full breakdown to help you choose the right source for your research.",
    winner: "A",
    winnerReason:
      "For US-based researchers, Peptide Sciences offers faster shipping, more transparent domestic documentation, and a broader catalog. Swiss Chems is the better option for international researchers or those specifically sourcing SARMs and niche compounds.",
    scores: [
      { category: "Purity & Testing", vendorA: 5, vendorB: 4, note: "Both third-party tested; Peptide Sciences has more detailed public documentation" },
      { category: "Catalog Size", vendorA: 5, vendorB: 4, note: "Swiss Chems covers peptides plus SARMs and ancillaries" },
      { category: "Pricing", vendorA: 3, vendorB: 4, note: "Swiss Chems competitive, especially on SARMs and niche peptides" },
      { category: "Shipping Speed", vendorA: 5, vendorB: 3, note: "Peptide Sciences ships same-day domestically; Swiss Chems ships internationally with longer lead times" },
      { category: "COA Accessibility", vendorA: 5, vendorB: 4, note: "Both post COAs; Peptide Sciences documentation is more detailed" },
      { category: "Affiliate Commission", vendorA: 3, vendorB: 4, note: "Swiss Chems offers 10–15% tiered commission" },
    ],
    vendorASummary:
      "Peptide Sciences is the benchmark US domestic vendor with the deepest catalog, fastest shipping, and the most transparent COA documentation in the industry. Best for researchers who prioritize documentation and need broad compound access.",
    vendorBSummary:
      "Swiss Chems is an internationally focused vendor offering a diverse catalog that extends beyond peptides into SARMs, ancillary compounds, and oral peptides. Strong reputation in the international research community with competitive pricing.",
    vendorAPros: [
      "Same-day domestic US shipping",
      "Most comprehensive COA documentation",
      "100+ compound catalog",
      "Established 10+ year track record",
      "US-based customer support",
    ],
    vendorACons: [
      "Limited international shipping options",
      "Higher pricing vs international vendors",
      "Peptides-only catalog",
    ],
    vendorBPros: [
      "Strong international shipping",
      "Broader catalog including SARMs and ancillaries",
      "Competitive pricing on niche compounds",
      "Tiered affiliate commission (up to 15%)",
    ],
    vendorBCons: [
      "Longer domestic US shipping times",
      "Less name recognition in US market",
      "COA detail varies by compound",
    ],
    verdict:
      "US researchers who need fast shipping and deep documentation should go with Peptide Sciences. International researchers or those needing SARMs and broader compound access will find Swiss Chems the more flexible option.",
    vendorAUrl: "https://www.peptidesciences.com",
    vendorBUrl: "https://swisschems.is",
    vendorACommission: "10%",
    vendorBCommission: "10–15%",
    faq: [
      {
        q: "Is Swiss Chems legit?",
        a: "Yes. Swiss Chems has an established reputation in the international research community with third-party tested compounds and a track record of reliable fulfillment. As with any vendor, always verify the COA for the specific batch you receive.",
      },
      {
        q: "Does Swiss Chems ship to the US?",
        a: "Yes, Swiss Chems ships internationally including to the US. Shipping times are longer than domestic vendors — typically 7–14 business days.",
      },
      {
        q: "Which is better for PT-141?",
        a: "Both carry PT-141. Swiss Chems tends to be more competitively priced on this compound, and it's one of their more popular offerings with readily available COA documentation.",
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
