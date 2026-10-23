"use client";
// Email → Pre-launch → Early access on/off (pre-launch email 3). On lets a browser that
// opened an early link past the coming-soon page; off sends it back within a minute.
import { useActionState } from "react";
import { setEarlyAccessAction } from "@/app/admin/email/actions";

export default function EarlySwitch({ open }: { open: boolean }) {
  const [state, action, pending] = useActionState(setEarlyAccessAction, null);
  return (
    <form action={action} className="a-pre-switch">
      <input type="hidden" name="open" value={open ? "0" : "1"} />
      <button type="submit" className="a-btn sm" disabled={pending}>{pending ? "Saving…" : open ? "Turn off" : "Turn on"}</button>
      {state?.error && <span className="a-err" role="alert">{state.error}</span>}
    </form>
  );
}
