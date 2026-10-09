"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { receiveLotAction } from "@/app/admin/catalog/actions";
import { isDiscrepancy, METHODS } from "@/lib/catalog-ops/rules";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { Icon } from "@/components/admin/ui";
import CoaUpload from "@/components/admin/catalog/CoaUpload";
import { prefillTotal, supplierOptions } from "@/lib/wholesale/runs";
import { usd } from "@/lib/html";

export type DraftLot = {
  id: string; lotNumber: string; purity: string; method: string; testedOn: string; ordered: string; counted: string; damaged: string; note: string; coaPath: string;
  supplier: string; cost: string; testCost: string; freight: string; labels: string;
};
const EMPTY: Omit<DraftLot, "id"> = { lotNumber: "", purity: "", method: "HPLC+MS", testedOn: "", ordered: "", counted: "", damaged: "0", note: "", coaPath: "", supplier: "", cost: "", testCost: "", freight: "", labels: "" };
const OTHER = "__other";

// prices: this strength's supplier box prices (supplier_prices, from AIOS);
// defaults: lab fee per lot, freight per box, labels per vial (AIOS rates).
// They pre-fill the cost fields until the owner types their own.
export default function ReceiveLotDialog({ slug, variantId, title, draft, small, prices = {}, defaults }: {
  slug: string; variantId: string; title: string; draft?: DraftLot; small?: boolean; prices?: Record<string, number>;
  defaults?: { testCents: number; inboundPerBoxCents: number; labelPerVialCents: number };
}) {
  const testCents = defaults?.testCents;
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(receiveLotAction, null);
  const initial = () => draft ?? { id: "", ...EMPTY, testCost: testCents != null ? (testCents / 100).toFixed(testCents % 100 ? 2 : 0) : "" };
  const [v, setV] = useState(initial);
  const options = supplierOptions(draft?.supplier ? [draft.supplier] : [], Object.keys(prices)).options;
  const [other, setOther] = useState(!!draft?.supplier && !options.includes(draft.supplier));
  // The cost follows supplier box price × boxes until the owner types their own.
  const [costTyped, setCostTyped] = useState<string | null>(draft?.cost ? draft.cost : null);
  const [freightTyped, setFreightTyped] = useState<string | null>(draft?.freight ? draft.freight : null);
  const [labelsTyped, setLabelsTyped] = useState<string | null>(draft?.labels ? draft.labels : null);
  // Two dialogs can sit on the same product page (one strength per card, plus
  // a separate "Receive a lot" vs "Edit draft" trigger for the same strength)
  // — scope every field id so their labels never collide.
  const scope = `${slug}-${variantId}${draft ? `-${draft.id}` : ""}`;
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      setV(initial()); setCostTyped(null); setFreightTyped(null); setLabelsTyped(null); setOther(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only reacts to a fresh action result
  }, [state]);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s));
  const ordered = n(v.ordered), counted = n(v.counted), damaged = n(v.damaged || "0");
  const known = [ordered, counted, damaged].every(Number.isInteger);
  const disc = known && isDiscrepancy(ordered, counted, damaged);
  const sellable = known ? counted - damaged : null;
  const purity = n(v.purity);
  const lowPurity = Number.isFinite(purity) && purity < PURITY_FLOOR_PCT;
  const canLive = !!v.coaPath && known && (!disc || !!v.note.trim()) && (sellable ?? 0) > 0;
  const fe = state?.fieldErrors ?? {};
  const boxes = Number.isInteger(ordered) && ordered > 0 ? Math.ceil(ordered / 10) : 0;
  const boxCents = !other && v.supplier ? prices[v.supplier] : undefined;
  const cost = costTyped ?? prefillTotal(boxCents, boxes);
  const freight = freightTyped ?? prefillTotal(defaults?.inboundPerBoxCents, boxes);
  const labelVials = Number.isInteger(counted) && counted > 0 ? counted : (Number.isInteger(ordered) ? ordered : 0);
  const labels = labelsTyped ?? prefillTotal(defaults?.labelPerVialCents, labelVials);
  return (
    <>
      <button type="button" className={`a-btn${small ? " sm" : ""}`} onClick={() => ref.current?.showModal()}>
        {draft ? <><Icon name="edit" />Edit</> : <><Icon name="plus" />Receive <span className="a-only-desk">a lot</span></>}
      </button>
      <dialog ref={ref} className="a-modal wide" aria-labelledby={`recv-${scope}`}>
        <form action={action}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="variantId" value={variantId} />
          {draft && <input type="hidden" name="lotId" value={draft.id} />}
          <input type="hidden" name="coaPath" value={v.coaPath} />
          {!other && <input type="hidden" name="supplier" value={v.supplier} />}
          <div className="a-modal-h"><h2 id={`recv-${scope}`}>{draft ? "Edit draft lot" : "Receive a lot"} · {title}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-row3">
              <div className="a-fld"><label htmlFor={`r-lot-${scope}`}>Lot number</label><div className="a-input mono"><input id={`r-lot-${scope}`} name="lotNumber" value={v.lotNumber} onChange={set("lotNumber")} required /></div>{fe.lotNumber && <div className="a-err" role="alert">{fe.lotNumber}</div>}</div>
              <div className="a-fld"><label htmlFor={`r-purity-${scope}`}>Purity</label><div className={`a-input${lowPurity ? " warn" : ""}`}><input id={`r-purity-${scope}`} name="purity" inputMode="decimal" value={v.purity} onChange={set("purity")} required /><span className="affix">%</span></div>
                {lowPurity && <div className="a-warnline"><Icon name="warn" />Below the {PURITY_FLOOR_PCT}% shown on the site.</div>}{fe.purity && <div className="a-err" role="alert">{fe.purity}</div>}</div>
              <div className="a-fld"><label htmlFor={`r-method-${scope}`}>Method</label><div className="a-input"><select id={`r-method-${scope}`} name="method" value={v.method} onChange={set("method")} style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                {METHODS.map((m) => <option key={m} value={m}>{m === "HPLC+MS" ? "HPLC + MS" : m}</option>)}</select></div></div>
            </div>
            <div className="a-row3">
              <div className="a-fld"><label htmlFor={`r-tested-${scope}`}>Tested on</label><div className="a-input"><input id={`r-tested-${scope}`} name="testedOn" type="date" value={v.testedOn} onChange={set("testedOn")} required /></div>{fe.testedOn && <div className="a-err" role="alert">{fe.testedOn}</div>}</div>
              <div style={{ gridColumn: "span 2" }}><CoaUpload idSuffix={scope} lotNumber={v.lotNumber} path={v.coaPath} onPath={(p) => setV({ ...v, coaPath: p })} error={fe.coa} /></div>
            </div>
            <div className="a-recv">
              <div className="h">Receiving check {disc && <span className="a-chip c-disc">Discrepancy</span>}</div>
              <div className="a-row3">
                <div className="a-fld"><label htmlFor={`r-ordered-${scope}`}>Ordered <span className="muted" style={{ fontWeight: 400 }}>(invoice)</span></label><div className="a-input"><input id={`r-ordered-${scope}`} name="ordered" inputMode="numeric" value={v.ordered} onChange={set("ordered")} required /></div>{fe.ordered && <div className="a-err" role="alert">{fe.ordered}</div>}</div>
                <div className="a-fld"><label htmlFor={`r-counted-${scope}`}>Counted</label><div className={`a-input${disc ? " warn" : ""}`}><input id={`r-counted-${scope}`} name="counted" inputMode="numeric" value={v.counted} onChange={set("counted")} required /></div>{fe.counted && <div className="a-err" role="alert">{fe.counted}</div>}</div>
                <div className="a-fld"><label htmlFor={`r-damaged-${scope}`}>Damaged</label><div className={`a-input${damaged > 0 ? " warn" : ""}`}><input id={`r-damaged-${scope}`} name="damaged" inputMode="numeric" value={v.damaged} onChange={set("damaged")} /></div>{fe.damaged && <div className="a-err" role="alert">{fe.damaged}</div>}</div>
              </div>
              {disc && <div className="a-fld" style={{ marginTop: 12 }}><label htmlFor={`r-note-${scope}`}>What happened <span className="muted" style={{ fontWeight: 400 }}>· required when counts don&apos;t match</span></label>
                <textarea id={`r-note-${scope}`} name="note" className="a-textarea" maxLength={500} value={v.note} onChange={set("note")} required />{fe.note && <div className="a-err" role="alert">{fe.note}</div>}</div>}
              <div className="a-row3" style={{ marginTop: 12 }}>
                <div className="a-fld"><label htmlFor={`r-sup-${scope}`}>Supplier</label><select id={`r-sup-${scope}`} className="a-select" value={other ? OTHER : v.supplier} onChange={(e) => { const s = e.target.value; setOther(s === OTHER); setV({ ...v, supplier: s === OTHER ? "" : s }); setCostTyped(null); }}>
                  <option value="">Choose…</option>
                  {options.map((s) => <option key={s} value={s}>{s}{prices[s] ? ` · ${usd(prices[s])}/box` : ""}</option>)}
                  <option value={OTHER}>Other…</option></select>
                  {other && <div className="a-input" style={{ marginTop: 6 }}><input name="supplier" aria-label="New supplier name" placeholder="Supplier name" maxLength={80} value={v.supplier} onChange={set("supplier")} /></div>}
                  {fe.supplier && <div className="a-err" role="alert">{fe.supplier}</div>}</div>
                <div className="a-fld"><label htmlFor={`r-cost-${scope}`}>Paid to the supplier</label><div className="a-input"><span className="affix l">$</span><input id={`r-cost-${scope}`} name="cost" inputMode="decimal" value={cost} onChange={(e) => setCostTyped(e.target.value)} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{boxCents && boxes
                    ? <>{usd(boxCents)} a box × {boxes} = {usd(boxCents * boxes)} (AIOS){costTyped !== null ? <> · <button type="button" className="a-linkbtn" onClick={() => setCostTyped(null)}>use it</button></> : ""}</>
                    : v.supplier && !other && boxes ? <>No saved price for {v.supplier} — enter the total.</>
                    : <>Total for the {boxes || "—"} box{boxes === 1 ? "" : "es"} ordered.</>}</div>
                  {fe.cost && <div className="a-err" role="alert">{fe.cost}</div>}</div>
                <div className="a-fld"><label htmlFor={`r-test-${scope}`}>Lab test fee</label><div className="a-input"><span className="affix l">$</span><input id={`r-test-${scope}`} name="testCost" inputMode="decimal" value={v.testCost} onChange={set("testCost")} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>For this lot&apos;s certificate.</div>
                  {fe.testCost && <div className="a-err" role="alert">{fe.testCost}</div>}</div>
              </div>
              <div className="a-row3" style={{ marginTop: 12 }}>
                <div className="a-fld"><label htmlFor={`r-fr-${scope}`}>Shipping &amp; customs</label><div className="a-input"><span className="affix l">$</span><input id={`r-fr-${scope}`} name="freight" inputMode="decimal" value={freight} onChange={(e) => setFreightTyped(e.target.value)} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{defaults && boxes && freightTyped === null ? <>{usd(defaults.inboundPerBoxCents)} a box × {boxes} (AIOS) — change it to the real bill</> : <>Freight and duty to get this lot to you.</>}</div>
                  {fe.freight && <div className="a-err" role="alert">{fe.freight}</div>}</div>
                <div className="a-fld"><label htmlFor={`r-lb-${scope}`}>Labels</label><div className="a-input"><span className="affix l">$</span><input id={`r-lb-${scope}`} name="labels" inputMode="decimal" value={labels} onChange={(e) => setLabelsTyped(e.target.value)} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{defaults && labelVials && labelsTyped === null ? <>{usd(defaults.labelPerVialCents)} a vial × {labelVials} (AIOS)</> : <>Printed labels for its vials.</>}</div>
                  {fe.labels && <div className="a-err" role="alert">{fe.labels}</div>}</div>
                <div />
              </div>
              <div className="sum"><span>Sellable <b>{sellable ?? "—"}</b></span>{known && <span className="muted">= {counted} counted − {damaged} damaged</span>}{disc && <span className="muted" style={{ marginLeft: "auto" }}>You&apos;ll get an email about the shortfall</span>}</div>
            </div>
            <ul className="a-checks">
              <li className={v.coaPath ? "" : "no"}><Icon name="check" />Certificate attached</li>
              <li className={known && (!disc || v.note.trim()) ? "" : "no"}><Icon name="check" />Receiving check complete{disc ? " (discrepancy explained)" : ""}</li>
              <li className={Number.isFinite(purity) && !lowPurity ? "" : "no"}><Icon name="check" />Purity at or above the {PURITY_FLOOR_PCT}% shown on the site</li>
            </ul>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><span className="muted a-only-desk" style={{ fontSize: 12 }}>Logged as received by you, now</span>
            <div className="r">
              <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" name="intent" value="draft" className="a-btn" disabled={pending}>Save as draft</button>
              <button type="submit" name="intent" value="live" className="a-btn primary" disabled={pending || !canLive}>Save and put live</button>
            </div>
          </div>
        </form>
      </dialog>
      {state?.ok && <span className="a-ok" role="status">{state.ok}{state.warning ? ` ${state.warning}` : ""}</span>}
    </>
  );
}
