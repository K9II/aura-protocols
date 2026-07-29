// apps/shop/src/data/vendorProfiles.ts
export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
};

export const vendorProfiles: VendorProfile[] = [
  {
    vendor: "Limitless Life Nootropics",
    summary:
      "Limitless Life Nootropics (Limitless Biotech) has carved out a strong niche in growth hormone secretagogues and performance peptide stacks. Their pre-blended CJC-1295/Ipamorelin combinations and USA manufacturing make them a top choice for GH-focused research programs.",
    pros: [
      "Best-in-class GH secretagogue stacks (CJC-1295/Ipamorelin blends)",
      "USA-manufactured, same-day domestic shipping",
      "Pre-blended stacks simplify research protocols",
      "99% purity standard with batch COAs",
    ],
    cons: [
      "Narrower catalog vs broader-catalog vendors on this site",
      "Less established for non-GH peptides",
    ],
  },
  {
    vendor: "Swiss Chems",
    summary:
      "Swiss Chems operates one of the broader catalogs in the research chemical market — covering peptides, SARMs, oral peptides, and ancillary compounds. Their international shipping network gives them a strong position outside the US domestic market.",
    pros: [
      "Widest payment options of any vendor on this site — card, bank transfer (Plaid ACH, Coinbase, Zelle, Interac), and 7 cryptocurrencies",
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "Good option for PT-141 and niche compounds",
    ],
    cons: [
      "Longer US domestic shipping times than domestic-only vendors",
      "COA detail can vary by compound",
    ],
  },
  {
    vendor: "Apollo Peptide Sciences",
    summary:
      "Apollo Peptide Sciences runs a broad catalog spanning GLP-1 compounds (semaglutide, tirzepatide, retatrutide) alongside standard recovery and longevity peptides.",
    pros: [
      "Carries tirzepatide and retatrutide variants alongside semaglutide — broader GLP-1 lineup than most vendors on this site",
      "Also stocks longevity-focused compounds (Epithalon, NAD+, FOXO4-DRI) not every vendor carries",
    ],
    cons: [
      "Does not carry PT-141, Tesamorelin, AOD-9604, Sermorelin, or MOTS-c",
      "Shipping speed not independently confirmed — rated provisionally at average",
      "Payment limited to Visa, Discover, and American Express only — no crypto or bank-transfer option",
    ],
  },
  {
    vendor: "GLP-1 Research Lab",
    summary:
      "GLP-1 Research Lab's catalog extends well beyond GLP-1s into wellness and recovery peptides, covering many of the same core compounds carried elsewhere on this site.",
    pros: [
      "Broad catalog spanning GLP-1s, wellness peptides (PT-141, NAD+, MOTS-c, GHK-Cu, Tesamorelin), and recovery compounds (TB-500, Ipamorelin, IGF-1 LR3)",
      "Carries the Cagrilintide and Cagri-Sema blend, not available at most other vendors on this site",
      "Accepts major credit cards and ACH bank transfer",
    ],
    cons: [
      "Does not carry BPC-157, CJC-1295/Ipamorelin, or AOD-9604",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
  },
  {
    vendor: "Ignite Peptides",
    summary:
      "Ignite Peptides carries the broadest catalog of any approved vendor (30+ compounds), a Minnesota-based, US-domestic operation.",
    pros: [
      "Broadest confirmed catalog among approved vendors — 30+ compounds including several pre-blended stacks",
      "US-domestic operation",
      "Ships in plain, unmarked packaging with no indication of contents",
    ],
    cons: [
      "Does not carry AOD-9604, Epithalon, or IGF-1 LR3",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
  },
  {
    vendor: "Main Peptides",
    summary:
      "Main Peptides is a smaller-catalog vendor added primarily for SS-31, with third-party purity testing on file.",
    pros: [
      "Carries SS-31 with third-party purity testing documented",
    ],
    cons: [
      "Catalog breadth beyond the compounds already listed on this site is not fully documented yet — treat this profile as provisional pending a full catalog review",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
  },
  {
    vendor: "Peak Lab Peptides",
    summary:
      "Peak Lab Peptides runs a formal Research Partner / Affiliate program with an explicit RUO-only compliance framework. Added as the sole confirmed vendor for SLU-PP-332.",
    pros: [
      "Sole confirmed vendor for SLU-PP-332 on this site",
      "Documented affiliate program with explicit research-use-only compliance terms",
    ],
    cons: [
      "Catalog breadth beyond SLU-PP-332 not yet reviewed — treat this profile as provisional",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
  },
  {
    vendor: "Mile High Compounds",
    summary:
      "Mile High Compounds is a broad-catalog research vendor added as a second source for SLU-PP-332 alongside a wide overlap with the core compounds already on this site.",
    pros: [
      "Second confirmed source for SLU-PP-332, plus broad overlap across recovery, GLP-1, and longevity compounds",
      "Customer discount of 10% off with code auraproto",
    ],
    cons: [
      "Newer addition — shipping speed and catalog depth not yet independently confirmed; treat this profile as provisional",
      "International (.is) fulfillment may mean longer US domestic shipping than domestic-only vendors",
    ],
  },
  {
    vendor: "PSPeptides",
    summary:
      "PSPeptides is a US-manufactured vendor and the third confirmed source for all three Stacks products (Wolverine, GLOW, and KLOW), alongside a broader catalog of standalone compounds.",
    pros: [
      "Third confirmed source for the Wolverine, GLOW, and KLOW stacks — the deepest stack coverage of any single vendor on this site",
      "US-manufactured, third-party HPLC tested with batch-specific COAs",
      "Customer discount of 10% off with code AURAPRO10",
    ],
    cons: [
      "Newer addition — shipping speed and full catalog depth not yet independently confirmed; treat this profile as provisional",
    ],
  },
];
