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
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/bpc/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/bpc-157/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/bpc-157/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-bpc-157/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/tb-500?aff=84", commission: "30%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/tb-500/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/tb500-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/tb-500?uid=106&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/tb-500/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/tb/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/tb-500-peptide/?afref=a1b9", commission: "15%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-tb-500/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/semaglutide?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-1s-5mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/semaglutide-5mg/?ref=k9@auraprotocols.com", commission: "15%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/glp-1-sema/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/mhc-1-sm/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
    ],
    badge: "Top Rated",
    featured: true,
  },
  {
    id: "tirzepatide",
    name: "Tirzepatide",
    slug: "tirzepatide",
    category: "Body Composition",
    description:
      "Dual GIP/GLP-1 receptor agonist studied for synergistic effects on insulin secretion, fat metabolism, and appetite suppression — showing a greater magnitude of weight loss than semaglutide in head-to-head trials.",
    benefits: ["Dual GIP/GLP-1 receptor agonism", "SURMOUNT trials: 20–22% body-weight reduction over 72 weeks", "~20% greater weight loss than semaglutide in SURMOUNT-5", "Stronger HbA1c reduction in T2D research populations"],
    vendors: [
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-2t-15m/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/glp-tz-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/glpii/?ref=Aurapro", commission: "10%" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/glp-1-tirz/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/mhc-2-trz/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-tirzepatide/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
    ],
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
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/cjc-1295-no-dac-ipamorelin/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/cjc-1295-w-o-dac-ipamorelin/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-cjc-1295-ipamorelin-blend/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/cjc-ipa?aff=84", commission: "30%" },
    ],
    featured: true,
  },
  {
    id: "bpc-157-tb-500-blend",
    name: "Wolverine Stack (BPC-157 / TB-500)",
    slug: "bpc-157-tb-500-blend",
    category: "Stacks",
    description:
      "The foundational blend research stack: Body Protection Compound-157 paired with Thymosin Beta-4 in a single vial, pairing localized tissue-repair research with systemic healing research. The base every other blend on this page builds on.",
    benefits: ["Studied for tendon & ligament repair", "Researched for gut mucosal healing", "Studied for systemic tissue healing", "Anti-inflammatory pathways in studies"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/bpc-tb500?aff=84", commission: "30%" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/wolverine-stack-bpc-157-tb-500/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/bpc-157-tb-500-blend/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/bpc-157-tb-500-blend/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/bpc-157-5mg-tb-500-5mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/bpctb/?ref=Aurapro", commission: "10%" },
    ],
    badge: "New",
    featured: false,
  },
  {
    id: "glow-stack",
    name: "GLOW Stack (BPC-157 / TB-500 / GHK-Cu)",
    slug: "glow-stack",
    category: "Stacks",
    description:
      "The Wolverine Stack plus GHK-Cu in one vial — extending tissue-repair research into collagen synthesis, gene-expression, and dermal/follicular pathways alongside the same BPC-157 and TB-500 foundation.",
    benefits: ["Wolverine Stack's repair pathways, plus", "Collagen & elastin synthesis research", "Broad gene-modulation studies (GHK-Cu)", "Skin & follicular research applications"],
    vendors: [
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/glow-70-research-blend/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/glow70-peptide/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-glow-blend/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/glow-70mg/?afref=a1b9", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/glow/?ref=Aurapro", commission: "10%" },
    ],
    badge: "New",
    featured: false,
  },
  {
    id: "klow-stack",
    name: "KLOW Stack (BPC-157 / TB-500 / GHK-Cu / KPV)",
    slug: "klow-stack",
    category: "Stacks",
    description:
      "The GLOW Stack plus KPV — a four-peptide blend extending the same tissue-repair and collagen research into anti-inflammatory and gut-lining pathways in a single reconstitution.",
    benefits: ["GLOW Stack's repair & collagen pathways, plus", "Anti-inflammatory (NF-κB) research (KPV)", "Gut-lining / cytokine-signaling studies", "Broadest single-vial research coverage"],
    vendors: [
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/klow-80-blend/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/bpc-157-tb-500-ghk-cu-kpv-klow80-blend/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-klow-blend/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/klow-80mg/?afref=a1b9", commission: "15%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/klow-75mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/klow/?ref=Aurapro", commission: "10%" },
    ],
    badge: "New",
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/pt-141-bremelanotide?aff=84", commission: "30%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/pt-141-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/pt/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/pt-141-10mg/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/pt-141/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-pt-141/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
    benefits: ["Triple-receptor agonism (GLP-1/GIP/glucagon)", "Appetite research in Phase 2 trials", "Body-weight reduction in TRIUMPH-1 data", "Metabolic-regulation research"],
    vendors: [
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/retatrutide?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/glp-3r-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/retatrutide-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/glpiii/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/glp-3-reta/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/mhc-3-rt/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-retatrutide/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/tesamorelin?aff=84", commission: "30%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/tesa-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/tesa/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/tesamorelin/?afref=a1b9", commission: "15%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-tesamorelin/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/tesamorlin/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
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
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/ss/?ref=Aurapro", commission: "10%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-ss-31-10mg/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/ss31-10mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/ss-31-peptide/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/mtp-31/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
    ],
    badge: "New",
    featured: true,
  },
  {
    id: "slu-pp-332",
    name: "SLU-PP-332",
    slug: "slu-pp-332",
    category: "Longevity & Wellness",
    description:
      "Synthetic pan-agonist of the estrogen-related receptor family (ERRα/β/γ) developed at Saint Louis University, studied for activating exercise-associated transcriptional programs — mitochondrial biogenesis, fatty-acid oxidation, and oxidative metabolism — without physical exertion.",
    benefits: ["ERRα/β/γ pan-agonist research", "Mitochondrial biogenesis study models", "Exercise-mimetic transcriptional research", "Fatty-acid oxidation & energy metabolism models"],
    vendors: [
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/slu-pp-332-peptide/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/slu-pp-332/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-slu-pp-332-tablets/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/slu-pp-332-250mcg-60-capsules?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
    ],
    badge: "New",
    featured: false,
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
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/aod/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/aod-9604/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/aod-9604/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/aod-9604-1-vial/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/epithalon-50mg/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/epi/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/epithalon-10mg/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/epithalon/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-epitalon/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/sermorelin?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/sermorelin-5mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/serm/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/sermorelin/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/sermorelin/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/sermorelin-1-vial/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/mots-c?aff=84", commission: "30%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/mots-c?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/mots-c-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/motsc/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/mots-c-10mg/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/mots-c/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-mots-c/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/ghk-cu?aff=84", commission: "30%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/ghk-cu?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/ghk-cu-100mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/ghk/?ref=Aurapro", commission: "10%" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/ghk-cu/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/ghk-cu/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-ghk-cu-peptide/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/ghk-cu/?rfsn=9131640.7592e7", commission: "20%" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/igf-1-lr3?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/igf-1lr3/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/igf/?ref=Aurapro", commission: "10%" },      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/igf-1-lr3/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/igf-1-lr3/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-igf-1-lr3/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
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
      { vendor: "GLP-1 Research Lab", url: "https://www.glp1researchlab.com/product/nad?aff=84", commission: "30%" },
      { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/product/nad/?rfsn=9131640.7592e7", commission: "20%" },
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/nad-500mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/nad/?ref=Aurapro", commission: "10%" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/nad-peptide/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/nad500mg/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-nad/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
    ],
    featured: false,
  },
  {
    id: "kpv",
    name: "KPV",
    slug: "kpv",
    category: "Recovery",
    description:
      "Tripeptide (Lys-Pro-Val) representing the C-terminal fragment of alpha-MSH. Studied for anti-inflammatory and gut-lining research, independent of alpha-MSH's pigmentation and appetite effects.",
    benefits: ["Anti-inflammatory pathway research", "Gut-lining / cytokine-signaling studies", "Preclinical wound-healing models", "Studied for oral stability vs. other tripeptides"],
    vendors: [
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/kpv-10mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/kpv?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/kpv/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/kpv/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "Main Peptides", url: "https://mainpeptides.com/product/kpv/?ref=Aurapro", commission: "10%" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-kpv-peptide-1-vial/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
    ],
    featured: false,
  },
  {
    id: "dsip",
    name: "DSIP (Delta Sleep-Inducing Peptide)",
    slug: "dsip",
    category: "Longevity & Wellness",
    description:
      "Nonapeptide first isolated from rabbit cerebral venous blood in the 1970s, studied for slow-wave sleep promotion, stress-axis modulation, and opioid-withdrawal research — despite decades of study, its receptor and precursor gene remain unidentified.",
    benefits: ["Slow-wave (delta) sleep research since the 1970s", "Small human studies in opiate/alcohol withdrawal", "Studied stress-axis and HPA modulation", "No confirmed receptor identified after 50 years"],
    vendors: [
      { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/product/dsip-5mg/?ref=k9@auraprotocols.com", commission: "15%" },
      { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/product/dsip-delta-sleep-inducing-peptide?_ef_transaction_id=&oid=1&affid=10866", commission: "15%", note: "Use code AuraProto for 15% off" },
      { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/products/dsip/?afref=a1b9", commission: "15%" },
      { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/product/dsip/?ref=auraproto", commission: "15%", note: "Use code auraproto for 10% off" },
      { vendor: "PSPeptides", url: "https://pspeptides.com/product/buy-dsip/?ref=aurapro", commission: "18%", note: "Use code AURAPRO10 for 10% off" },
    ],
    badge: "New",
    featured: false,
  },
];

export const categories = [...new Set(products.map((p) => p.category))];
