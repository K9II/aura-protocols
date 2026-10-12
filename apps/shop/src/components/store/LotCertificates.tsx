import Link from "next/link";
import type { PublicCert } from "@/data/catalog";
import { NOT_RECORDED_LAB } from "@/lib/coa/rules";

// Product page (approved mock c5): the certificates of the lot currently shipping
// for this compound, grouped by lot (a product can have more than one strength
// shipping at once, each its own lot). Same visibility rules as the library —
// `certs` is already the shown set for this slug, filtered here to shipping only.
const TEST_COLS = [
  ["identity", "Identity"],
  ["endotoxin", "Endotoxin"],
  ["sterility", "Sterility"],
  ["heavy_metals", "Metals"],
  ["fentanyl", "Fentanyl"],
] as const;
const MARK = { pass: "✓", fail: "✕", not_tested: "—" } as const;
const monthDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function LotCertificates({ certs }: { certs: PublicCert[] }) {
  const shipping = certs.filter((c) => c.shipping);
  if (!shipping.length) return null;

  const groups = new Map<string, PublicCert[]>();
  for (const c of shipping) {
    const g = groups.get(c.lot);
    if (g) g.push(c); else groups.set(c.lot, [c]);
  }

  return (
    <>
      {[...groups.entries()].map(([lot, rows]) => {
        const anyMeasured = rows.some((c) => c.measuredMg != null);
        const anyFailed = rows.some((c) => TEST_COLS.some(([k]) => c.tests[k] === "fail"));
        const isoLabs = [...new Set(rows.filter((c) => c.labIso).map((c) => c.labName))];
        return (
          <div key={lot}>
            <p className="s-micro" style={{ color: "var(--ink-soft)" }}>Certificates · {rows[0].strength} · lot {lot} · on sale now</p>
            <div className="s-rec-table">
              <table>
                <thead>
                  <tr>
                    <th>Lab</th><th>Report</th><th>Tested</th><th>Purity</th>
                    {anyMeasured && <th>Measured</th>}
                    {TEST_COLS.map(([k, label]) => <th key={k}>{label}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>{c.labName === NOT_RECORDED_LAB ? "Lab not recorded" : c.labName}{c.failed && <> · <span className="s-cert-failed">Failed</span></>}</td>
                      <td>{c.reportNumber}</td>
                      <td>{monthDay(c.testedOn)}</td>
                      <td className={c.purityPct == null ? "s-nt" : undefined}>{c.purityPct != null ? `${c.purityPct}% · ${c.method}` : "—"}</td>
                      {anyMeasured && (
                        <td className={c.measuredMg == null ? "s-nt" : undefined}>
                          {c.measuredMg != null ? `${c.measuredMg} mg${c.measuredPct != null ? ` · ${c.measuredPct}%` : ""}` : "—"}
                        </td>
                      )}
                      {TEST_COLS.map(([k]) => {
                        const r = c.tests[k];
                        return <td key={k} className={r === "pass" ? "s-ok" : r === "fail" ? "s-bad" : "s-nt"}>{MARK[r]}</td>;
                      })}
                      <td>
                        <a className="s-cert-link" href={c.coaFile} target="_blank" rel="noopener noreferrer">Open</a>
                        {c.verifyUrl && <> · <a className="s-cert-link" href={c.verifyUrl} target="_blank" rel="noopener noreferrer">Verify ↗</a></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="s-micro" style={{ color: "var(--ink-soft)", marginTop: 10 }}>
              ✓ Pass{anyFailed ? " · ✕ Fail" : ""} · — Not tested{isoLabs.map((l) => ` · ${l}: tested by an ISO/IEC 17025-accredited US lab`).join("")} · <Link href="/coa">All certificates →</Link>
            </p>
            {rows.filter((c) => c.failed && c.note).map((c) => (
              <p key={c.id} className="s-micro" style={{ color: "var(--specimen)", marginTop: 4 }}>Failed · {c.reportNumber}: {c.note}</p>
            ))}
          </div>
        );
      })}
    </>
  );
}
