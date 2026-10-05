"use client";
import { useActionState, useState } from "react";
import { setCapAction } from "@/app/admin/discounts/actions";

export default function CapForm({ cap }: { cap: number }) {
  const [state, action, pending] = useActionState(setCapAction, null);
  const [value, setValue] = useState(String(cap));
  const dirty = value !== String(cap);
  return (
    <form action={action} id="cap-form">
      <div className="a-fld">
        <label htmlFor="cap">Maximum discount</label>
        <div className="a-input" style={{ width: 120 }}><input id="cap" name="cap" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} /><span className="affix">%</span></div>
        <div className="help">Of list price, on goods.</div>
        {state?.error && <div className="a-err" role="alert">{state.error}</div>}
      </div>
      <div className="a-savebar">
        <div className="msg">{state?.ok && !dirty ? "Saved" : dirty ? `Cap changes from ${cap}% to ${value}%` : "No unsaved changes"}</div>
        <div className="r">
          <button type="button" className="a-btn ghost" onClick={() => setValue(String(cap))} disabled={!dirty}>Discard</button>
          <button type="submit" className="a-btn primary" disabled={!dirty || pending}>Save</button>
        </div>
      </div>
    </form>
  );
}
