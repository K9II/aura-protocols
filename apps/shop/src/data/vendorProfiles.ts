// apps/shop/src/data/vendorProfiles.ts
import { EVOLVE_ENABLED, evolveProfile } from "./pendingVendors";

export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
};

const baseVendorProfiles: VendorProfile[] = [
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
  {
    vendor: "American Peptides",
    summary:
      "American Peptides runs a large RUO-only catalog spanning individual peptides, GLP-1 compounds, bioregulators, and pre-blended stacks, with published third-party Certificates of Analysis per batch.",
    pros: [
      "Large catalog with published, batch-specific COAs",
      "Customer discount of 10% off with code AURAPRO10",
    ],
    cons: [
      "Newer addition — shipping speed and full catalog depth not yet independently confirmed; treat this profile as provisional",
    ],
  },
];

// Staged vendors (e.g. Evolve Peptides) are appended only when they go live, so
// this list stays in 1:1 sync with the vendors referenced in products.ts in both
// the disabled and enabled states. See pendingVendors.ts.
export const vendorProfiles: VendorProfile[] = [
  ...baseVendorProfiles,
  ...(EVOLVE_ENABLED ? [evolveProfile] : []),
];
