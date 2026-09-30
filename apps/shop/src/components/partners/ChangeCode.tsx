"use client";

import { useActionState, useState } from "react";
import { changeCodeAction, type SettingsState } from "@/app/partners/actions";

const smallBtn: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };

export default function ChangeCode({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<SettingsState, FormData>(changeCodeAction, undefined);
  if (!open) return <button type="button" className="underline text-[12.5px] text-[color:var(--specimen)]" onClick={() => setOpen(true)}>Change code</button>;
  return (
    <form action={action} className="mt-2" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input name="code" defaultValue={code} maxLength={20} aria-label="New code" required
        className="border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-2 text-sm" style={{ width: 160 }} />
      <button type="submit" disabled={pending} style={smallBtn}>{pending ? "Saving…" : "Save"}</button>
      <p className="text-[12.5px] text-[color:var(--ink-soft)] w-full">3–20 letters or numbers. Your old code and links keep working.</p>
      {state?.ok && <p className="text-[12.5px] w-full" style={{ color: "#2F5D3A" }}>Saved</p>}
      {state?.error && <p role="alert" className="text-[12.5px] w-full text-[color:var(--specimen)]">{state.error}</p>}
    </form>
  );
}
