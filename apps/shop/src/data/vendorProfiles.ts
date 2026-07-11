// apps/shop/src/data/vendorProfiles.ts
export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
  scores: {
    catalogBreadth: number; // 1-5
    shippingSpeed: number; // 1-5, provisional 3 unless independently confirmed
    coaPractices: number; // 1-5
  };
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
    scores: { catalogBreadth: 4, shippingSpeed: 5, coaPractices: 4 },
  },
  {
    vendor: "Swiss Chems",
    summary:
      "Swiss Chems operates one of the broader catalogs in the research chemical market — covering peptides, SARMs, oral peptides, and ancillary compounds. Their international shipping network gives them a strong position outside the US domestic market.",
    pros: [
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "Good option for PT-141 and niche compounds",
    ],
    cons: [
      "Longer US domestic shipping times than domestic-only vendors",
      "COA detail can vary by compound",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Apollo Peptide Sciences",
    summary:
      "Apollo Peptide Sciences runs a broad catalog spanning GLP-1 compounds (semaglutide, tirzepatide, retatrutide) alongside standard recovery and longevity peptides, tracked through a Refersion affiliate program.",
    pros: [
      "Carries tirzepatide and retatrutide variants alongside semaglutide — broader GLP-1 lineup than most vendors on this site",
      "Also stocks longevity-focused compounds (Epithalon, NAD+, FOXO4-DRI) not every vendor carries",
    ],
    cons: [
      "Does not carry PT-141, Tesamorelin, AOD-9604, Sermorelin, or MOTS-c",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 4, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Behemoth Labz",
    summary:
      "Behemoth Labz carries one of the broadest catalogs on the site (112+ products) with a confirmed customer discount code and verified click tracking.",
    pros: [
      "Largest confirmed catalog among approved vendors — carries SS-31, AOD-9604, Epithalon, and IGF-1 LR3 that several other vendors don't stock",
      "Confirmed working discount code and verified affiliate click tracking",
    ],
    cons: [
      "Does not carry GHK-Cu, NAD+, or the CJC-1295/Ipamorelin blend",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "GLP-1 Research Lab",
    summary:
      "GLP-1 Research Lab's catalog extends well beyond GLP-1s into wellness and recovery peptides, covering many of the same core compounds carried elsewhere on this site.",
    pros: [
      "Broad catalog spanning GLP-1s, wellness peptides (PT-141, NAD+, MOTS-c, GHK-Cu, Tesamorelin), and recovery compounds (TB-500, Ipamorelin, IGF-1 LR3)",
      "Carries the Cagrilintide and Cagri-Sema blend, not available at most other vendors on this site",
    ],
    cons: [
      "Does not carry BPC-157, CJC-1295/Ipamorelin, or AOD-9604",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 4, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Ignite Peptides",
    summary:
      "Ignite Peptides carries the broadest catalog of any approved vendor (30+ compounds) with confirmed live affiliate tracking and a Minnesota-based, US-domestic operation.",
    pros: [
      "Broadest confirmed catalog among approved vendors — 30+ compounds including several pre-blended stacks",
      "US-domestic operation with confirmed live deep-link tracking",
    ],
    cons: [
      "Does not carry AOD-9604, Epithalon, or IGF-1 LR3",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 5, shippingSpeed: 3, coaPractices: 4 },
  },
  {
    vendor: "Main Peptides",
    summary:
      "Main Peptides is a smaller-catalog vendor added primarily for SS-31, with a confirmed working affiliate link and third-party purity testing on file.",
    pros: [
      "Confirmed working affiliate link and deep-link format",
      "Carries SS-31 with third-party purity testing documented",
    ],
    cons: [
      "Catalog breadth beyond the compounds already listed on this site is not fully documented yet — treat this profile as provisional pending a full catalog review",
      "Shipping speed not independently confirmed — rated provisionally at average",
    ],
    scores: { catalogBreadth: 3, shippingSpeed: 3, coaPractices: 4 },
  },
];
