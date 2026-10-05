"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { receiveLotAction } from "@/app/admin/catalog/actions";
import { isDiscrepancy, METHODS } from "@/lib/catalog-ops/rules";
import { PURITY_FLOOR_PCT } from "@/lib/constants";
import { Icon } from "@/components/admin/ui";
import CoaUpload from "@/components/admin/catalog/CoaUpload";

export type DraftLot = { id: string; lotNumber: string; purity: string; method: string; testedOn: string; ordered: string; counted: string; damaged: string; note: string; coaPath: string };
const EMPTY: Omit<DraftLot, "id"> = { lotNumber: "", purity: "", method: "HPLC+MS", testedOn: "", ordered: "", counted: "", damaged: "0", note: "", coaPath: "" };

export default function ReceiveLotDialog({ slug, variantId, title, draft, small }: { slug: string; variantId: string; title: string; draft?: DraftLot; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(receiveLotAction, null);
  const initial = () => draft ?? { id: "", ...EMPTY };
  const [v, setV] = useState(initial);
  // Two dialogs can sit on the same product page (one strength per card, plus
  // a separate "Receive a lot" vs "Edit draft" trigger for the same strength)
  // — scope every field id so their labels never collide.
  const scope = `${slug}-${variantId}${draft ? `-${draft.id}` : ""}`;
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      setV(initial());
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
  return (
    <>
      <button type="button" className={`a-btn${small ? " sm" : ""}`} onClick={() => ref.current?.showModal()}>
        {draft ? <><Icon name="edit" />Edit</> : small ? <><Icon name="plus" />Receive</> : <><Icon name="plus" />Receive a lot</>}
      </button>
      <dialog ref={ref} className="a-modal wide" aria-labelledby={`recv-${scope}`}>
        <form action={action}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="variantId" value={variantId} />
          {draft && <input type="hidden" name="lotId" value={draft.id} />}
          <input type="hidden" name="coaPath" value={v.coaPath} />
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
