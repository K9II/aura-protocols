// LotActions.tsx — the ⋯ menu on a live lot: Retire, Replace certificate.
"use client";
import { useActionState, useState } from "react";
import { replaceCertificateAction, retireAction } from "@/app/admin/catalog/actions";
import CoaUpload from "@/components/admin/catalog/CoaUpload";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export default function LotActions({ lotId, lotNumber, lastLive }: { lotId: string; lotNumber: string; lastLive: boolean }) {
  const [replacing, setReplacing] = useState(false);
  const [path, setPath] = useState("");
  const [state, action, pending] = useActionState(replaceCertificateAction, null);
  const retireMsg = lastLive
    ? `Retire ${lotNumber}? It's the last live lot — this strength will show Out of stock. Held vials still ship.`
    : `Retire ${lotNumber}? It stops selling now. Held vials still ship.`;
  return (
    <details className="a-menu">
      <summary className="a-btn sm ghost" aria-label={`More for ${lotNumber}`}>⋯</summary>
      <div className="pop">
        <form action={retireAction}><input type="hidden" name="lotId" value={lotId} />
          <ConfirmSubmit className="" message={retireMsg}>Retire lot</ConfirmSubmit></form>
        <button type="button" onClick={() => setReplacing(true)}>Replace certificate</button>
        {replacing && (
          <form action={action} style={{ padding: 12, display: "grid", gap: 8 }}>
            <input type="hidden" name="lotId" value={lotId} /><input type="hidden" name="coaPath" value={path} />
            <CoaUpload idSuffix={lotId} lotNumber={lotNumber} path={path} onPath={setPath} error={state?.fieldErrors?.coa} />
            <button type="submit" className="a-btn sm primary" disabled={pending || !path}>Save certificate</button>
            {state?.ok && <span className="a-ok" role="status">{state.ok}</span>}
          </form>
        )}
      </div>
    </details>
  );
}
