"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { correctCountAction } from "@/app/admin/catalog/actions";
import { COUNT_REASONS, COUNT_REASON_LABEL } from "@/lib/catalog-ops/rules";
import { Icon } from "@/components/admin/ui";

export default function CorrectCountDialog({ lotId, lotNumber, left, held, sold }: { lotId: string; lotNumber: string; left: number; held: number; sold: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(correctCountAction, null);
  const [dir, setDir] = useState<"remove" | "add">("remove");
  const [vials, setVials] = useState("");
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      setDir("remove");
      setVials("");
      setResetKey((k) => k + 1); // remounts the uncontrolled note field blank
    }
  }, [state]);
  const n = Math.max(0, Math.trunc(Number(vials) || 0));
  const after = dir === "remove" ? left - n : left + n;
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <button type="button" className="a-btn sm" onClick={() => ref.current?.showModal()}>Correct count</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={`cc-${lotId}`}>
        <form action={action}>
          <input type="hidden" name="lotId" value={lotId} />
          <input type="hidden" name="direction" value={dir} />
          <div className="a-modal-h"><h2 id={`cc-${lotId}`}>Correct count · {lotNumber}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-seg2" role="group" aria-label="Remove or add">
              <button type="button" className={dir === "remove" ? "on" : undefined} aria-pressed={dir === "remove"} onClick={() => setDir("remove")}>Remove vials</button>
              <button type="button" className={dir === "add" ? "on" : undefined} aria-pressed={dir === "add"} onClick={() => setDir("add")}>Add vials</button>
            </div>
            <div className="a-row">
              <div className="a-fld"><label htmlFor={`cc-n-${lotId}`}>Vials</label><div className="a-input"><input id={`cc-n-${lotId}`} name="vials" inputMode="numeric" value={vials} onChange={(e) => setVials(e.target.value)} required /></div>{fe.vials && <div className="a-err" role="alert">{fe.vials}</div>}</div>
              <div className="a-fld"><label htmlFor={`cc-r-${lotId}`}>Reason</label><div className="a-input"><select id={`cc-r-${lotId}`} name="reason" defaultValue="damaged" style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                {COUNT_REASONS.map((r) => <option key={r} value={r}>{COUNT_REASON_LABEL[r]}</option>)}</select></div></div>
            </div>
            <div className="a-fld"><label htmlFor={`cc-note-${lotId}`}>Note</label><div className="a-input"><input key={resetKey} id={`cc-note-${lotId}`} name="note" maxLength={300} /></div>
              {fe.note ? <div className="a-err" role="alert">{fe.note}</div> : <div className="help">Reasons: Damaged, Recount, Found, Other (Other needs a note).</div>}</div>
            <div className="a-balance">Left <span className="from">{left}</span><Icon name="arrow" /><span className="to">{Math.max(0, after)}</span><span className="muted" style={{ marginLeft: "auto" }}>{held} held, {sold} sold stay as they are</span></div>
          </div>
          <div className="a-modal-f"><span className="muted a-only-desk" style={{ fontSize: 12 }}>Logged with your name</span>
            <div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending || !n}>{dir === "remove" ? "Remove" : "Add"} {n} vial{n === 1 ? "" : "s"}</button></div></div>
        </form>
      </dialog>
      {state?.ok && <span className="a-ok" role="status">{state.ok}</span>}
    </>
  );
}
