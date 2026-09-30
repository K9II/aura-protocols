"use client";

import { useActionState } from "react";
import { updateAddressAction, type AddressFormState } from "@/app/account/actions";
import type { ShipAddress } from "@/lib/ship-address";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3 py-2 text-sm mb-2";

export default function AddressForm({ ship }: { ship: ShipAddress | null }) {
  const [state, action, pending] = useActionState<AddressFormState, FormData>(updateAddressAction, undefined);
  return (
    <form action={action}>
      <input name="name" defaultValue={ship?.name ?? ""} placeholder="Full name" aria-label="Full name" required className={field} />
      <input name="line1" defaultValue={ship?.line1 ?? ""} placeholder="Street address" aria-label="Street address" required className={field} />
      <input name="line2" defaultValue={ship?.line2 ?? ""} placeholder="Apt, suite (optional)" aria-label="Apt, suite" className={field} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8 }}>
        <input name="city" defaultValue={ship?.city ?? ""} placeholder="City" aria-label="City" required className={field} />
        <input name="state" defaultValue={ship?.state ?? ""} placeholder="State" aria-label="State" maxLength={2} required className={field} />
        <input name="zip" defaultValue={ship?.zip ?? ""} placeholder="ZIP" aria-label="ZIP" required className={field} />
      </div>
      {state?.error && <p role="alert" className="text-sm text-[color:var(--specimen)]">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm">Saved.</p>}
      <button type="submit" disabled={pending} className="p-btn-outline inline-block px-4 py-2 text-[12px] uppercase tracking-[0.06em] mt-1">Save address</button>
    </form>
  );
}
