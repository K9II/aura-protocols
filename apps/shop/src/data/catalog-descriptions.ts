// Product-page identity descriptions: what the material is, chemically.
// Identity only — no effects, uses, mechanisms or research context.
// Every fact is checked against `source` before it ships (CLAUDE.md compliance rules).
// RELATIVE IMPORTS ONLY — reachable from next.config.ts via data/catalog.ts.

export type Description = { text: string; source: string };

const PUBCHEM = (cid: number) => `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
const SUPPLIED = "Supplied as a lyophilized powder in a sealed vial.";

export const DESCRIPTIONS: Record<string, Description> = {
  "bpc-157": {
    text: `BPC-157 is a synthetic pentadecapeptide, a 15-residue chain with the sequence Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val. ${SUPPLIED}`,
    source: PUBCHEM(9941957),
  },
  "tb-500": {
    text: `TB-500 is a synthetic N-acetylated heptapeptide, Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln, corresponding to residues 17–23 of thymosin beta-4, a 43-residue protein. ${SUPPLIED}`,
    source: PUBCHEM(62707662),
  },
  "kpv": {
    text: `KPV is the tripeptide Lys-Pro-Val, the C-terminal residues 11–13 of alpha-melanocyte-stimulating hormone (α-MSH). ${SUPPLIED}`,
    source: PUBCHEM(125672),
  },
  "aod-9604": {
    text: `AOD-9604 is a synthetic 16-residue peptide: the C-terminal region of human growth hormone (residues 177–191) with an added N-terminal tyrosine. ${SUPPLIED}`,
    source: PUBCHEM(71300630),
  },
  "sermorelin": {
    text: `Sermorelin is a synthetic 29-residue peptide whose sequence matches the N-terminal fragment (residues 1–29) of human growth hormone–releasing hormone, amidated at the C-terminus. ${SUPPLIED}`,
    source: PUBCHEM(16132413),
  },
  "tesamorelin": {
    text: `Tesamorelin is a synthetic 44-residue analog of human growth hormone–releasing hormone carrying a trans-3-hexenoyl group on the N-terminal tyrosine. ${SUPPLIED}`,
    source: PUBCHEM(16137828),
  },
  "igf-1-lr3": {
    text: `IGF-1 LR3 is an 83-residue analog of human insulin-like growth factor 1: the 70-residue IGF-1 sequence with arginine in place of glutamic acid at position 3, preceded by a 13-residue N-terminal extension. ${SUPPLIED}`,
    source: "https://pubchem.ncbi.nlm.nih.gov/substance/381123731",
  },
  "cjc-1295-ipamorelin": {
    text: `A fixed-ratio blend of two synthetic peptides: CJC-1295 without DAC (modified GRF 1-29), a 29-residue growth hormone–releasing hormone fragment with four amino-acid substitutions, and Ipamorelin, a pentapeptide. ${SUPPLIED}`,
    source: PUBCHEM(56841945),
  },
  "ss-31": {
    text: `SS-31 (elamipretide) is a synthetic tetrapeptide, D-Arg-Dmt-Lys-Phe-NH₂, where Dmt is 2′,6′-dimethyltyrosine. ${SUPPLIED}`,
    source: PUBCHEM(11764719),
  },
  "mots-c": {
    text: `MOTS-c is a 16-residue peptide whose sequence is encoded within the mitochondrial 12S rRNA gene (MT-RNR1). ${SUPPLIED}`,
    source: "https://www.uniprot.org/uniprotkb/A0A0C5B5G6/entry",
  },
  "slu-pp-332": {
    text: `SLU-PP-332 is a synthetic small molecule rather than a peptide: 4-hydroxy-N′-[(E)-naphthalen-2-ylmethylidene]benzohydrazide. ${SUPPLIED}`,
    source: PUBCHEM(5338394),
  },
  "epithalon": {
    text: `Epithalon (also written epitalon) is a synthetic tetrapeptide, Ala-Glu-Asp-Gly. ${SUPPLIED}`,
    source: PUBCHEM(219042),
  },
  "pinealon": {
    text: `Pinealon is a synthetic tripeptide, Glu-Asp-Arg. ${SUPPLIED}`,
    source: PUBCHEM(10273502),
  },
  "dsip": {
    text: `DSIP (delta sleep-inducing peptide) is a nonapeptide, Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu. ${SUPPLIED}`,
    source: PUBCHEM(68816),
  },
  "pt-141": {
    text: `PT-141 (bremelanotide) is a synthetic cyclic heptapeptide, Ac-Nle-cyclo[Asp-His-D-Phe-Arg-Trp-Lys]-OH, closed by a lactam bond between residues 2 and 7 (aspartic acid and lysine). ${SUPPLIED}`,
    source: PUBCHEM(9941379),
  },
  "ghk-cu": {
    text: `GHK-Cu is the tripeptide Gly-His-Lys bound to a copper(II) ion, held by the glycine amino nitrogen, the glycine–histidine amide nitrogen and a histidine ring nitrogen. ${SUPPLIED}`,
    source: "https://www.sciencedirect.com/science/article/pii/S002016930082544X",
  },
  "nad-plus": {
    text: `NAD+ (nicotinamide adenine dinucleotide, oxidized form) is a dinucleotide: an adenine nucleotide and a nicotinamide nucleotide joined through their phosphate groups. It is not a peptide. ${SUPPLIED}`,
    source: PUBCHEM(5892),
  },
  "glutathione": {
    text: `Glutathione (reduced form, GSH) is the tripeptide γ-L-glutamyl-L-cysteinyl-glycine, in which glutamate is linked through its side-chain carboxyl group. ${SUPPLIED}`,
    source: PUBCHEM(124886),
  },
  "bpc-157-tb-500-blend": {
    text: `A fixed-ratio blend of BPC-157 and TB-500, supplied as a lyophilized powder in a single sealed vial.`,
    source: PUBCHEM(9941957),
  },
  "bpc-157-tb-500-ghk-cu": {
    text: `A fixed-ratio blend of BPC-157, TB-500 and GHK-Cu, supplied as a lyophilized powder in a single sealed vial.`,
    source: PUBCHEM(9941957),
  },
  "bpc-157-tb-500-ghk-cu-kpv": {
    text: `A fixed-ratio blend of BPC-157, TB-500, GHK-Cu and KPV, supplied as a lyophilized powder in a single sealed vial.`,
    source: PUBCHEM(9941957),
  },
};
