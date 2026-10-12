"use client";
// Add / edit a lab (mock a3). Verify code hint (task 5b): shown under the
// Verify code field on a certificate using this lab — not written here, just
// the "where to find it" note the owner leaves once per lab.
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveLabAction } from "@/app/admin/catalog/settings/actions";
import { Icon } from "@/components/admin/ui";
import type { Lab } from "@/lib/coa/data";

type LabDraft = { name: string; city: string; verify: string; hint: string; iso: boolean };
const EMPTY: LabDraft = { name: "", city: "", verify: "", hint: "", iso: false };
const draftOf = (lab?: Lab): LabDraft =>
  lab ? { name: lab.name, city: lab.city ?? "", verify: lab.verify_url_template ?? "", hint: lab.verify_hint ?? "", iso: lab.iso17025 } : EMPTY;

export default function LabDialog({ lab, initial, triggerLabel, portal = false, onSaved }: {
  lab?: Lab;
  initial?: { name: string; city: string | null };   // pre-fill from a certificate the reader couldn't match
  triggerLabel?: string;
  portal?: boolean;                                   // render the dialog under <body> (when opened from inside another form)
  onSaved?: (name: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveLabAction, null);
  const [v, setV] = useState<LabDraft>(lab ? draftOf(lab) : { ...EMPTY, name: initial?.name ?? "", city: initial?.city ?? "" });
  const [mounted, setMounted] = useState(!portal);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- the portal target exists only after mount
  useEffect(() => { if (portal) setMounted(true); }, [portal]);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      onSaved?.(v.name.trim());
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form so reopening starts fresh
      if (!lab) setV(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only reacts to a fresh action result
  }, [state]);
  const fe = state?.fieldErrors ?? {};
  const scope = lab?.id ?? (initial ? "read" : "new");
  const id = (k: string) => `lab-${k}-${scope}`;
  const set = (k: "name" | "city" | "verify" | "hint") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const dialog = (
    <dialog ref={ref} className="a-modal" aria-labelledby={id("h")}>
      <form action={action}>
        {lab && <input type="hidden" name="labId" value={lab.id} />}
        <div className="a-modal-h"><h2 id={id("h")}>{lab ? `Edit lab · ${lab.name}` : "Add a lab"}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
        <div className="a-modal-b">
          <div className="a-fld"><label htmlFor={id("name")}>Name</label><div className="a-input"><input id={id("name")} name="name" value={v.name} onChange={set("name")} required /></div>{fe.name && <div className="a-err" role="alert">{fe.name}</div>}</div>
          <div className="a-fld"><label htmlFor={id("city")}>City <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><div className="a-input"><input id={id("city")} name="city" value={v.city} onChange={set("city")} /></div>{fe.city && <div className="a-err" role="alert">{fe.city}</div>}</div>
          <div className="a-fld"><label htmlFor={id("verify")}>Verify link <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label>
            <div className="a-input mono"><input id={id("verify")} name="verify" placeholder="https://lab.example/verify/{report}" value={v.verify} onChange={set("verify")} /></div>
            <div className="help">Use {"{report}"} where the report number goes, or its Verify code when one is set</div>{fe.verify && <div className="a-err" role="alert">{fe.verify}</div>}</div>
          <div className="a-fld"><label htmlFor={id("hint")}>Where to find the verify code <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label>
            <textarea id={id("hint")} name="hint" className="a-textarea" maxLength={200} value={v.hint} onChange={set("hint")} />
            <div className="help">Shown under the Verify code field on a certificate using this lab</div>{fe.hint && <div className="a-err" role="alert">{fe.hint}</div>}</div>
          <label className="a-cbrow"><input type="checkbox" name="iso" checked={v.iso} onChange={(e) => setV({ ...v, iso: e.target.checked })} /><span>Holds ISO/IEC 17025 accreditation</span></label>
          {state?.error && <div className="a-err" role="alert">{state.error}</div>}
        </div>
        <div className="a-modal-f"><span />
          <div className="r">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}>{lab ? "Save lab" : "Add lab"}</button>
          </div>
        </div>
      </form>
    </dialog>
  );

  return (
    <>
      {lab
        ? <button type="button" className="a-btn sm" onClick={() => ref.current?.showModal()}>Edit</button>
        : <button type="button" className="a-btn sm" style={{ marginLeft: "auto" }} onClick={() => ref.current?.showModal()}><Icon name="plus" />{triggerLabel ?? "Add lab"}</button>}
      {portal ? (mounted ? createPortal(dialog, document.body) : null) : dialog}
      {state?.ok && !portal && <span className="a-ok" role="status">{state.ok}</span>}
    </>
  );
}
