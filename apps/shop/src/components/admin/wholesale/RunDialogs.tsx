"use client";

// Run page controls (mock a2–a5): Record order, Link lot, Pass / Fail…,
// Re-source, Notes and Cancel deposit…. Each wraps one Admin → Wholesale
// server action; the server re-checks everything.
import { useActionState, useEffect, useRef, useState } from "react";
import {
  cancelDepositAction, failLineAction, linkLotAction, passLineAction, recordLineOrderAction, resourceLineAction, saveRunNotesAction,
  type ActionState,
} from "@/app/admin/wholesale/actions";
import { REFUND_REASONS, REFUND_REASON_LABEL } from "@/lib/refunds/rules";
import { MAX_SUPPLIERS_PER_RUN } from "@/lib/wholesale/runs";
import { usd } from "@/lib/html";

type Act = (prev: ActionState, f: FormData) => Promise<ActionState>;

function useDialog(action: Act) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, run, pending] = useActionState(action, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  return { ref, state, run, pending, open: () => ref.current?.showModal(), close: () => ref.current?.close() };
}

const Err = ({ msg }: { msg?: string }) => (msg ? <div className="a-err" role="alert">{msg}</div> : null);
const Flash = ({ state }: { state: ActionState }) => (state?.ok ? <div className="a-flash" role="status">{state.ok}</div> : state?.error ? <div className="a-err" role="alert">{state.error}</div> : null);

const OTHER = "__other";

export function RecordOrderDialog({ runId, runNumber, cutoffLabel, slug, variantId, label, kits, suppliers, choices, primary }: {
  runId: string; runNumber: string; cutoffLabel: string; slug: string; variantId: string; label: string; kits: number; suppliers: string[];
  choices: { options: string[]; full: boolean }; primary?: boolean;
}) {
  const d = useDialog(recordLineOrderAction);
  const id = `ro-${slug}-${variantId}`;
  // A run's own supplier comes first; otherwise the owner picks one.
  const [pick, setPick] = useState(suppliers[0] ?? "");
  const [extra, setExtra] = useState("0");
  const extraN = /^\d+$/.test(extra.trim()) ? Number(extra.trim()) : 0;
  const boxes = kits + extraN;
  return (
    <>
      <button type="button" className={`a-btn sm${primary ? " primary" : ""}`} onClick={d.open}>Record order</button>
      <dialog ref={d.ref} className="a-modal" aria-labelledby={id}>
        <form action={d.run}>
          <input type="hidden" name="runId" value={runId} /><input type="hidden" name="slug" value={slug} /><input type="hidden" name="variantId" value={variantId} />
          <div className="a-modal-h"><h2 id={id}>Record order · {label}</h2><button type="button" className="x" aria-label="Close" onClick={d.close}>×</button></div>
          <div className="a-modal-b">
            <dl className="a-dl"><dt>Run</dt><dd>{runNumber} · order by {cutoffLabel}</dd><dt>Kits</dt><dd>{kits} kit{kits === 1 ? "" : "s"} ({kits * 10} vials) — what this run&apos;s buyers ordered</dd>
              <dt>You&apos;re ordering</dt><dd><b>{boxes} box{boxes === 1 ? "" : "es"} of 10 vials</b>{extraN > 0 ? ` (${kits} for buyers + ${extraN} for the shop)` : ""}</dd></dl>
            <div className="a-fld"><label htmlFor={`${id}-sup`}>Supplier</label>
              <select id={`${id}-sup`} name={pick === OTHER ? undefined : "supplier"} className="a-select" style={{ width: "100%" }} required value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="" disabled>Choose a supplier…</option>
                {choices.options.map((s) => <option key={s} value={s}>{s}{suppliers.includes(s) ? " · in this run" : ""}</option>)}
                {!choices.full && <option value={OTHER}>Other…</option>}
              </select>
              {pick === OTHER && <input name="supplier" className="a-input" style={{ marginTop: 6 }} maxLength={80} required autoFocus placeholder="Supplier name" aria-label="New supplier name" />}
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>A run uses at most {MAX_SUPPLIERS_PER_RUN} suppliers — this run has {suppliers.length}{choices.full ? ", so only those two" : ""}.</div>
              <Err msg={d.state?.fieldErrors?.supplier} /></div>
            <div className="a-grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="a-fld"><label htmlFor={`${id}-x`}>Extra boxes for the shop</label><input id={`${id}-x`} name="extraBoxes" className="a-input" inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value)} />
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Optional. Added to this order, covered by the same lab test, and sold as single vials once the lot passes. 0 if none.</div><Err msg={d.state?.fieldErrors?.extraBoxes} /></div>
              <div className="a-fld"><label htmlFor={`${id}-c`}>Total paid to the supplier ($)</label><input id={`${id}-c`} name="cost" className="a-input" inputMode="decimal" required />
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>For all {boxes} box{boxes === 1 ? "" : "es"} on this order.</div><Err msg={d.state?.fieldErrors?.cost} /></div>
            </div>
            <div className="a-fld"><label htmlFor={`${id}-r`}>Supplier&apos;s order or invoice number <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><input id={`${id}-r`} name="ref" className="a-input" maxLength={120} /></div>
            <Err msg={d.state?.error} />
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={d.close}>Cancel</button><button type="submit" className="a-btn primary" disabled={d.pending}>Record order</button></div></div>
        </form>
      </dialog>
    </>
  );
}

export function LinkLotDialog({ lineId, label, lots }: { lineId: string; label: string; lots: Array<{ id: string; lot_number: string; counted_qty: number; damaged_qty: number; coa_path: string | null }> }) {
  const d = useDialog(linkLotAction);
  const id = `ll-${lineId}`;
  return (
    <>
      <button type="button" className="a-btn sm" onClick={d.open}>Link lot</button>
      <dialog ref={d.ref} className="a-modal" aria-labelledby={id}>
        <form action={d.run}>
          <input type="hidden" name="lineId" value={lineId} />
          <div className="a-modal-h"><h2 id={id}>Link the received lot · {label}</h2><button type="button" className="x" aria-label="Close" onClick={d.close}>×</button></div>
          <div className="a-modal-b">
            {lots.length === 0
              ? <div className="a-callout info"><span>No draft lot of this strength yet. Receive the boxes in Catalog &amp; lots first (the lot stays a draft until it passes here).</span></div>
              : <div className="a-fld"><label htmlFor={`${id}-lot`}>Draft lot</label>
                  <select id={`${id}-lot`} name="lotId" className="a-select" style={{ width: "100%" }} required>
                    {lots.map((l) => <option key={l.id} value={l.id}>{l.lot_number} · {l.counted_qty - l.damaged_qty} vials{l.coa_path ? " · certificate ✓" : " · no certificate yet"}</option>)}
                  </select><Err msg={d.state?.fieldErrors?.lotId} /></div>}
            <Err msg={d.state?.error} />
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={d.close}>Cancel</button><button type="submit" className="a-btn primary" disabled={d.pending || lots.length === 0}>Link lot</button></div></div>
        </form>
      </dialog>
    </>
  );
}

export function PassFailButtons({ lineId, label, buyers }: { lineId: string; label: string; buyers: number }) {
  const [passState, pass, passing] = useActionState(passLineAction, null);
  const f = useDialog(failLineAction);
  const id = `fl-${lineId}`;
  return (
    <span className="a-ws-acts">
      <form action={pass}><input type="hidden" name="lineId" value={lineId} /><button type="submit" className="a-btn sm primary" disabled={passing}>Pass</button></form>
      <button type="button" className="a-btn sm" onClick={f.open}>Fail…</button>
      <Flash state={passState} />
      <dialog ref={f.ref} className="a-modal" aria-labelledby={id}>
        <form action={f.run}>
          <input type="hidden" name="lineId" value={lineId} />
          <div className="a-modal-h"><h2 id={id}>Mark {label} failed?</h2><button type="button" className="x" aria-label="Close" onClick={f.close}>×</button></div>
          <div className="a-modal-b">
            <div className="a-callout warn"><span>The lot is never sold. <b>{buyers} buyer{buyers === 1 ? "" : "s"}</b> with this strength get{buyers === 1 ? "s" : ""} the re-source email (new estimated date, and the choice to wait or cancel for a full deposit refund). Other strengths carry on.</span></div>
            <div className="a-fld"><label htmlFor={`${id}-n`}>What failed <span className="muted" style={{ fontWeight: 400 }}>· required — kept as the factory claim note</span></label>
              <textarea id={`${id}-n`} name="note" className="a-textarea" rows={3} maxLength={2000} required /><Err msg={f.state?.fieldErrors?.note} /></div>
            <Err msg={f.state?.error} />
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={f.close}>Cancel</button><button type="submit" className="a-btn danger-fill" disabled={f.pending}>Mark failed</button></div></div>
        </form>
      </dialog>
    </span>
  );
}

export function ResourceButton({ lineId }: { lineId: string }) {
  const [state, run, pending] = useActionState(resourceLineAction, null);
  return (
    <form action={run} className="a-ws-acts"><input type="hidden" name="lineId" value={lineId} />
      <button type="submit" className="a-btn sm" disabled={pending}>Re-source</button><Flash state={state} /></form>
  );
}

export function RunNotes({ runId, notes, canEdit }: { runId: string; notes: string; canEdit: boolean }) {
  const [state, run, pending] = useActionState(saveRunNotesAction, null);
  if (!canEdit) return <div className="a-card-b" style={{ whiteSpace: "pre-wrap" }}>{notes || <span className="muted">No notes.</span>}</div>;
  return (
    <form action={run} className="a-card-b">
      <input type="hidden" name="runId" value={runId} />
      <textarea name="notes" className="a-textarea" rows={4} maxLength={4000} defaultValue={notes} style={{ width: "100%" }} aria-label="Run notes" />
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}><button type="submit" className="a-btn sm" disabled={pending}>Save notes</button><Flash state={state} /></div>
      <Err msg={state?.fieldErrors?.notes} />
    </form>
  );
}

export function CancelDepositDialog({ orderId, orderNumber, depositCents }: { orderId: string; orderNumber: string; depositCents: number }) {
  const d = useDialog(cancelDepositAction);
  const id = `cd-${orderId}`;
  return (
    <>
      <button type="button" className="a-btn sm ghost" onClick={d.open}>Cancel deposit…</button>
      <dialog ref={d.ref} className="a-modal" aria-labelledby={id}>
        <form action={d.run}>
          <input type="hidden" name="orderId" value={orderId} />
          <div className="a-modal-h"><h2 id={id}>Cancel {orderNumber} and refund the deposit?</h2><button type="button" className="x" aria-label="Close" onClick={d.close}>×</button></div>
          <div className="a-modal-b">
            <div className="a-callout info"><span>{usd(depositCents)} goes back to the buyer&apos;s card and they get the cancellation email. Vials already set aside for a passed strength go back to retail stock.</span></div>
            <div className="a-fld"><label htmlFor={`${id}-r`}>Reason</label>
              <select id={`${id}-r`} name="reason" className="a-select" style={{ width: "100%" }} required defaultValue="customer_cancelled">
                {REFUND_REASONS.map((r) => <option key={r} value={r}>{REFUND_REASON_LABEL[r]}</option>)}
              </select><Err msg={d.state?.fieldErrors?.reason} /></div>
            <div className="a-fld"><label htmlFor={`${id}-n`}>Note <span className="muted" style={{ fontWeight: 400 }}>· optional</span></label><textarea id={`${id}-n`} name="note" className="a-textarea" rows={2} maxLength={300} /></div>
            <Err msg={d.state?.error} />
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={d.close}>Keep the order</button><button type="submit" className="a-btn danger-fill" disabled={d.pending}>Cancel and refund</button></div></div>
        </form>
      </dialog>
    </>
  );
}
