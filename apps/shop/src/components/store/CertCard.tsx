import type { CSSProperties } from "react";
import type { PublicCert } from "@/data/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";

const TESTS = [["identity", "Identity"], ["endotoxin", "Endotoxin"], ["sterility", "Sterility"], ["heavy_metals", "Heavy metals"], ["fentanyl", "Fentanyl"]] as const;
const MARK = { pass: "✓ Pass", fail: "✕ Fail", not_tested: "Not tested" } as const;
const monthDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const STATUS = { live: null, sold_out: "Sold out", retired: "Retired" } as const;

export default function CertCard({ cert: c, showName = true, head }: { cert: PublicCert; showName?: boolean; head?: string }) {
  const style = { "--cls": CLASS_COLOR[c.chemicalClass as keyof typeof CLASS_COLOR] } as CSSProperties;
  const flag = c.failed ? <span className="s-cert-failed">Failed</span>
    : c.shipping ? <span className="s-cert-ship">Currently shipping</span>
    : <span className="s-cert-old">{STATUS[c.lotStatus] ?? "Not on sale"}</span>;
  return (
    <article className={`s-cert${c.failed ? " s-cert--fail" : ""}`} style={style}>
      <div className="s-cert-top"><span>{head ?? `Lot ${c.lot}`}</span>{flag}</div>
      <div className="s-cert-b">
        {c.labsOnLot > 1 && <p className="s-cert-tag">Re-tested · {c.labsOnLot} labs</p>}
        {showName && <><p className="s-cert-cls"><i />{c.chemicalClass}</p><h3 className="s-cert-name">{c.compoundName} <small>{c.strength}</small></h3></>}
        <div className={`s-cert-figs${c.measuredMg != null ? " three" : ""}`}>
          {c.purityPct != null
            ? <div><b>{c.purityPct}<i>%</i></b><span className="s-micro">Purity · {c.method}</span></div>
            : <div><b className="s-cert-none">—</b><span className="s-micro">No purity on this report</span></div>}
          {c.measuredMg != null && <div><b>{c.measuredMg}<i> mg</i></b><span className="s-micro">Measured{c.measuredPct != null ? ` · ${c.measuredPct}%` : ""}</span></div>}
          <div><b>{monthDay(c.testedOn)}</b><span className="s-micro">Tested {c.testedOn.slice(0, 4)}</span></div>
        </div>
        <ul className="s-cert-tests">{TESTS.map(([k, label]) => (
          <li key={k} className={c.tests[k] === "pass" ? "ok" : c.tests[k] === "fail" ? "bad" : undefined}>{label}<span>{MARK[c.tests[k]]}</span></li>
        ))}</ul>
        {c.note && <p className={c.failed ? "s-cert-note" : "s-cert-corr"}><b>Note</b>{c.note}</p>}
        {c.correction && <p className="s-cert-corr"><b>Correction{c.correctedAt ? ` · ${monthDay(c.correctedAt.slice(0, 10))}` : ""}</b>{c.correction}</p>}
        <div className="s-cert-lab"><b>{c.labName}</b>{c.labCity ? ` · ${c.labCity}` : ""}<small>{c.labIso ? "Tested by an ISO/IEC 17025-accredited US lab" : "Independent US lab"}</small></div>
      </div>
      <div className="s-cert-f">
        <a href={c.coaFile} target="_blank" rel="noopener noreferrer">◇ Open certificate</a>
        {c.verifyUrl && <a href={c.verifyUrl} target="_blank" rel="noopener noreferrer">Verify at lab ↗</a>}
      </div>
    </article>
  );
}
