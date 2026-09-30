"use client";

import { useActionState } from "react";
import { uploadW9Action, type SettingsState } from "@/app/partners/actions";

export default function W9Upload({ uploadedAt, checkedAt }: { uploadedAt: string | null; checkedAt: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(uploadW9Action, undefined);
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div>
      <p className="s-micro mt-4 mb-1.5">Tax form</p>
      {uploadedAt ? (
        <p className="text-[14px]">W-9 uploaded {fmt(uploadedAt)} · {checkedAt ? <span style={{ color: "#2F5D3A" }}>checked</span> : <span className="text-[color:var(--ink-soft)]">waiting for our check</span>}</p>
      ) : (
        <p className="text-[14px] text-[color:var(--ink-soft)]">Upload your signed W-9 to unlock cash payouts.</p>
      )}
      <form action={action} className="mt-2" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input name="w9" type="file" accept="application/pdf" aria-label="W-9 PDF" className="text-[12.5px]" required />
        <button type="submit" disabled={pending} style={{ padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" }}>
          {pending ? "Uploading…" : uploadedAt ? "Replace" : "Upload"}
        </button>
      </form>
      {state?.ok && <p className="text-[12.5px] mt-2" style={{ color: "#2F5D3A" }}>Uploaded — we&apos;ll check it shortly.</p>}
      {state?.error && <p role="alert" className="text-[12.5px] text-[color:var(--specimen)] mt-2">{state.error}</p>}
    </div>
  );
}
