"use client";

// The reply form (mock screens 2 and 3). The compliance check runs on the
// server when you send; a hit comes back here with the phrase named.
import { useActionState, useState } from "react";
import Link from "next/link";
import { replyAction } from "@/app/admin/inquiries/actions";
import { INQUIRY_REPLY_MAX } from "@/lib/inquiries/constants";
import { Icon } from "@/components/admin/ui";

type Props = { inquiryId: string; clientKey: string; to: string; from: string; signature: string; saved: Array<{ id: string; name: string; body: string }> };

export default function ReplyBox({ inquiryId, clientKey, to, from, signature, saved }: Props) {
  const [state, action, pending] = useActionState(replyAction, null);
  const sig = `\n\n${signature}`;
  const [text, setText] = useState(sig);
  const [menu, setMenu] = useState(false);
  function insert(body: string) {
    setText((t) => {
      const base = (t.endsWith(sig) ? t.slice(0, -sig.length) : t).trimEnd();
      return `${base ? `${base}\n\n` : ""}${body}${t.endsWith(sig) ? sig : ""}`;
    });
    setMenu(false);
  }
  const err = state?.error ?? null;
  return (
    <form action={action} className="a-reply">
      <input type="hidden" name="id" value={inquiryId} />
      <input type="hidden" name="clientKey" value={clientKey} />
      <div className="a-reply-h">
        <span>Reply to <b>{to}</b> · from {from}</span>
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
          <div>{err.startsWith("Not sent.") ? <><b>Not sent.</b>{err.slice("Not sent.".length)}</> : err}</div></div>
      )}
      {state?.ok && <div className="a-scansent" role="status">{state.ok}</div>}
      <div className="a-reply-f">
        <span className="note"><Icon name="shield" />Checked for compliance when you send</span>
        <div className="r">
          <button type="submit" name="mode" value="close" className="a-btn" disabled={pending}>Send and close</button>
          <button type="submit" name="mode" value="send" className="a-btn primary" disabled={pending}><Icon name="send" />Send</button>
        </div>
      </div>
    </form>
  );
}
