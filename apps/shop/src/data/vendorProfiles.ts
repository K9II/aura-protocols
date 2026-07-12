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
      "Broadest catalog including SARMs and ancillaries",
      "Strong international shipping network",
      "Good option for PT-141 and niche compounds",
      "Widest payment options of any vendor on this site — card, bank transfer (Plaid ACH, Coinbase, Zelle, Interac), and 7 cryptocurrencies",
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
    vendor: "Behemoth Labz",
    summary:
      "Behemoth Labz carries one of the broadest catalogs on the site (112+ products).",
    pros: [
      "Largest confirmed catalog among approved vendors — carries SS-31, AOD-9604, Epithalon, and IGF-1 LR3 that several other vendors don't stock",
      "Publishes four independent analytical test methods (HPLC, TGA, UV-Vis, FTIR) — more documented testing methods than most vendors on this site",
      "Additional discount for cryptocurrency payment on top of standard card/debit acceptance",
    ],
    cons: [
      "Does not carry GHK-Cu, NAD+, or the CJC-1295/Ipamorelin blend",
      "Shipping speed not independently confirmed — rated provisionally at average",
      "Testing lab name is not disclosed on published COAs",
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
];
