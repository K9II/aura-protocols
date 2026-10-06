"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveReplyAction } from "@/app/admin/inquiries/actions";
import { SAVED_REPLY_MAX, SAVED_REPLY_NAME_MAX } from "@/lib/inquiries/constants";
import { Icon } from "@/components/admin/ui";

export default function SavedReplyDialog({ reply }: { reply?: { id: string; name: string; body: string } }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState(saveReplyAction, null);
  useEffect(() => { if (state?.ok) ref.current?.close(); }, [state]);
  const k = reply?.id ?? "new";
  return (
    <>
      {reply
        ? <button type="button" className="a-btn sm ghost" onClick={() => ref.current?.showModal()}><Icon name="edit" />Edit</button>
        : <button type="button" className="a-btn primary" onClick={() => ref.current?.showModal()}><Icon name="plus" />New saved reply</button>}
      <dialog ref={ref} className="a-modal" aria-labelledby={`sr-${k}`}>
        <form action={action}>
          {reply && <input type="hidden" name="id" value={reply.id} />}
          <div className="a-modal-h"><h2 id={`sr-${k}`}>{reply ? "Edit saved reply" : "New saved reply"}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b">
            <div className="a-fld"><label htmlFor={`sr-n-${k}`}>Name</label><input id={`sr-n-${k}`} name="name" className="a-iq-in" maxLength={SAVED_REPLY_NAME_MAX} defaultValue={reply?.name} required /></div>
            <div className="a-fld"><label htmlFor={`sr-b-${k}`}>Text</label><textarea id={`sr-b-${k}`} name="body" className="a-iq-ta" maxLength={SAVED_REPLY_MAX} defaultValue={reply?.body} required />
              <div className="help">Checked for compliance when you save. You can edit it in each reply before sending.</div></div>
            {state?.error && <div className="a-err" role="alert">{state.error}</div>}
          </div>
          <div className="a-modal-f"><div className="r"><button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <button type="submit" className="a-btn primary" disabled={pending}>Save</button></div></div>
        </form>
      </dialog>
    </>
  );
}
