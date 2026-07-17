export type ProductVendor = {
  vendor: string;
  url: string;
  commission: string;
  note?: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  benefits: string[];
  vendors: ProductVendor[];
  badge?: string;
  featured: boolean;
};

export const products: Product[] = [
  {
    id: "bpc-157",
    name: "BPC-157",
    slug: "bpc-157",
    category: "Recovery",
    description:
      "Body Protection Compound-157. One of the most studied peptides for tissue repair, gut health, and joint recovery.",
    benefits: ["Studied for tendon & ligament repair", "Researched for gut mucosal healing", "Anti-inflammatory pathways in studies", "Tissue-healing research (preclinical)"],
    vendors: [
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/bpc157-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/bpc-157?uid=17&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/bpc-157-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/bpc/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/bpc-157/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    badge: "Best Seller",
    featured: true,
  },
  {
    id: "tb-500",
    name: "TB-500 (Thymosin Beta-4)",
    slug: "tb-500",
    category: "Recovery",
    description:
      "Thymosin Beta-4 fragment known for promoting systemic healing, reducing inflammation, and supporting muscle repair.",
    benefits: ["Studied for systemic tissue healing", "Anti-inflammatory effects in research", "Muscle-repair research models", "Cell-migration studies"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/tb-500-2?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/tb500-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/tb-500?uid=106&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/tb-500/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/tb/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/tb-500/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: true,
  },
  {
    id: "semaglutide",
    name: "Semaglutide (GLP-1)",
    slug: "semaglutide",
    category: "Body Composition",
    description:
      "GLP-1 receptor agonist widely studied for appetite regulation, blood sugar control, and body composition.",
    benefits: ["Appetite regulation in clinical trials", "Glycemic-control research", "Body-weight reduction in STEP trials", "Cardiovascular-outcome research (SELECT)"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/glp-1-semaglutide-2?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-1s-5mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/semaglutide-5mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/semaglutide-peptide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    badge: "Top Rated",
    featured: true,
  },
  {
    id: "cjc-1295-ipamorelin",
    name: "CJC-1295 / Ipamorelin",
    slug: "cjc-1295-ipamorelin",
    category: "Growth & Performance",
    description:
      "A synergistic blend of growth hormone releasing hormone analog and growth hormone secretagogue for optimized GH pulses.",
    benefits: ["Studied for GH pulse stimulation", "Lean-mass research models", "Sleep-architecture studies", "Lipolysis research"],
    vendors: [
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/cjc1295-ipamorelin/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/ipamorelin-cjc-1295-no-dac?uid=27&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/cjc-ipamorelin/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/cjcipa/?ref=Aurapro", commission: "10%" },
    ],
    featured: true,
  },
  {
    id: "bpc-157-tb-500-blend",
    name: "BPC-157 / TB-500 Blend",
    slug: "bpc-157-tb-500-blend",
    category: "Recovery",
    description:
      "A pre-blended combination of Body Protection Compound-157 and Thymosin Beta-4, pairing localized tissue-repair research with systemic healing research in a single vial.",
    benefits: ["Studied for tendon & ligament repair", "Researched for gut mucosal healing", "Studied for systemic tissue healing", "Anti-inflammatory pathways in studies"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/bpc-157-tb-500-blend-2/?aff=84", commission: "30%" },
    ],
    featured: false,
  },
  {
    id: "pt-141",
    name: "PT-141 (Bremelanotide)",
    slug: "pt-141",
    category: "Longevity & Wellness",
    description:
      "Melanocortin receptor agonist studied for its role in libido and sexual health in both men and women.",
    benefits: ["Studied for sexual desire (HSDD trials)", "Central arousal-pathway research", "Melanocortin MC3R/MC4R activation", "FDA-approved as Vyleesi (specific indication)"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/pt-141-bremelanotide?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/pt-141-10mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/pt-141-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/pt/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/pt-141/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: true,
  },
  {
    id: "retatrutide",
    name: "Retatrutide",
    slug: "retatrutide",
    category: "Body Composition",
    description:
      "Triple receptor agonist targeting GLP-1, GIP, and glucagon receptors. Phase 3 trials recorded up to 24.2% body weight reduction — the highest of any compound in its class.",
    benefits: ["Triple-receptor agonism (GLP-1/GIP/glucagon)", "Appetite research in Phase 2 trials", "Body-weight reduction in SURMOUNT data", "Metabolic-regulation research"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/ggg-tri-agonist-retatrutide-2?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-3r-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/retatrutide-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/glpiii/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/retatrutide-peptide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    badge: "Phase 3",
    featured: true,
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    slug: "tesamorelin",
    category: "Body Composition",
    description:
      "Synthetic GHRH analog that stimulates endogenous growth hormone release. Studied for visceral fat reduction, body composition, and metabolic health.",
    benefits: ["Visceral-fat reduction in RCTs", "GH-stimulation research", "Body-composition studies", "FDA-approved as Egrifta (specific indication)"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/tesamorelin?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/tesamorelin-2mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/tesa-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/tesa/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/tesamorelin-peptide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: true,
  },
  {
    id: "ss-31",
    name: "SS-31 (Elamipretide)",
    slug: "ss-31",
    category: "Longevity & Wellness",
    description:
      "Mitochondria-targeted tetrapeptide that binds directly to cardiolipin in the inner mitochondrial membrane, stabilizing membrane structure and reducing oxidative stress at the site of energy production.",
    benefits: ["Mitochondrial membrane-stabilization research", "Oxidative-stress reduction in studies", "ATP-production research models", "Age-related mitochondrial-decline studies"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/ss31-elamipretide/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/ss/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/ss31-elamipretide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    badge: "New",
    featured: true,
  },
  {
    id: "aod-9604",
    name: "AOD-9604",
    slug: "aod-9604",
    category: "Body Composition",
    description:
      "Synthetic fragment of human growth hormone (hGH 176-191) studied for its role in fat metabolism and lipolysis without affecting blood sugar or IGF-1 levels.",
    benefits: ["Lipolysis research (hGH 176-191)", "Fat-metabolism study models", "No IGF-1 effect in studies", "No glycemic impact in trials"],
    vendors: [
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/aod-9604?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/aod/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/aod-9064-peptide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: false,
  },
  {
    id: "epithalon",
    name: "Epithalon",
    slug: "epithalon",
    category: "Longevity & Wellness",
    description:
      "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) studied for its role in telomerase activation, cellular longevity, and regulation of the pineal gland's melatonin output.",
    benefits: ["Telomerase-activation research", "Longevity study models", "Pineal/melatonin research", "Studied in longevity literature"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/epitalon-10mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/epithalon-50mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/epi/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/epithalon/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: false,
  },
  {
    id: "sermorelin",
    name: "Sermorelin",
    slug: "sermorelin",
    category: "Growth & Performance",
    description:
      "Growth hormone releasing hormone analogue that stimulates the pituitary to naturally increase GH production.",
    benefits: ["Studied for natural GH stimulation", "Age-related GH-decline research", "Body-composition study models", "GHRH-analogue literature"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/sermorelin-2mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/sermorelin?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/sermorelin-5mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/serm/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/sermorelin/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: true,
  },
  {
    id: "mots-c",
    name: "MOTS-c",
    slug: "mots-c",
    category: "Longevity & Wellness",
    description:
      "Mitochondrial-derived peptide that regulates metabolic homeostasis, improves insulin sensitivity, and supports cellular energy production. Active in clinical trials for metabolic disease.",
    benefits: ["Mitochondrial-function research", "Insulin-sensitivity studies", "AMPK / metabolic research", "Studied in metabolic models"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/mots-c?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/mots-c-10mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/mots-c?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/mots-c-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/motsc/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/mots-c-peptide/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: false,
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu (Copper Peptide)",
    slug: "ghk-cu",
    category: "Longevity & Wellness",
    description:
      "Naturally occurring copper-binding tripeptide (Gly-His-Lys) studied for skin regeneration, wound healing, hair follicle stimulation, and collagen synthesis. Declines naturally with age.",
    benefits: ["Skin-regeneration research", "Collagen-synthesis studies", "Hair-follicle research models", "Antioxidant-activity studies"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/ghk-cu?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/ghk-cu-copper-peptide/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/ghk-cu?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/ghk-cu-100mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/ghk/?ref=Aurapro", commission: "10%" },
    ],
    featured: false,
  },
  {
    id: "igf-1-lr3",
    name: "IGF-1 LR3",
    slug: "igf-1-lr3",
    category: "Growth & Performance",
    description:
      "Long-acting analog of insulin-like growth factor 1 with extended half-life. Studied for muscle protein synthesis, lean tissue growth, and recovery — a common pairing with CJC-1295 / Ipamorelin stacks.",
    benefits: ["Muscle-protein-synthesis research", "Lean-tissue study models", "Recovery research", "Extended half-life vs. native IGF-1"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/igf-1-lr3?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/igf-1-lr3-1mg-price-is-per-vial/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/igf-1lr3/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/igf/?ref=Aurapro", commission: "10%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com/product/igf1-lr3-receptor-grade/", commission: "7%", note: "Use code AuraPro for 10% off" },
    ],
    featured: false,
  },
  {
    id: "nad-plus",
    name: "NAD+ (Nicotinamide Adenine Dinucleotide)",
    slug: "nad-plus",
    category: "Longevity & Wellness",
    description:
      "Coenzyme central to mitochondrial energy production, DNA repair, and cellular longevity. Levels decline with age; supplementation is studied for metabolic health, cognitive function, and healthspan.",
    benefits: ["Mitochondrial-energy research", "DNA-repair study models", "Cellular-longevity research", "Cognitive-function studies"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/product/nad?aff=84", commission: "30%" },
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/nad-coenzyme-peptide-1-vial-100-mg/?ref=6782", commission: "20%", note: "Use code Aura10 for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/nad/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/nad-500mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/nad/?ref=Aurapro", commission: "10%" },
    ],
    featured: false,
  },
];

export const categories = [...new Set(products.map((p) => p.category))];
