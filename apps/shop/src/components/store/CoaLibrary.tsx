"use client";
import { useMemo, useState } from "react";
import type { PublicCert } from "@/data/catalog";
import CertCard from "@/components/store/CertCard";

export const LIBRARY_PAGE = 12;
const TEST_FILTERS = [["endotoxin", "Endotoxin"], ["sterility", "Sterility"], ["heavy_metals", "Heavy metals"], ["fentanyl", "Fentanyl"]] as const;
type TestFilter = (typeof TEST_FILTERS)[number][0] | "any";
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function CoaLibrary({ certs }: { certs: PublicCert[] }) {
  const [product, setProduct] = useState(""); const [lab, setLab] = useState("");
  const [test, setTest] = useState<TestFilter>("any"); const [shipping, setShipping] = useState(false);
  const [shown, setShown] = useState(LIBRARY_PAGE);
  const products = useMemo(() => [...new Map(certs.map((c) => [c.slug, c.compoundName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [certs]);
  const labs = useMemo(() => [...new Set(certs.map((c) => c.labName))].sort(), [certs]);
  const hits = certs.filter((c) => (!product || c.slug === product) && (!lab || c.labName === lab)
    && (test === "any" || c.tests[test] === "pass") && (!shipping || c.shipping));
  const count = (k: TestFilter) => certs.filter((c) => k === "any" || c.tests[k] === "pass").length;
  const clear = () => { setProduct(""); setLab(""); setTest("any"); setShipping(false); setShown(LIBRARY_PAGE); };
  return (
    <section id="library" className="s-coa-lib" aria-labelledby="coa-lib-h">
      <div className="s-coa-libh"><h2 id="coa-lib-h" className="s-coa-h">The certificate <em>library</em></h2>
        <p className="s-micro">{plural(certs.length, "certificate")} · {plural(new Set(certs.map((c) => c.lot)).size, "lot")} · {plural(labs.length, "lab")}</p></div>
      <div className="s-coa-filters">
        <label className="s-coa-sel"><span className="s-micro">Product</span>
          <select value={product} onChange={(e) => { setProduct(e.target.value); setShown(LIBRARY_PAGE); }}><option value="">All products</option>{products.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></label>
        <label className="s-coa-sel"><span className="s-micro">Lab</span>
          <select value={lab} onChange={(e) => { setLab(e.target.value); setShown(LIBRARY_PAGE); }}><option value="">All labs</option>{labs.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
        <div className="s-coa-tests"><span className="s-micro" id="coa-test-l">Test</span>
          <nav className="s-pills" aria-labelledby="coa-test-l">
            <button type="button" aria-current={test === "any" ? "page" : undefined} onClick={() => { setTest("any"); setShown(LIBRARY_PAGE); }}>Any</button>
            {TEST_FILTERS.map(([k, label]) => <button key={k} type="button" aria-current={test === k ? "page" : undefined} onClick={() => { setTest(k); setShown(LIBRARY_PAGE); }}>{label}<span>{count(k)}</span></button>)}
          </nav></div>
        <label className="s-coa-ship"><input type="checkbox" checked={shipping} onChange={(e) => { setShipping(e.target.checked); setShown(LIBRARY_PAGE); }} /> <span>Currently shipping only</span></label>
      </div>
      {hits.length ? <div className="s-certs">{hits.slice(0, shown).map((c) => <CertCard key={c.id} cert={c} />)}</div>
        : <p>No certificates match. <button type="button" className="s-cert-link" onClick={clear}>Clear the filters.</button></p>}
      {hits.length > shown && <p className="s-coa-next"><button type="button" onClick={() => setShown(shown + LIBRARY_PAGE)}>Show {Math.min(LIBRARY_PAGE, hits.length - shown)} more</button></p>}
    </section>
  );
}
