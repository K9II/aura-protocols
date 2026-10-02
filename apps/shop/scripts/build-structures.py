"""Generate the product-page 3D models (offline; output is committed).

  python -m venv .venv-structures
  .venv-structures/Scripts/pip install -r scripts/requirements-structures.txt   # Windows
  .venv-structures/Scripts/python scripts/build-structures.py

Writes public/structures/<id>.sdf (heavy atoms only) and src/data/catalog-structure.ts.
Sources, in priority order: PubChem's own 3D conformer -> published crystal coordination
(GHK-Cu) -> ESMFold prediction (IGF-1 LR3, a protein) -> RDKit ETKDGv3 + MMFF from PubChem SMILES
or a HELM sequence. Fixed seed, so re-runs are reproducible. Fails loudly on any error.

CJC-1295 (no DAC) is built from HELM. RDKit 2026.3's HELM parser accepts `[dA]` (D-Ala, CIP R)
and `[am]` (C-terminal amide) as written. The result is checked twice: its formula must equal
C152H252N44O42, and its canonical isomeric SMILES (so the D-Ala2 stereo too) must equal
PubChem CID 56841945's, the no-DAC 29-residue amide that the page links to.
"""
import json, sys, time, urllib.request, urllib.parse
from pathlib import Path
from rdkit import Chem, DistanceGeometry as DG
from rdkit.Chem import AllChem, rdDistGeom

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
    ss = sum(1 for b in mol.GetBonds() if b.GetBeginAtom().GetSymbol() == b.GetEndAtom().GetSymbol() == "S")
    print(f"  {mid}: dropped {len(drop)} non-covalent proximity bonds; {ss} disulfides", flush=True)
    return mol

def ghk_cu():
    # Cu(II) bound square-planar to the Gly amino N, the deprotonated Gly-His amide N and a His
    # ring N (Inorg. Chim. Acta 1984). Embed the peptide with the three donors held at square-
    # planar spacing (Cu-N ~2.0 A), then place Cu at the midpoint of the trans N...N pair.
    m = Chem.AddHs(Chem.MolFromSmiles("NCC(=O)[N-][C@@H](Cc1cnc[nH]1)C(=O)N[C@@H](CCCCN)C(=O)[O-]"))
    ring_n = [a.GetIdx() for a in m.GetAtoms() if a.GetSymbol() == "N" and a.GetIsAromatic() and a.GetTotalNumHs() == 0][0]
    bm = rdDistGeom.GetMoleculeBoundsMatrix(m)
    def setb(i, j, lo, hi):
        i, j = min(i, j), max(i, j); bm[j][i] = lo; bm[i][j] = hi
    setb(0, 4, 2.7, 2.95); setb(4, ring_n, 2.7, 2.95); setb(0, ring_n, 3.8, 4.1)
    if not DG.DoTriangleSmoothing(bm): raise RuntimeError("ghk-cu: bounds smoothing failed")
    p = AllChem.ETKDGv3(); p.randomSeed = SEED; p.useRandomCoords = True; p.SetBoundsMat(bm)
    if AllChem.EmbedMolecule(m, p) != 0: raise RuntimeError("ghk-cu: embedding failed")
    conf = m.GetConformer()
    cu_pos = (conf.GetAtomPosition(0) + conf.GetAtomPosition(ring_n)) * 0.5
    for n in (0, 4, ring_n):
        d = (conf.GetAtomPosition(n) - cu_pos).Length()
        if not 1.8 <= d <= 2.4: raise RuntimeError(f"ghk-cu: Cu-N {d:.2f} A out of range")
    rw = Chem.RWMol(Chem.RemoveHs(m))
    cu = rw.AddAtom(Chem.Atom(29)); rw.GetAtomWithIdx(cu).SetFormalCharge(2)
    rw.GetConformer().SetAtomPosition(cu, cu_pos)
    return rw.GetMol()

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = {}
    for mid, spec in MOLECULES.items():
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
