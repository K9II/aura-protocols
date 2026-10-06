"use client";
import { useActionState, useState, type ReactNode } from "react";
import { setCapAction } from "@/app/admin/discounts/actions";
import { CAP_MAX_PCT, CAP_MIN_PCT } from "@/lib/discounts/rules";

// Wraps the whole settings page body: the cap field + the server-rendered
// aside sit inside the cap card, the rest of the page's sections render
// after it, and the save bar is a single sticky sibling at the very end —
// one <form> so Save/Discard apply to the one editable field on the page.
export default function CapForm({ cap, aside, after }: { cap: number; aside: ReactNode; after: ReactNode }) {
  const [state, action, pending] = useActionState(setCapAction, null);
  const [value, setValue] = useState(String(cap));
  // What was actually submitted last time, so a server error/"Saved" message
  // disappears the moment the value it was about no longer matches —
  // typing further, or hitting Discard, both change `value` away from it.
  const [submittedValue, setSubmittedValue] = useState<string | null>(null);
  const dirty = value !== String(cap);
  const stale = submittedValue !== value;
  const showError = !!state?.error && !stale;
  const showSaved = !!state?.ok && !dirty && !stale;

  return (
    <form action={action} onSubmit={() => setSubmittedValue(value)} id="cap-form">
      <section className="a-fsec">
        <div className="a-fsec-h"><h3>Store-wide cap</h3><span>The most any order&apos;s goods can be discounted</span></div>
        <div className="a-fsec-b a-cap-grid">
          <div className="a-fld">
            <label htmlFor="cap">Maximum discount</label>
            <div className="a-input" style={{ width: 120 }}>
              <input id="cap" name="cap" type="number" min={CAP_MIN_PCT} max={CAP_MAX_PCT} step={1} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
              <span className="affix">%</span>
            </div>
            <div className="help">Of list price, on goods. {CAP_MIN_PCT}–{CAP_MAX_PCT}%: never below the new-account offer.</div>
            {showError && <div className="a-err" role="alert">{state!.error}</div>}
          </div>
          {aside}
        </div>
      </section>
      {after}
      <div className="a-savebar">
        <div className="msg">{showSaved ? "Saved" : dirty ? `Cap changes from ${cap}% to ${value}%` : "No unsaved changes"}</div>
        <div className="r">
          <button type="button" className="a-btn ghost" onClick={() => setValue(String(cap))} disabled={!dirty}>Discard</button>
          <button type="submit" className="a-btn primary" disabled={!dirty || pending}>Save</button>
        </div>
      </div>
    </form>
  );
}
