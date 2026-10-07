"use client";

// A button that opens a confirm dialog around a server action (approve,
// decline, suspend, cancel). Replaces window.confirm for
// actions that email someone or move money.
import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton({ className, children }: { className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{children}</button>;
}

export default function ConfirmDialog({ label, title, confirmLabel, action, fields, tone = "primary", small, children }: {
  label: string; title: string; confirmLabel: string; action: (form: FormData) => Promise<void>;
  fields: Record<string, string>; tone?: "primary" | "danger" | "plain"; small?: boolean; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cls = (base: string) => `${base}${tone === "plain" ? "" : ` ${tone}`}`;
  // useId, not label/fields: the same row's dialog renders twice (desktop
  // table + phone card), and htmlFor/aria-labelledby targets must stay unique.
  const id = `confirm-${useId()}`;
  return (
    <>
      <button type="button" className={cls(`a-btn${small ? " sm" : ""}`)} onClick={() => ref.current?.showModal()}>{label}</button>
      <dialog ref={ref} className="a-modal" aria-labelledby={id}>
        <form action={async (f) => { await action(f); ref.current?.close(); }}>
          {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <div className="a-modal-h"><h2 id={id}>{title}</h2><button type="button" className="x" aria-label="Close" onClick={() => ref.current?.close()}>×</button></div>
          <div className="a-modal-b"><div>{children}</div></div>
          <div className="a-modal-f"><div className="r">
            <button type="button" className="a-btn" onClick={() => ref.current?.close()}>Cancel</button>
            <SubmitButton className={cls("a-btn")}>{confirmLabel}</SubmitButton>
          </div></div>
        </form>
      </dialog>
    </>
  );
}
