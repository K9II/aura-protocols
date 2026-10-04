"use client";

import { useState } from "react";
import { resendVerifyAction } from "@/app/auth/gate-actions";

export default function ResendVerify() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true);
    try {
      const r = await resendVerifyAction();
      setMsg(r.ok ? "Sent. Check your inbox (and spam)." : r.error);
    } catch {
      setMsg("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span>
      {" "}<button type="button" onClick={resend} disabled={busy} className="p-link bg-transparent border-0 p-0 cursor-pointer underline">Resend the link</button>
      {msg && <span role="status" className="ml-2 text-[color:var(--ink-soft)]">{msg}</span>}
    </span>
  );
}
