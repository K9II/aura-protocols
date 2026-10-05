// StrengthMenu.tsx — the ⋯ menu on a strength: Hide from / Show on store,
// Archive strength, Delete strength (only with no lots and no orders).
"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { archiveStrengthAction, deleteStrengthAction, setStrengthShownAction } from "@/app/admin/catalog/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

const DELETE_REFUSAL ="This one has lots or orders, so archive it instead.";

export default function StrengthMenu({ slug, variantId, strength, shown, canDelete }: { slug: string; variantId: string; strength: string; shown: boolean; canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [del, deleteAction] = useActionState(deleteStrengthAction, null);
  const id = `st-menu-${slug}-${variantId}`;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);
  const hidden = (
    <><input type="hidden" name="slug" value={slug} /><input type="hidden" name="variantId" value={variantId} /></>
  );
  return (
    <div className="a-menu" ref={wrap}>
      <button ref={button} type="button" className="a-btn sm ghost" aria-label={`More for ${strength}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>⋯</button>
      {open && (
        <div className="a-dd" id={id}>
          <form action={setStrengthShownAction}>{hidden}<input type="hidden" name="shown" value={shown ? "false" : "true"} />
            <button type="submit" className="it">{shown
              ? <>Hide from store<small>Greyed out here; customers stop seeing it. Show it again any time.</small></>
              : <>Show on store<small>Customers see it again. With no live lot it shows Out of stock.</small></>}</button>
          </form>
          <form action={archiveStrengthAction}>{hidden}
            <ConfirmSubmit className="it" message={`Archive ${strength}? It leaves the store and this list. Lots, certificates and orders are kept; restore it any time.`}>
              Archive strength<small>Off the store and out of the list. Lots, certificates and orders are kept; restore any time.</small>
            </ConfirmSubmit>
          </form>
          <hr />
          {canDelete ? (
            <form action={deleteAction}>{hidden}
              <ConfirmSubmit className="it" message={`Delete ${strength}? It has no lots or orders. This can't be undone.`}>
                Delete strength<small>Only for a strength added by mistake.</small>
              </ConfirmSubmit>
            </form>
          ) : (
            <button type="button" className="it" disabled>Delete strength<small>Only for a strength added by mistake. {DELETE_REFUSAL}</small></button>
          )}
          {del?.error && <div className="a-err" role="alert" style={{ padding: "4px 12px 8px" }}>{del.error}</div>}
        </div>
      )}
    </div>
  );
}
