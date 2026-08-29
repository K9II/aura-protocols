// apps/shop/src/data/vendorProfiles.ts
import { EVOLVE_ENABLED, evolveProfile, IMPROVED_ENABLED, improvedProfile } from "./pendingVendors";

export type VendorProfile = {
  vendor: string; // must exactly match ProductVendor.vendor strings used in products.ts
  summary: string;
  pros: string[];
  cons: string[];
};

const baseVendorProfiles: VendorProfile[] = [
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
  ...(IMPROVED_ENABLED ? [improvedProfile] : []),
];
