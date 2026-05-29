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
      { vendor: "Core Peptides", url: "https://www.corepeptides.com/peptides/bpc-157/?attribute_pa_size=5mg", commission: "12%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%", note: "Nasal spray format" },
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
      { vendor: "Core Peptides", url: "https://www.corepeptides.com/peptides/tb-500/?attribute_pa_size=5mg", commission: "12%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%", note: "BPC-157 + TB-500 combo spray" },
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
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
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
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/ipamorelin-cjc-1295-no-dac/", commission: "15%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
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
      { vendor: "Swiss Chems", url: "https://swisschems.is/ref/6782/", commission: "20%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%", note: "Nasal spray + vial formats" },
    ],
    featured: true,
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
      { vendor: "Core Peptides", url: "https://www.corepeptides.com/peptides/sermorelin-5mg/", commission: "12%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
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
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
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
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com", commission: "TBD" },
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
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%" },
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
      { vendor: "Core Peptides", url: "https://www.corepeptides.com", commission: "12%" },
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%" },
    ],
    featured: false,
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
      { vendor: "Behemoth Labz", url: "https://behemothlabz.com", commission: "7%" },
    ],
    featured: false,
  },
];

export const categories = [...new Set(products.map((p) => p.category))];
