"use client";
import { useState } from "react";
import CoaUpload from "@/components/admin/catalog/CoaUpload";
import { Icon } from "@/components/admin/ui";
import { METHODS } from "@/lib/catalog-ops/rules";
import { certVerifyUrl, failedTests, measuredPct, TEST_KEYS, TEST_LABEL, type TestKey, type TestResult } from "@/lib/coa/rules";

export type LabOption = { id: string; name: string; city: string | null; verify_url_template: string | null; verify_hint?: string | null };
export type CertDraft = {
  labId: string; reportNumber: string; verifyCode: string; testedOn: string; purity: string; method: string; measured: string; coaPath: string; certNote: string;
  result: "" | "pass" | "fail"; tests: Record<TestKey, TestResult>;
};
export const EMPTY_CERT: CertDraft = {
  labId: "", reportNumber: "", verifyCode: "", testedOn: "", purity: "", method: "HPLC+MS", measured: "", coaPath: "", certNote: "", result: "",
  tests: { identity: "not_tested", endotoxin: "not_tested", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" },
};
const RESULT_LABEL: Record<TestResult, string> = { pass: "Pass", fail: "Fail", not_tested: "Not tested" };

// The certificate block shared by Add/Edit certificate and Receive a lot.
// Posts flat fields: labId, reportNumber, verifyCode, testedOn, purity, method,
// measured, coaPath, certNote, result, test_<key>. Only the owner sets the
// result; a failed test is flagged here, never applied.
export default function CertificateFields({ idSuffix, lotNumber, strength, labs, initial, fieldErrors = {}, onChange }: {
  idSuffix: string; lotNumber: string; strength: string; labs: LabOption[]; initial: CertDraft;
  fieldErrors?: Record<string, string>; onChange?: (v: CertDraft) => void;
}) {
  const [v, setV] = useState(initial);
  const put = (next: CertDraft) => { setV(next); onChange?.(next); };
  const set = (k: keyof Omit<CertDraft, "tests">) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => put({ ...v, [k]: e.target.value });
  const id = (k: string) => `cert-${k}-${idSuffix}`;
  const lab = labs.find((l) => l.id === v.labId);
  const link = lab && v.reportNumber.trim() ? certVerifyUrl(lab.verify_url_template, v.reportNumber.trim(), v.verifyCode.trim() || null) : null;
  const pct = measuredPct(v.measured.trim() ? Number(v.measured) : null, strength);
  const failedNames = failedTests(v.tests);
  const failed = v.result === "fail";
  const err = (k: string) => fieldErrors[k] && <div className="a-err" role="alert">{fieldErrors[k]}</div>;
  return (
    <>
      <div className="a-row3">
        <div className="a-fld"><label htmlFor={id("lab")}>Lab</label>
          <select id={id("lab")} name="labId" className="a-select" value={v.labId} onChange={set("labId")}>
            <option value="">Pick the lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ""}</option>)}
          </select>{err("labId")}</div>
        <div className="a-fld"><label htmlFor={id("rep")}>Report number</label><div className="a-input mono"><input id={id("rep")} name="reportNumber" value={v.reportNumber} onChange={set("reportNumber")} /></div>{err("reportNumber")}
          <label htmlFor={id("vcode")} style={{ display: "block", marginTop: 10 }}>Verify code <span className="muted" style={{ fontWeight: 400 }}>· optional, blank uses the report number</span></label>
          <div className="a-input mono"><input id={id("vcode")} name="verifyCode" value={v.verifyCode} onChange={set("verifyCode")} /></div>
          {lab?.verify_hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{lab.verify_hint}</div>}
          {err("verifyCode")}</div>
        <div className="a-fld"><label htmlFor={id("date")}>Tested on</label><div className="a-input"><input id={id("date")} name="testedOn" type="date" value={v.testedOn} onChange={set("testedOn")} /></div>{err("testedOn")}</div>
      </div>
      <div className="a-row3">
        <div className="a-fld"><label htmlFor={id("pur")}>Purity <span className="muted" style={{ fontWeight: 400 }}>· blank if not on this report</span></label><div className="a-input"><input id={id("pur")} name="purity" inputMode="decimal" value={v.purity} onChange={set("purity")} /><span className="affix">%</span></div>{err("purity")}</div>
        <div className="a-fld"><label htmlFor={id("meth")}>Method</label><select id={id("meth")} name="method" className="a-select" value={v.method} onChange={set("method")}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>{err("method")}</div>
        <div className="a-fld"><label htmlFor={id("mg")}>Measured amount <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><div className="a-input"><input id={id("mg")} name="measured" inputMode="decimal" value={v.measured} onChange={set("measured")} /><span className="affix">mg</span></div>
          {pct !== null && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>of {strength} on the label · {pct}%</div>}{err("measured")}</div>
      </div>
      <div className="a-recv">
        <div className="h">Tests on this report</div>
        <div className="a-testgrid">
          {TEST_KEYS.map((k) => (
            <div key={k}><span>{TEST_LABEL[k]}</span>
              <input type="hidden" name={`test_${k}`} value={v.tests[k]} />
              <div className="a-seg2" role="group" aria-label={TEST_LABEL[k]}>
                {(["pass", "fail", "not_tested"] as const).map((r) => (
                  <button key={r} type="button" aria-label={`${TEST_LABEL[k]}: ${RESULT_LABEL[r]}`} aria-pressed={v.tests[k] === r} className={v.tests[k] === r ? "on" : undefined}
                    onClick={() => put({ ...v, tests: { ...v.tests, [k]: r } })}>{RESULT_LABEL[r]}</button>
                ))}
              </div></div>
          ))}
        </div>
        {err("tests")}
        {failedNames.length > 0 && <div className="a-flag" role="alert"><Icon name="warn" />{failedNames.join(", ")} failed on this report. Review it, then set the Result.</div>}
        <div className="a-result">
          <span>Result</span>
          <input type="hidden" name="result" value={v.result} />
          <div className="a-seg2" role="group" aria-label="Result">
            <button type="button" aria-label="Result: Pass" aria-pressed={v.result === "pass"} className={v.result === "pass" ? "on" : undefined} onClick={() => put({ ...v, result: "pass" })}>Pass</button>
            <button type="button" aria-label="Result: Failed" aria-pressed={failed} className={failed ? "on bad" : undefined} onClick={() => put({ ...v, result: "fail" })}>Failed</button>
          </div>
          <span className="muted">{failed ? "Marked Failed — say why below." : v.result === "pass" && failedNames.length ? "Marked Pass although a test failed — it saves with a warning." : "Your call: Pass, or Failed (for example a short fill)."}</span>
        </div>
        {err("result")}
        <div className="a-fld" style={{ marginTop: 10 }}><label htmlFor={id("note")}>{failed ? "What failed" : "Note"} <span className="muted" style={{ fontWeight: 400 }}>· customers can see it</span></label>
          <textarea id={id("note")} name="certNote" className="a-textarea" maxLength={500} value={v.certNote} onChange={set("certNote")} required={failed} />{err("certNote")}</div>
      </div>
      <input type="hidden" name="coaPath" value={v.coaPath} />
      <CoaUpload idSuffix={`cert-${idSuffix}`} lotNumber={lotNumber} path={v.coaPath} onPath={(p) => put({ ...v, coaPath: p })} error={fieldErrors.coa} />
      {link && <div className="a-verify">Verify link · <a href={link} target="_blank" rel="noopener noreferrer">{link.replace(/^https:\/\//, "")} <Icon name="ext" /></a> <span className="muted">— open it once to check it shows the lab&apos;s copy</span></div>}
    </>
  );
}
