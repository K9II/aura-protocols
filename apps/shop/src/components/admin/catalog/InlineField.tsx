"use client";
import { useActionState, useEffect, useState } from "react";
import { setFieldAction } from "@/app/admin/catalog/actions";
import { Icon } from "@/components/admin/ui";

export default function InlineField({ slug, variantId, field, display, initial, label }: { slug: string; variantId: string; field: "price" | "low" | "sku"; display: string; initial: string; label: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(setFieldAction, null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the inline editor when the save succeeds
    if (state?.ok) setEditing(false);
  }, [state]);
  if (!editing) {
    return <span className="a-inl">{display}<button type="button" className="ed" aria-label={`Edit ${label}`} onClick={() => setEditing(true)}><Icon name="edit" /></button></span>;
  }
  return (
    <form action={action} className="a-inl">
      <input type="hidden" name="slug" value={slug} /><input type="hidden" name="variantId" value={variantId} /><input type="hidden" name="field" value={field} />
      <input name="value" defaultValue={initial} aria-label={label} autoFocus />
      <button type="submit" className="a-btn sm primary" disabled={pending}>Save</button>
      <button type="button" className="a-btn sm ghost" onClick={() => setEditing(false)}>Cancel</button>
      {state?.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  );
}
