"use client";
import { useEffect, useRef, useState } from "react";
import CoaUpload from "@/components/admin/catalog/CoaUpload";
import LabDialog from "@/components/admin/catalog/LabDialog";
import { Icon } from "@/components/admin/ui";
import { readCertificateAction } from "@/app/admin/catalog/actions";
import { METHODS } from "@/lib/catalog-ops/rules";
import { certVerifyUrl, failedTests, measuredPct, TEST_KEYS, TEST_LABEL, type TestKey, type TestResult } from "@/lib/coa/rules";
import { EMPTY_CERT, FILLED_TAIL, filledHead, lotMismatchParts, mergeReading, type CertDraft, type FillKey } from "@/lib/coa/reading";
export { EMPTY_CERT, type CertDraft };

export type LabOption = { id: string; name: string; city: string | null; verify_url_template: string | null; verify_hint?: string | null };
const RESULT_LABEL: Record<TestResult, string> = { pass: "Pass", fail: "Fail", not_tested: "Not tested" };
type ReadState = { kind: "idle" } | { kind: "busy" } | { kind: "done"; n: number } | { kind: "err" };
const NOTHING_FILLED = "Nothing to fill from the PDF. Check it against the form.";

// The certificate block shared by Add/Edit certificate and Receive a lot.
// Posts flat fields: labId, reportNumber, verifyCode, testedOn, purity, method,
// measured, coaPath, certNote, result, test_<key>. Only the owner sets the
// result; a failed test is flagged here, never applied. Attaching a PDF reads
// it (readCertificateAction) and fills only empty fields, marked "from PDF".
export default function CertificateFields({ idSuffix, lotNumber, strength, labs, initial, fieldErrors = {}, onChange, productNames = [], canAddLab = false }: {
  idSuffix: string; lotNumber: string; strength: string; labs: LabOption[]; initial: CertDraft;
  fieldErrors?: Record<string, string>; onChange?: (v: CertDraft) => void;
  productNames?: string[]; canAddLab?: boolean;
}) {
  const [v, setV] = useState(initial);
  // The draft as of the last edit: a read that answers late merges into this, not the draft it started from.
  const latest = useRef(initial);
  const [filled, setFilled] = useState<Set<FillKey>>(new Set());
  const [read, setRead] = useState<ReadState>({ kind: "idle" });
  const [unknownLab, setUnknownLab] = useState<{ name: string; city: string | null } | null>(null);
  const [mismatch, setMismatch] = useState<{ report: string; ours: string } | null>(null);
  const readSeq = useRef(0);
  const pendingLab = useRef<string | null>(null);
  const put = (next: CertDraft) => { latest.current = next; setV(next); onChange?.(next); };
  const unmark = (k: FillKey) => setFilled((f) => { if (!f.has(k)) return f; const n = new Set(f); n.delete(k); return n; });
  // Handlers only (they read the ref): editing a field drops its "from PDF" mark.
  const edit = (k: keyof Omit<CertDraft, "tests">, value: string) => { put({ ...latest.current, [k]: value }); unmark(k as FillKey); };
  const setTest = (k: TestKey, r: TestResult) => { put({ ...latest.current, tests: { ...latest.current.tests, [k]: r } }); unmark(k); };

  // A lab added from the "not in your labs list" note: select it once the labs
  // list includes it (the owner chose it, so it carries no "from PDF" mark).
  const pickPendingLab = (list: LabOption[]) => {
    const name = pendingLab.current?.toLowerCase();
    const hit = name ? list.find((l) => l.name.toLowerCase() === name) : undefined;
    if (!hit) return;
    pendingLab.current = null;
    setUnknownLab(null);
    if (latest.current.labId === "") put({ ...latest.current, labId: hit.id });
  };
  useEffect(() => {
    pickPendingLab(labs);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reacts to a refreshed labs list
  }, [labs]);

  // Replace starts: forget the old PDF's marks, note and warning, and void its pending read.
  const startUpload = () => {
    readSeq.current++;
    setFilled(new Set()); setUnknownLab(null); setMismatch(null); setRead({ kind: "idle" });
  };
  async function readPdf(path: string) {
    const seq = ++readSeq.current;
    setRead({ kind: "busy" }); setFilled(new Set()); setMismatch(null); setUnknownLab(null);
    let res: Awaited<ReturnType<typeof readCertificateAction>>;
    try { res = await readCertificateAction(lotNumber, path); } catch { res = { error: "unread" }; }
    if (seq !== readSeq.current) return;   // an answer for a PDF that has since been replaced
    if ("error" in res) return setRead({ kind: "err" });
    const m = mergeReading(latest.current, res.reading, labs);
    put(m.draft);
    setFilled(m.filled);
    setUnknownLab(m.unknownLab);
    // Without the product's names there's nothing to compare against: no warning.
    setMismatch(productNames.length ? lotMismatchParts(res.reading, { names: productNames, strength, lotNumber }) : null);
    setRead({ kind: "done", n: m.filled.size });
  }

  const id = (k: string) => `cert-${k}-${idSuffix}`;
  const lab = labs.find((l) => l.id === v.labId);
  const link = lab && v.reportNumber.trim() ? certVerifyUrl(lab.verify_url_template, v.reportNumber.trim(), v.verifyCode.trim() || null) : null;
  const pct = measuredPct(v.measured.trim() ? Number(v.measured) : null, strength);
  const failedNames = failedTests(v.tests);
  const failed = v.result === "fail";
  const err = (k: string) => fieldErrors[k] && <div className="a-err" role="alert">{fieldErrors[k]}</div>;
  const mark = (k: FillKey) => filled.has(k) && <span className="a-pdfmark">from PDF</span>;
  const pdf = (k: FillKey, base: string) => (filled.has(k) ? `${base} pdf` : base);
  return (
    <>
      <div className="a-pdftop" data-names={productNames.join("|")} data-addlab={canAddLab ? "1" : "0"}>
        <input type="hidden" name="coaPath" value={v.coaPath} />
        <CoaUpload idSuffix={`cert-${idSuffix}`} lotNumber={lotNumber} path={v.coaPath} error={fieldErrors.coa}
          help="Attach it first. The store reads it and fills in what it finds."
          onStart={startUpload} onPath={(p) => { put({ ...latest.current, coaPath: p }); void readPdf(p); }} />
        {/* One live region that stays mounted, so screen readers announce each change. */}
        <div role="status" aria-live="polite">
          {read.kind === "busy" && <div className="a-read busy">Reading the PDF… <span className="muted">you can keep typing</span></div>}
          {read.kind === "done" && <div className="a-read">ⓘ {read.n > 0 ? <span><b>{filledHead(read.n)}</b>{FILLED_TAIL}</span> : <span>{NOTHING_FILLED}</span>}</div>}
          {read.kind === "err" && <div className="a-read err">Couldn&apos;t read this PDF. Fill it in by hand.</div>}
        </div>
      </div>
      <div className="a-row3">
        <div className="a-fld"><label htmlFor={id("lab")}>Lab{mark("labId")}</label>
          <select id={id("lab")} name="labId" className={pdf("labId", "a-select")} value={v.labId} onChange={(e) => edit("labId", e.target.value)}>
            <option value="">Pick the lab</option>
            {labs.map((l) => <option key={l.id} value={l.id}>{l.name}{l.city ? ` — ${l.city}` : ""}</option>)}
          </select>
          {unknownLab && v.labId === "" && (
            <div className="a-labnote"><span>This report is from <b>{unknownLab.name}{unknownLab.city ? `, ${unknownLab.city}` : ""}</b>. It isn&apos;t in your labs list.</span>
              {canAddLab && <LabDialog key={unknownLab.name} portal initial={unknownLab} triggerLabel="Add lab" onSaved={(n) => { pendingLab.current = n; pickPendingLab(labs); }} />}</div>
          )}
          {err("labId")}</div>
        <div className="a-fld"><label htmlFor={id("rep")}>Report number{mark("reportNumber")}</label><div className={pdf("reportNumber", "a-input mono")}><input id={id("rep")} name="reportNumber" value={v.reportNumber} onChange={(e) => edit("reportNumber", e.target.value)} /></div>{err("reportNumber")}
          <label htmlFor={id("vcode")} style={{ display: "block", marginTop: 10 }}>Verify code{mark("verifyCode")} <span className="muted" style={{ fontWeight: 400 }}>· optional, blank uses the report number</span></label>
          <div className={pdf("verifyCode", "a-input mono")}><input id={id("vcode")} name="verifyCode" value={v.verifyCode} onChange={(e) => edit("verifyCode", e.target.value)} /></div>
          {lab?.verify_hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{lab.verify_hint}</div>}
          {err("verifyCode")}</div>
        <div className="a-fld"><label htmlFor={id("date")}>Tested on{mark("testedOn")}</label><div className={pdf("testedOn", "a-input")}><input id={id("date")} name="testedOn" type="date" value={v.testedOn} onChange={(e) => edit("testedOn", e.target.value)} /></div>{err("testedOn")}</div>
      </div>
      <div className="a-row3">
        <div className="a-fld"><label htmlFor={id("pur")}>Purity{mark("purity")} <span className="muted" style={{ fontWeight: 400 }}>· blank if not on this report</span></label><div className={pdf("purity", "a-input")}><input id={id("pur")} name="purity" inputMode="decimal" value={v.purity} onChange={(e) => edit("purity", e.target.value)} /><span className="affix">%</span></div>{err("purity")}</div>
        <div className="a-fld"><label htmlFor={id("meth")}>Method{mark("method")}</label><select id={id("meth")} name="method" className={pdf("method", "a-select")} value={v.method} onChange={(e) => edit("method", e.target.value)}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select>{err("method")}</div>
        <div className="a-fld"><label htmlFor={id("mg")}>Measured amount{mark("measured")} <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><div className={pdf("measured", "a-input")}><input id={id("mg")} name="measured" inputMode="decimal" value={v.measured} onChange={(e) => edit("measured", e.target.value)} /><span className="affix">mg</span></div>
          {pct !== null && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>of {strength} on the label · {pct}%</div>}{err("measured")}</div>
      </div>
      <div className="a-recv">
        <div className="h">Tests on this report</div>
        <div className="a-testgrid">
          {TEST_KEYS.map((k) => (
            <div key={k}><span>{TEST_LABEL[k]}{mark(k)}</span>
              <input type="hidden" name={`test_${k}`} value={v.tests[k]} />
              <div className={pdf(k, "a-seg2")} role="group" aria-label={TEST_LABEL[k]}>
                {(["pass", "fail", "not_tested"] as const).map((r) => (
                  <button key={r} type="button" aria-label={`${TEST_LABEL[k]}: ${RESULT_LABEL[r]}`} aria-pressed={v.tests[k] === r} className={v.tests[k] === r ? "on" : undefined}
                    onClick={() => setTest(k, r)}>{RESULT_LABEL[r]}</button>
                ))}
              </div></div>
          ))}
        </div>
        {err("tests")}
        {failedNames.length > 0 && <div className="a-flag" role="alert"><Icon name="warn" />{failedNames.join(", ")} failed on this report. Review it, then set the Result.</div>}
        {/* Word-for-word the same sentence as lib/coa/reading.ts's lotMismatch (still used by tests) — bolded here, plain there. */}
        {mismatch && <div className="a-lotwarn" role="alert">⚠ This report is for <b>{mismatch.report}</b>. You&apos;re adding it to <b>{mismatch.ours}</b>. Check you attached the right PDF.</div>}
        <div className="a-result">
          <span>Result</span>
          <input type="hidden" name="result" value={v.result} />
          <div className="a-seg2" role="group" aria-label="Result">
            <button type="button" aria-label="Result: Pass" aria-pressed={v.result === "pass"} className={v.result === "pass" ? "on" : undefined} onClick={() => put({ ...latest.current, result: "pass" })}>Pass</button>
            <button type="button" aria-label="Result: Failed" aria-pressed={failed} className={failed ? "on bad" : undefined} onClick={() => put({ ...latest.current, result: "fail" })}>Failed</button>
          </div>
          <span className="muted">{failed ? "Marked Failed — say why below." : v.result === "pass" && failedNames.length ? "Marked Pass although a test failed — it saves with a warning." : "Your call: Pass, or Failed (for example a short fill)."}</span>
        </div>
        {err("result")}
        <div className="a-fld" style={{ marginTop: 10 }}><label htmlFor={id("note")}>{failed ? "What failed" : "Note"} <span className="muted" style={{ fontWeight: 400 }}>· customers can see it</span></label>
          <textarea id={id("note")} name="certNote" className="a-textarea" maxLength={500} value={v.certNote} onChange={(e) => edit("certNote", e.target.value)} required={failed} />{err("certNote")}</div>
      </div>
      {link && <div className="a-verify">Verify link · <a href={link} target="_blank" rel="noopener noreferrer">{link.replace(/^https:\/\//, "")} <Icon name="ext" /></a> <span className="muted">— open it once to check it shows the lab&apos;s copy</span></div>}
    </>
  );
}
