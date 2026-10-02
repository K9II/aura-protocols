"""Generate the product-page 3D models (offline; output is committed).

  python -m venv .venv-structures
  .venv-structures/Scripts/pip install -r scripts/requirements-structures.txt   # Windows
  .venv-structures/Scripts/python scripts/build-structures.py
  .venv-structures/Scripts/python scripts/build-structures.py --only ghk-cu   # rebuild just these

--only rebuilds the listed molecules and leaves every other .sdf untouched; their entries in
catalog-structure.ts are carried over from the current file, which is still rewritten in full.

Writes public/structures/<id>.sdf (heavy atoms only) and src/data/catalog-structure.ts.
Sources, in priority order: PubChem's own 3D conformer -> published crystal coordination
(GHK-Cu) -> ESMFold prediction (IGF-1 LR3, a protein) -> RDKit ETKDGv3 + MMFF from PubChem SMILES
or a HELM sequence. Fixed seed, so re-runs are reproducible. Fails loudly on any error.

CJC-1295 (no DAC) is built from HELM. RDKit 2026.3's HELM parser accepts `[dA]` (D-Ala, CIP R)
and `[am]` (C-terminal amide) as written. The result is checked twice: its formula must equal
C152H252N44O42, and its canonical isomeric SMILES (so the D-Ala2 stereo too) must equal
PubChem CID 56841945's, the no-DAC 29-residue amide that the page links to.
"""
import argparse, json, math, re, sys, time, urllib.request
from pathlib import Path
from rdkit import Chem, DistanceGeometry as DG
from rdkit.Chem import AllChem, rdDistGeom, rdForceFieldHelpers as FH
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "structures"
TS_OUT = ROOT / "src" / "data" / "catalog-structure.ts"
PUG = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid"
SEED = 7

def pubchem(cid): return f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}"

# id -> how to build it. Single products use their catalog slug as id.
MOLECULES = {
    "bpc-157":      {"label": "BPC-157", "how": "smiles", "cid": 9941957},
    "tb-500":       {"label": "TB-500", "how": "smiles", "cid": 62707662},
    "kpv":          {"label": "KPV", "how": "pubchem3d", "cid": 125672},
    "aod-9604":     {"label": "AOD-9604", "how": "smiles", "cid": 71300630},
    "sermorelin":   {"label": "Sermorelin", "how": "smiles", "cid": 16132413},
    "tesamorelin":  {"label": "Tesamorelin", "how": "smiles", "cid": 16137828},
    "igf-1-lr3":    {"label": "IGF-1 LR3", "how": "esmfold",
                     "sequence": "MFPAMPLSSLFVNGPRTLCGAELVDALQFVCGDRGFYFNKPTGYGSSSRRAPQTGIVDECCFRSCDLRRLEMYCAPLKPAKSA",
                     "ref": "https://pubchem.ncbi.nlm.nih.gov/substance/381123731"},
    "cjc-1295-no-dac": {"label": "CJC-1295 (no DAC)", "how": "helm",
                     "helm": "PEPTIDE1{Y.[dA].D.A.I.F.T.Q.S.Y.R.K.V.L.A.Q.L.S.A.R.K.L.L.Q.D.I.L.S.R.[am]}$$$$",
                     "formula": "C152H252N44O42",
                     "checkCid": 56841945,
                     "ref": "https://pubchem.ncbi.nlm.nih.gov/compound/56841945"},
    "ipamorelin":   {"label": "Ipamorelin", "how": "smiles", "cid": 9831659},
    "ss-31":        {"label": "SS-31", "how": "smiles", "cid": 11764719},
    "mots-c":       {"label": "MOTS-c", "how": "smiles", "cid": 146675088},
    "slu-pp-332":   {"label": "SLU-PP-332", "how": "pubchem3d", "cid": 5338394},
    "epithalon":    {"label": "Epithalon", "how": "pubchem3d", "cid": 219042},
    "pinealon":     {"label": "Pinealon", "how": "smiles", "cid": 10273502},
    "dsip":         {"label": "DSIP", "how": "smiles", "cid": 68816},
    "pt-141":       {"label": "PT-141", "how": "smiles", "cid": 9941379},
    "ghk-cu":       {"label": "GHK-Cu", "how": "ghkcu",
                     "ref": "https://www.sciencedirect.com/science/article/pii/S002016930082544X"},
    "nad-plus":     {"label": "NAD+", "how": "pubchem3d", "cid": 5892},
    "glutathione":  {"label": "Glutathione", "how": "pubchem3d", "cid": 124886},
    # unlisted (pending processor approval) — generated so they're ready if listed
    "semaglutide":  {"label": "Semaglutide", "how": "smiles", "cid": 56843331},
    "tirzepatide":  {"label": "Tirzepatide", "how": "smiles", "cid": 166567236},
    "retatrutide":  {"label": "Retatrutide", "how": "smiles", "cid": 171390338},
    "cagrilintide": {"label": "Cagrilintide", "how": "smiles", "cid": 171397054},
}

# product slug -> panel ids. Singles map to themselves; blends list components.
PANELS = {slug: [slug] for slug in MOLECULES if slug not in ("cjc-1295-no-dac", "ipamorelin")}
PANELS.update({
    "cjc-1295-ipamorelin": ["cjc-1295-no-dac", "ipamorelin"],  # components stay [] in the catalog
    "cagrisema": ["cagrilintide", "semaglutide"],
    "retatrutide-cagrilintide": ["retatrutide", "cagrilintide"],
    "bpc-157-tb-500-blend": ["bpc-157", "tb-500"],
    "bpc-157-tb-500-ghk-cu": ["bpc-157", "tb-500", "ghk-cu"],
    "bpc-157-tb-500-ghk-cu-kpv": ["bpc-157", "tb-500", "ghk-cu", "kpv"],
})

def get(url, data=None):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "aura-build-structures"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read().decode()
        except Exception as e:
            if attempt == 3: raise RuntimeError(f"GET {url} failed: {e}")
            time.sleep(2 * (attempt + 1))

def embed(mol):
    mh = Chem.AddHs(mol)
    p = AllChem.ETKDGv3(); p.randomSeed = SEED; p.useRandomCoords = True; p.maxIterations = 2000
    if AllChem.EmbedMolecule(mh, p) != 0: raise RuntimeError("embedding failed")
    AllChem.MMFFOptimizeMolecule(mh, maxIters=500)
    return Chem.RemoveHs(mh)

def pubchem_smiles(cid):
    js = json.loads(get(f"{PUG}/{cid}/property/SMILES/JSON"))
    return js["PropertyTable"]["Properties"][0]["SMILES"]

def build(mid, spec):
    how = spec["how"]
    if how == "pubchem3d":
        sdf = get(f"{PUG}/{spec['cid']}/record/SDF?record_type=3d")
        mol = Chem.MolFromMolBlock(sdf.split("$$$$")[0], removeHs=False)
        return Chem.RemoveHs(mol), "pubchem-3d", pubchem(spec["cid"])
    if how == "smiles":
        return embed(Chem.MolFromSmiles(pubchem_smiles(spec["cid"]))), "computed", pubchem(spec["cid"])
    if how == "helm":
        mol = Chem.MolFromHELM(spec["helm"])
        if mol is None: raise RuntimeError(f"{mid}: RDKit could not parse the HELM")
        from rdkit.Chem import rdMolDescriptors
        f = rdMolDescriptors.CalcMolFormula(mol)
        if f != spec["formula"]: raise RuntimeError(f"{mid}: formula {f} != {spec['formula']}")
        ref_mol = Chem.MolFromSmiles(pubchem_smiles(spec["checkCid"]))
        if Chem.MolToSmiles(mol) != Chem.MolToSmiles(ref_mol):
            raise RuntimeError(f"{mid}: HELM structure (incl. stereo) != PubChem CID {spec['checkCid']}")
        return embed(mol), "computed", spec["ref"]
    if how == "esmfold":
        pdb = get("https://api.esmatlas.com/foldSequence/v1/pdb/", data=spec["sequence"].encode())
        return pdb_protein(mid, pdb), "predicted", spec["ref"]
    if how == "ghkcu":
        return ghk_cu(), "crystal-modeled", spec["ref"]
    raise RuntimeError(f"{mid}: unknown method {how}")

# IGF-1's disulfides (C6-C48, C18-C61, C47-C52), shifted +13 by the LR3 N-terminal extension.
IGF1_LR3_DISULFIDES = {(19, 61), (31, 74), (60, 65)}

def pdb_protein(mid, pdb):
    # ESMFold PDBs have no CONECT records, so RDKit bonds atoms by distance. Close contacts in the
    # prediction (side-chain clashes, salt bridges, backbone O...N) then become false bonds and
    # break valence. Keep only real covalent bonds: within a residue, the i -> i+1 peptide C-N,
    # and Cys SG-SG disulfides. Everything else is dropped before sanitizing.
    mol = Chem.MolFromPDBBlock(pdb, removeHs=True, sanitize=False)
    if mol is None: raise RuntimeError(f"{mid}: could not read ESMFold PDB")
    rw = Chem.RWMol(mol)
    drop = []
    for b in rw.GetBonds():
        a, c = b.GetBeginAtom().GetPDBResidueInfo(), b.GetEndAtom().GetPDBResidueInfo()
        ra, rc = a.GetResidueNumber(), c.GetResidueNumber()
        if ra == rc: continue
        names = {a.GetName().strip(): ra, c.GetName().strip(): rc}
        if set(names) == {"C", "N"} and names["N"] == names["C"] + 1: continue
        if a.GetName().strip() == c.GetName().strip() == "SG": continue
        drop.append((b.GetBeginAtomIdx(), b.GetEndAtomIdx()))
    for i, j in drop: rw.RemoveBond(i, j)
    mol = rw.GetMol()
    Chem.SanitizeMol(mol)
    ss = {tuple(sorted((b.GetBeginAtom().GetPDBResidueInfo().GetResidueNumber(),
                        b.GetEndAtom().GetPDBResidueInfo().GetResidueNumber())))
          for b in mol.GetBonds() if b.GetBeginAtom().GetSymbol() == b.GetEndAtom().GetSymbol() == "S"}
    if ss != IGF1_LR3_DISULFIDES:
        raise RuntimeError(f"{mid}: disulfides {sorted(ss)} != expected {sorted(IGF1_LR3_DISULFIDES)}")
    print(f"  {mid}: dropped {len(drop)} non-covalent proximity bonds; disulfides {sorted(ss)}", flush=True)
    return mol

def ghk_cu():
    # Cu(II) bound in a square plane by three N donors: the Gly amino N, the deprotonated Gly-His
    # amide N and the His imidazole N-delta1 (N-pi). The fourth equatorial site in the crystal is a
    # carboxylate O of a neighbouring molecule, not modeled (Perkins et al., Inorg. Chim. Acta 1984;
    # Hureau et al., Chem. Eur. J. 2011). The donor ring N is ND1 in the GHK-tag crystal structures
    # PDB 6QUG / 6QUH (Mehr et al., Acta Cryst. D 2020). N-delta1 binding closes a 6-membered chelate
    # ring with the amide N, so the imidazole is the N-epsilon2-H tautomer.
    #
    # Cu is a real atom throughout. Dative N->Cu bonds make the complex one fragment; the bounds
    # matrix is the peptide's own plus a Cu row (Cu-N 1.95-2.05 A, >= 2.9 A to every other heavy
    # atom, square-planar donor spacing with the amino N trans to N-delta1). Of 30 seeded conformers
    # the most planar is kept and relaxed with MMFF94 (Cu as its Cu2+ ion type, electrostatics off)
    # under the same distance restraints, then checked hard.
    pep = Chem.AddHs(Chem.MolFromSmiles("NCC(=O)[N-][C@@H](Cc1c[nH]cn1)C(=O)N[C@@H](CCCCN)C(=O)[O-]"))
    n_amine, n_amide = 0, 4
    nd1 = pep.GetSubstructMatch(Chem.MolFromSmarts("[CH2]-c:[nX2;H0]"))[2]  # ring N bonded to C-gamma
    donors = (n_amine, n_amide, nd1)
    spacing = [(n_amine, n_amide, 2.65, 2.75), (n_amide, nd1, 2.85, 2.95), (n_amine, nd1, 4.0, 4.1)]

    def neighbour_bounds(mol, cu):  # Cu sits where each donor's lone pair points
        for d in donors:
            for nb in mol.GetAtomWithIdx(d).GetNeighbors():
                j = nb.GetIdx()
                if j == cu: continue
                if nb.GetAtomicNum() == 1: yield j, 2.4, 2.7
                elif d == n_amine: yield j, 2.8, 3.0
                elif d == nd1: yield j, 2.98, 3.05
                else: yield j, 2.9, 3.1

    rw = Chem.RWMol(pep)
    cu = rw.AddAtom(Chem.Atom(29)); rw.GetAtomWithIdx(cu).SetFormalCharge(2)
    for d in donors: rw.AddBond(d, cu, Chem.BondType.DATIVE)
    m = rw.GetMol(); m.UpdatePropertyCache(strict=False)
    n = m.GetNumAtoms()
    bm = np.zeros((n, n)); bm[:cu, :cu] = rdDistGeom.GetMoleculeBoundsMatrix(pep)
    def setb(i, j, lo, hi):
        i, j = min(i, j), max(i, j); bm[i][j] = hi; bm[j][i] = lo
    for a in m.GetAtoms():
        i = a.GetIdx()
        if i == cu: continue
        if i in donors: setb(i, cu, 1.95, 2.05)
        elif a.GetAtomicNum() == 1: setb(i, cu, 2.3, 100.0)
        else: setb(i, cu, 2.9, 100.0)
    for j, lo, hi in neighbour_bounds(m, cu): setb(j, cu, lo, hi)
    for i, j, lo, hi in spacing: setb(i, j, lo, hi)
    if not DG.DoTriangleSmoothing(bm): raise RuntimeError("ghk-cu: bounds smoothing failed")
    p = AllChem.ETKDGv3(); p.randomSeed = SEED; p.useRandomCoords = True; p.maxIterations = 2000
    p.SetBoundsMat(bm)
    cids = list(AllChem.EmbedMultipleConfs(m, 30, p))
    if not cids: raise RuntimeError("ghk-cu: embedding failed")

    def pos(conf, i): return np.array(conf.GetAtomPosition(i))
    def out_of_plane(conf):
        a, b, c = (pos(conf, d) for d in donors)
        nrm = np.cross(b - a, c - a); nrm /= np.linalg.norm(nrm)
        return abs(np.dot(pos(conf, cu) - a, nrm))
    best = min(cids, key=lambda c: (out_of_plane(m.GetConformer(c)), c))

    # MMFF94 has a Cu2+ ion type (98) but no Cu bonds: Cu is a free ion held by restraints, and its
    # vdW term keeps every other atom away.
    ion = Chem.RWMol(pep); ci = ion.AddAtom(Chem.Atom(29)); ion.GetAtomWithIdx(ci).SetFormalCharge(2)
    ion = ion.GetMol(); Chem.SanitizeMol(ion)
    conf = Chem.Conformer(n); src = m.GetConformer(best)
    for i in range(n): conf.SetAtomPosition(i, src.GetAtomPosition(i))
    ion.AddConformer(conf, assignId=True)
    mp = FH.MMFFGetMoleculeProperties(ion)
    if mp is None or mp.GetMMFFAtomType(ci) != 98: raise RuntimeError("ghk-cu: MMFF has no Cu2+ type")
    mp.SetMMFFEleTerm(False)
    ff = FH.MMFFGetMoleculeForceField(ion, mp, ignoreInterfragInteractions=False)
    K = 1000.0
    for d in donors: ff.MMFFAddDistanceConstraint(d, ci, False, 1.98, 2.02, K)
    for i, j, lo, hi in spacing: ff.MMFFAddDistanceConstraint(i, j, False, lo, hi, K)
    for j, lo, hi in neighbour_bounds(ion, ci): ff.MMFFAddDistanceConstraint(j, ci, False, lo, hi, K)
    if ff.Minimize(maxIts=5000) != 0: raise RuntimeError("ghk-cu: MMFF did not converge")

    out = Chem.RemoveHs(ion)  # heavy atoms keep their order; Cu stays last
    cu_out = out.GetNumAtoms() - 1
    if out.GetAtomWithIdx(cu_out).GetSymbol() != "Cu": raise RuntimeError("ghk-cu: Cu is not last")
    oc = out.GetConformer(); x = pos(oc, cu_out)
    def dist(i): return float(np.linalg.norm(pos(oc, i) - x))
    for d in donors:
        if not 1.85 <= dist(d) <= 2.15: raise RuntimeError(f"ghk-cu: Cu-N{d} {dist(d):.2f} A outside 1.85-2.15")
    others = [(dist(a.GetIdx()), f"{a.GetSymbol()}{a.GetIdx()}") for a in out.GetAtoms()
              if a.GetIdx() != cu_out and a.GetIdx() not in donors]
    for dd, name in others:
        if dd < 2.6: raise RuntimeError(f"ghk-cu: {name} only {dd:.2f} A from Cu")
    u, v = pos(oc, n_amine) - x, pos(oc, nd1) - x
    trans = math.degrees(math.acos(np.dot(u, v) / np.linalg.norm(u) / np.linalg.norm(v)))
    if trans < 150: raise RuntimeError(f"ghk-cu: trans N-Cu-N {trans:.0f} deg, not square-planar")
    near = min(others)
    print("  ghk-cu: Cu-N amino / amide / His N-delta1 = "
          + " / ".join(f"{dist(d):.2f}" for d in donors)
          + f" A; trans N-Cu-N {trans:.0f} deg; nearest other heavy atom {near[1]} {near[0]:.2f} A", flush=True)
    return out

def existing_entries():
    # The STRUCTURES literal in the current generated file is plain JSON (json.dumps wrote it).
    text = TS_OUT.read_text(encoding="utf-8")
    m = re.search(r"export const STRUCTURES: Record<string, Structure> = (\{.*?\});\n\nexport const STRUCTURE_PANELS",
                  text, re.S)
    if not m: raise RuntimeError(f"--only: could not read STRUCTURES from {TS_OUT}")
    return json.loads(m.group(1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="+", metavar="ID", help="rebuild just these molecule ids")
    args = ap.parse_args()
    only = set(args.only or MOLECULES)
    unknown = only - set(MOLECULES)
    if unknown: raise RuntimeError(f"--only: unknown molecule id(s) {sorted(unknown)}")
    previous = existing_entries() if args.only else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = {}
    for mid, spec in MOLECULES.items():
        if mid not in only:
            if mid not in previous or not (OUT_DIR / f"{mid}.sdf").exists():
                raise RuntimeError(f"--only: no existing entry/file for {mid}; run the full build")
            entries[mid] = previous[mid]
            continue
        t = time.time()
        mol, source, ref = build(mid, spec)
        if mol.GetNumConformers() == 0: raise RuntimeError(f"{mid}: no 3D coordinates")
        (OUT_DIR / f"{mid}.sdf").write_text(Chem.MolToMolBlock(mol) + "$$$$\n", newline="\n")
        elements = sorted({a.GetSymbol() for a in mol.GetAtoms()})
        entries[mid] = {"id": mid, "label": spec["label"], "file": f"/structures/{mid}.sdf", "source": source,
                        "heavyAtoms": mol.GetNumHeavyAtoms(), "elements": elements, "ref": ref}
        if "refLabel" in spec: entries[mid]["refLabel"] = spec["refLabel"]
        print(f"{mid:18} {source:16} {mol.GetNumHeavyAtoms():5} atoms  {time.time() - t:5.1f}s", flush=True)
        time.sleep(0.3)  # PubChem asks for <= 5 requests/s
    for slug, ids in PANELS.items():
        for i in ids:
            if i not in entries: raise RuntimeError(f"panel {slug} -> unknown structure {i}")
    TS_OUT.write_text(
        "// GENERATED by scripts/build-structures.py — do not edit by hand.\n"
        "// RELATIVE IMPORTS ONLY.\n\n"
        'export type StructureSource = "pubchem-3d" | "computed" | "crystal-modeled" | "predicted";\n'
        "export type Structure = { id: string; label: string; file: string; source: StructureSource;\n"
        "  heavyAtoms: number; elements: string[]; ref: string; refLabel?: string };\n\n"
        f"export const STRUCTURES: Record<string, Structure> = {json.dumps(entries, indent=2, ensure_ascii=False)};\n\n"
        f"export const STRUCTURE_PANELS: Record<string, string[]> = {json.dumps(PANELS, indent=2)};\n",
        encoding="utf-8", newline="\n",  # LF on every OS, so re-runs diff cleanly
    )
    print(f"wrote {len(entries)} structures, {len(PANELS)} panel sets")

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print(f"FAILED: {e}", file=sys.stderr); sys.exit(1)
