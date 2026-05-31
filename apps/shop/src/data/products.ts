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
    benefits: ["Joint & tendon repair", "Gut lining support", "Anti-inflammatory", "Accelerated healing"],
    vendors: [
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/bpc-157?uid=17&oid=1&affid=10866", commission: "15%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/bpc157-10mg/?rfsn=9131640.7592e7", commission: "20%" },
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
    benefits: ["Systemic tissue healing", "Reduced inflammation", "Muscle repair", "Improved flexibility"],
    vendors: [
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/tb-500?uid=106&oid=1&affid=10866", commission: "15%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/tb500-10mg/?rfsn=9131640.7592e7", commission: "20%" },
    ],
    featured: true,
  },
  {
    id: "semaglutide",
    name: "Semaglutide (GLP-1)",
    slug: "semaglutide",
    category: "Weight Management",
    description:
      "GLP-1 receptor agonist widely studied for appetite regulation, blood sugar control, and body composition.",
    benefits: ["Appetite suppression", "Blood sugar regulation", "Fat loss support", "Cardiovascular benefits"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://glp1researchlab.com/?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-1s-5mg/?rfsn=9131640.7592e7", commission: "20%" },
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
    benefits: ["GH pulse optimization", "Lean muscle support", "Improved sleep quality", "Fat metabolism"],
    vendors: [
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/ipamorelin-cjc-1295-no-dac?uid=27&oid=1&affid=10866", commission: "15%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/cjc1295-ipamorelin/?rfsn=9131640.7592e7", commission: "20%" },
    ],
    featured: true,
  },
  {
    id: "pt-141",
    name: "PT-141 (Bremelanotide)",
    slug: "pt-141",
    category: "Wellness",
    description:
      "Melanocortin receptor agonist studied for its role in libido and sexual health in both men and women.",
    benefits: ["Libido enhancement", "Sexual function support", "Mood elevation", "Melanocortin activation"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/pt-141-10mg-price-is-per-vial/?ref=6782", commission: "20%" },
    ],
    featured: true,
  },
  {
    id: "retatrutide",
    name: "Retatrutide",
    slug: "retatrutide",
    category: "Weight Management",
    description:
      "Triple receptor agonist targeting GLP-1, GIP, and glucagon receptors. Phase 3 trials recorded up to 24.2% body weight reduction — the highest of any compound in its class.",
    benefits: ["Triple-receptor agonism", "Appetite suppression", "Fat mass reduction", "Metabolic regulation"],
    vendors: [
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-3r-10mg/?rfsn=9131640.7592e7", commission: "20%" },
    ],
    badge: "Phase 3",
    featured: true,
  },
  {
    id: "tesamorelin",
    name: "Tesamorelin",
    slug: "tesamorelin",
    category: "Growth & Performance",
    description:
      "Synthetic GHRH analog that stimulates endogenous growth hormone release. Studied for visceral fat reduction, body composition, and metabolic health.",
    benefits: ["Visceral fat reduction", "GH pulse stimulation", "Lean body composition", "Metabolic support"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
    ],
    featured: true,
  },
  {
    id: "aod-9604",
    name: "AOD-9604",
    slug: "aod-9604",
    category: "Weight Management",
    description:
      "Synthetic fragment of human growth hormone (hGH 176-191) studied for its role in fat metabolism and lipolysis without affecting blood sugar or IGF-1 levels.",
    benefits: ["Targeted fat metabolism", "Lipolysis stimulation", "No IGF-1 interference", "No blood sugar impact"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
    ],
    featured: false,
  },
  {
    id: "epithalon",
    name: "Epithalon",
    slug: "epithalon",
    category: "Wellness",
    description:
      "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) studied for its role in telomerase activation, cellular longevity, and regulation of the pineal gland's melatonin output.",
    benefits: ["Telomerase activation", "Cellular longevity", "Melatonin regulation", "Anti-aging support"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/epithalon-50mg/?rfsn=9131640.7592e7", commission: "20%" },
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
    benefits: ["Natural GH stimulation", "Anti-aging support", "Lean body composition", "Improved energy"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
    ],
    featured: true,
  },
  {
    id: "mots-c",
    name: "MOTS-c",
    slug: "mots-c",
    category: "Wellness",
    description:
      "Mitochondrial-derived peptide that regulates metabolic homeostasis, improves insulin sensitivity, and supports cellular energy production. Active in clinical trials for metabolic disease.",
    benefits: ["Mitochondrial optimization", "Insulin sensitivity", "Metabolic homeostasis", "Cellular energy support"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
    ],
    featured: false,
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu (Copper Peptide)",
    slug: "ghk-cu",
    category: "Wellness",
    description:
      "Naturally occurring copper-binding tripeptide (Gly-His-Lys) studied for skin regeneration, wound healing, hair follicle stimulation, and collagen synthesis. Declines naturally with age.",
    benefits: ["Skin regeneration", "Collagen synthesis", "Hair follicle support", "Antioxidant activity"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/ghk-cu-copper-peptide/?ref=6782", commission: "20%" },
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
    benefits: ["Muscle protein synthesis", "Lean tissue growth", "Recovery support", "Extended half-life vs. native IGF-1"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/igf-1-lr3-1mg-price-is-per-vial/?ref=6782", commission: "20%" },
    ],
    featured: false,
  },
  {
    id: "nad-plus",
    name: "NAD+ (Nicotinamide Adenine Dinucleotide)",
    slug: "nad-plus",
    category: "Wellness",
    description:
      "Coenzyme central to mitochondrial energy production, DNA repair, and cellular longevity. Levels decline with age; supplementation is studied for metabolic health, cognitive function, and healthspan.",
    benefits: ["Mitochondrial energy production", "DNA repair support", "Cellular longevity", "Cognitive function"],
    vendors: [
      { vendor: "Swiss Chems", url: "https://swisschems.is/product/nad-coenzyme-peptide-1-vial-100-mg/?ref=6782", commission: "20%" },
    ],
    featured: false,
  },
];

export const categories = [...new Set(products.map((p) => p.category))];
