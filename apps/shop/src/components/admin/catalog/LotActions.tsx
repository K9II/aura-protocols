// LotActions.tsx — the ⋯ menu on a live lot: Retire.
"use client";
import { retireAction } from "@/app/admin/catalog/actions";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export default function LotActions({ lotId, lotNumber, lastLive, canPutLive }: { lotId: string; lotNumber: string; lastLive: boolean; canPutLive: boolean }) {
  const retireMsg = lastLive
    ? `Retire ${lotNumber}? It's the last live lot — this strength will show Out of stock. Held vials still ship.`
    : `Retire ${lotNumber}? It stops selling now. Held vials still ship.`;
  return (
    <details className="a-menu">
      <summary className="a-btn sm ghost" aria-label={`More for ${lotNumber}`}>⋯</summary>
      <div className="pop">
        {canPutLive && <form action={retireAction}><input type="hidden" name="lotId" value={lotId} />
          <ConfirmSubmit className="" message={retireMsg}>Retire lot</ConfirmSubmit></form>}
      </div>
    </details>
  );
}
