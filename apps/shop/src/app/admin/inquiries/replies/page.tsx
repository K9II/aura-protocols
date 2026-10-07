import type { Metadata } from "next";
import { requirePermission } from "@/lib/dal";
import { listSavedReplies } from "@/lib/inquiries/data";
import { shortDate } from "@/lib/discounts/time";
import { Crumbs } from "@/components/admin/ui";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import SavedReplyDialog from "@/components/admin/inquiries/SavedReplyDialog";
import { deleteReplyAction } from "@/app/admin/inquiries/actions";

export const metadata: Metadata = { title: "Saved replies", robots: { index: false, follow: false } };

// Mock screen 5.
export default async function SavedRepliesPage() {
  await requirePermission("inquiries.view");
  const replies = await listSavedReplies();
  const updated = (r: (typeof replies)[number]) => `${shortDate(r.updated_at)}${r.updatedByName ? ` · ${r.updatedByName}` : ""}`;
  const actions = (r: (typeof replies)[number]) => (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <SavedReplyDialog reply={{ id: r.id, name: r.name, body: r.body }} />
      <form action={deleteReplyAction}><input type="hidden" name="id" value={r.id} />
        <ConfirmSubmit message={`Delete the saved reply "${r.name}"?`} className="a-btn sm ghost">Delete</ConfirmSubmit></form>
    </span>
  );
  return (
    <div className="a-page">
      <Crumbs items={[{ label: "Inquiries", href: "/admin/inquiries" }, { label: "Saved replies" }]} />
      <div className="a-ph">
        <div><h1>Saved replies</h1><p>Text you can insert into a reply with one click, then edit before sending. Each one is checked for compliance when you save it.</p></div>
        <div className="actions"><SavedReplyDialog /></div>
      </div>
      {replies.length === 0 ? <div className="a-empty">No saved replies yet.</div> : (
        <>
          <table className="a-t a-sr a-only-desk">
            <thead><tr><th style={{ width: 280 }}>Name</th><th>Text</th><th>Updated</th><th /></tr></thead>
            <tbody>{replies.map((r) => (
              <tr key={r.id}><td className="nm">{r.name}</td><td className="bd">{r.body}</td><td className="muted" style={{ whiteSpace: "nowrap" }}>{updated(r)}</td><td className="num">{actions(r)}</td></tr>
            ))}</tbody>
          </table>
          <div className="a-plist a-only-phone">{replies.map((r) => (
            <div key={r.id} className="a-pq"><b>{r.name}</b><span className="muted">{updated(r)}</span><div className="pv" style={{ whiteSpace: "normal" }}>{r.body}</div><div className="meta">{actions(r)}</div></div>
          ))}</div>
        </>
      )}
    </div>
  );
}
