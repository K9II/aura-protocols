"use client";

// The reply form (mock screens 2 and 3). The compliance check runs on the
// server when you send; a hit comes back here with the phrase named.
import { useActionState, useState } from "react";
import Link from "next/link";
import { discardDraftAction, replyAction, saveDraftAction } from "@/app/admin/inquiries/actions";
import { INQUIRY_REPLY_MAX } from "@/lib/inquiries/constants";
import { Icon } from "@/components/admin/ui";

type Draft = { body: string; byName: string; at: string };
type Props = {
  inquiryId: string; clientKey: string; to: string; from: string; signature: string; saved: Array<{ id: string; name: string; body: string }>;
  // "send": the owner's box (mock Screen 2/4). "draft": the Assistant's box,
  // which saves instead of sending (mock Screen 3) — it can't reply or close.
  mode?: "send" | "draft"; draft?: Draft | null;
};

export default function ReplyBox({ inquiryId, clientKey, to, from, signature, saved, mode = "send", draft = null }: Props) {
  const [sendState, sendAction, sendPending] = useActionState(replyAction, null);
  const [draftState, draftAction, draftPending] = useActionState(saveDraftAction, null);
  const sig = `\n\n${signature}`;
  const [text, setText] = useState(draft?.body ?? sig);
  const [menu, setMenu] = useState(false);
  function insert(body: string) {
    setText((t) => {
      const base = (t.endsWith(sig) ? t.slice(0, -sig.length) : t).trimEnd();
      return `${base ? `${base}\n\n` : ""}${body}${t.endsWith(sig) ? sig : ""}`;
    });
    setMenu(false);
  }
  const drafting = mode === "draft";
  const state = drafting ? draftState : sendState;
  const pending = drafting ? draftPending : sendPending;
  const err = state?.error ?? null;

  const form = (
    <form action={drafting ? draftAction : sendAction} className={`a-reply${drafting ? " asst" : ""}`}>
      <input type="hidden" name="id" value={inquiryId} />
      {!drafting && <input type="hidden" name="clientKey" value={clientKey} />}
      <div className="a-reply-h">
        {drafting ? <span>Draft a reply to <b>{to}</b> · Alvester reviews and sends</span> : <span>Reply to <b>{to}</b> · from {from}</span>}
        <div className="r">
          <button type="button" className="a-btn sm" aria-expanded={menu} onClick={() => setMenu((x) => !x)}><Icon name="plus" />Insert saved reply</button>
          {menu && (
            <div className="a-iq-menu" role="menu">
              <div className="mh">Saved replies<Link href="/admin/inquiries/replies">Edit list</Link></div>
              {saved.length === 0 && <div className="mh">None yet</div>}
              {saved.map((s) => <button key={s.id} type="button" role="menuitem" onClick={() => insert(s.body)}><b>{s.name}</b><small>{s.body}</small></button>)}
            </div>
          )}
        </div>
      </div>
      <textarea name="body" aria-label="Reply" value={text} onChange={(e) => setText(e.target.value)} maxLength={INQUIRY_REPLY_MAX} placeholder="Write a reply…" />
      {err && (
        <div className="a-scanbad" role="alert"><Icon name="warn" />
          <div>{err.startsWith("Not sent.") ? <><b>Not sent.</b>{err.slice("Not sent.".length)}</>
            : err.startsWith("Not saved.") ? <><b>Not saved.</b>{err.slice("Not saved.".length)}</> : err}</div></div>
      )}
      {state?.ok && <div className="a-scansent" role="status">{state.ok}</div>}
      <div className="a-reply-f">
        <span className="note"><Icon name="shield" />Checked for compliance when you {drafting ? "save" : "send"}</span>
        <div className="r">
          {drafting ? (
            <button type="submit" className="a-btn primary" disabled={pending}><Icon name="edit" />Save draft</button>
          ) : (
            <>
              <button type="submit" name="mode" value="close" className="a-btn" disabled={pending}>Send and close</button>
              <button type="submit" name="mode" value="send" className="a-btn primary" disabled={pending}><Icon name="send" />Send</button>
            </>
          )}
        </div>
      </div>
    </form>
  );

  // A <form> can't nest inside the reply <form>, so the draft bar (and its own
  // Discard draft form) sits as a sibling above it, inside a wrapper that
  // reads as one card (mock Screen 4).
  if (!drafting && draft) {
    return (
      <div className="a-reply-card">
        <div className="a-draft-bar">
          <span className="a-avatar asst" aria-hidden>AI</span>
          <span><b>Draft by {draft.byName}</b> · {draft.at}</span>
          <form action={discardDraftAction} className="r">
            <input type="hidden" name="id" value={inquiryId} />
            <button type="submit" className="a-linkbtn">Discard draft</button>
          </form>
        </div>
        {form}
      </div>
    );
  }
  return form;
}
