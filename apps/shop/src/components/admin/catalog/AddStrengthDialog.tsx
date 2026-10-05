"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { addStrengthAction } from "@/app/admin/catalog/actions";
import { DEFAULT_LOW_AT, parseStrength, STRENGTH_UNITS } from "@/lib/catalog-ops/rules";
import { Icon } from "@/components/admin/ui";

const EMPTY = { amount: "", unit: "mg", price: "", lowAt: String(DEFAULT_LOW_AT), sku: "" };

export default function AddStrengthDialog({ slug, title }: { slug: string; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(addStrengthAction, null);
  const [v, setV] = useState(EMPTY);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      setV(EMPTY);
    }
  }, [state]);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const parsed = parseStrength(v.amount, v.unit);
  const shows = parsed.ok ? parsed.value.strength : `${v.amount.trim() || "…"} ${v.unit}`;
  const fe = state?.fieldErrors ?? {};
  const id = (k: string) => `as-${k}-${slug}`;
  return (
    <>
      <button type="button" className="a-addst" onClick={() => ref.current?.showModal()}><Icon name="plus" />Add a strength</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={id("h")}>
        <form action={action}>
          <input type="hidden" name="slug" value={slug} />
          <div className="a-modal-h"><h2 id={id("h")}>Add a strength · {title}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-fld"><label htmlFor={id("amount")}>Strength</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="a-input" style={{ flex: 1 }}><input id={id("amount")} name="amount" inputMode="decimal" value={v.amount} onChange={set("amount")} required /></div>
                <div className="a-input" style={{ width: 90 }}><select aria-label="Unit" name="unit" value={v.unit} onChange={set("unit")} style={{ flex: 1, border: 0, background: "transparent", height: "100%", padding: "0 10px" }}>
                  {STRENGTH_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></div>
              </div>
              {fe.strength ? <div className="a-err" role="alert">{fe.strength}</div> : <div className="help">Customers see &ldquo;{shows}&rdquo;. Unit: mg, mcg or IU.</div>}</div>
            <div className="a-fld"><label htmlFor={id("price")}>Price per vial</label><div className="a-input"><span className="affix">$</span><input id={id("price")} name="price" inputMode="decimal" value={v.price} onChange={set("price")} required /></div>{fe.price && <div className="a-err" role="alert">{fe.price}</div>}</div>
            <div className="a-fld"><label htmlFor={id("low")}>Low at <span className="muted" style={{ fontWeight: 400 }}>· vials</span></label><div className="a-input"><input id={id("low")} name="lowAt" inputMode="numeric" value={v.lowAt} onChange={set("lowAt")} required /></div>{fe.lowAt && <div className="a-err" role="alert">{fe.lowAt}</div>}</div>
            <div className="a-fld"><label htmlFor={id("sku")}>3PL SKU <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><div className="a-input mono"><input id={id("sku")} name="sku" value={v.sku} onChange={set("sku")} /></div>{fe.sku && <div className="a-err" role="alert">{fe.sku}</div>}</div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><span className="muted" style={{ fontSize: 12 }}>Starts hidden</span>
            <div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
              <button type="submit" className="a-btn primary" disabled={pending}>Add strength</button></div></div>
        </form>
      </dialog>
      {state?.ok && <span className="a-ok" role="status">{state.ok}</span>}
    </>
  );
}
