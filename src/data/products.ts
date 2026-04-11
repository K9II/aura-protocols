export type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  benefits: string[];
  affiliate: {
    vendor: string;
    url: string;
    commission: string;
  };
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
    affiliate: {
      vendor: "Peptide Sciences",
      url: "https://www.peptidesciences.com/bpc-157",
      commission: "10%",
    },
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
    affiliate: {
      vendor: "Peptide Sciences",
      url: "https://www.peptidesciences.com/tb-500",
      commission: "10%",
    },
    featured: true,
  },
  {
    id: "semaglutide",
    name: "Semaglutide",
    slug: "semaglutide",
    category: "Weight Management",
    description:
      "GLP-1 receptor agonist widely studied for appetite regulation, blood sugar control, and body composition.",
    benefits: ["Appetite suppression", "Blood sugar regulation", "Fat loss support", "Cardiovascular benefits"],
    affiliate: {
      vendor: "Core Peptides",
      url: "https://corepeptides.com/semaglutide",
      commission: "12%",
    },
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
    affiliate: {
      vendor: "Limitless Life Nootropics",
      url: "https://limitlesslifenootropics.com/cjc-1295-ipamorelin",
      commission: "15%",
    },
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
    affiliate: {
      vendor: "Swiss Chems",
      url: "https://swisschems.is/product/pt-141",
      commission: "10%",
    },
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
    affiliate: {
      vendor: "Peptide Sciences",
      url: "https://www.peptidesciences.com/sermorelin",
      commission: "10%",
    },
    featured: false,
  },
];

export const categories = [...new Set(products.map((p) => p.category))];
