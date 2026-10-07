"use client";

// The order page's ⋯ More menu (mock 2026-10-07-admin-refunds r3 left, r6
// left). A shipped order keeps Send a replacement and Refund… here; on
// phones (≤ 640px) Cancel and refund and Open in Stripe move in too.
// Closes on an outside click or Escape. Dialog items open a <dialog> that
// the page renders (by id), so closing the menu doesn't unmount it.
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/admin/ui";

export type MoreItem =
  | { kind: "link"; label: string; sub: string; href: string; external?: boolean; phoneOnly?: boolean; danger?: boolean }
  | { kind: "dialog"; label: string; sub: string; dialogId: string; phoneOnly?: boolean; danger?: boolean };

export default function OrderMore({ items, orderNumber }: { items: MoreItem[]; orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = `more-${useId()}`;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open]);
  if (!items.length) return null;
  const phoneOnly = items.every((i) => i.phoneOnly);
  const cls = (i: MoreItem) => [i.danger ? "danger" : "", i.phoneOnly ? "a-show-640" : ""].filter(Boolean).join(" ") || undefined;
  const openDialog = (dialogId: string) => {
    setOpen(false);
    (document.getElementById(dialogId) as HTMLDialogElement | null)?.showModal();
  };
  return (
    <div className={`a-menu a-more${phoneOnly ? " a-show-640" : ""}`} ref={wrap}>
      <button ref={button} type="button" className="a-btn icon" aria-label={`More for ${orderNumber}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}><Icon name="dots" /></button>
      {open && (
        <div className="a-mlist" id={id}>{items.map((i) => i.kind === "link"
          ? (i.external
            ? <a key={i.label} className={cls(i)} href={i.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>{i.label}<small>{i.sub}</small></a>
            : <Link key={i.label} className={cls(i)} href={i.href} onClick={() => setOpen(false)}>{i.label}<small>{i.sub}</small></Link>)
          : <button key={i.label} type="button" className={cls(i)} onClick={() => openDialog(i.dialogId)}>{i.label}<small>{i.sub}</small></button>,
        )}</div>
      )}
    </div>
  );
}
