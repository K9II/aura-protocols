"use client";

import { useActionState, useState } from "react";
import { setPayoutMethodAction, setPayoutPrefAction, type SettingsState } from "@/app/partners/actions";
import { CASH_MIN_CENTS } from "@/lib/partners/tiers";

const field = "w-full border border-[color:var(--ink)] bg-[color:var(--paper)] px-3.5 py-3 text-sm mb-4";
// When each choice pays out (credit on clearing, cash on the 1st/15th from $100 — lib/partners/payout-math).
const PREF_NOTE = {
  cash: `ACH or Zelle on the 1st and 15th, from $${CASH_MIN_CENTS / 100}.`,
  credit: "Added as soon as commission clears.",
  split: "Credit when it clears; cash on the 1st and 15th.",
} as const;
const smallBtn: React.CSSProperties = { padding: "7px 13px", font: "12px Georgia,serif", letterSpacing: ".06em", textTransform: "uppercase", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)" };

export default function PayoutSettings({ pref, splitCashPct, methodHint }: { pref: "cash" | "credit" | "split"; splitCashPct: number; methodHint: string | null }) {
  const [prefState, prefAction] = useActionState<SettingsState, FormData>(setPayoutPrefAction, undefined);
  const [methodState, methodAction] = useActionState<SettingsState, FormData>(setPayoutMethodAction, undefined);
  const [choice, setChoice] = useState(pref);
  const [editing, setEditing] = useState(!methodHint);
  const [kind, setKind] = useState<"ach" | "zelle">("ach");

  return (
    <div>
      <div className="s-pd-h"><h2 className="s-pp-h2">Getting <em>paid</em></h2></div>
      <form action={prefAction}>
        {(["cash", "credit", "split"] as const).map((p) => (
          <label key={p} className="s-chk" style={choice === p ? { borderColor: "var(--ink)" } : undefined}>
            <input type="radio" name="pref" value={p} checked={choice === p} onChange={() => setChoice(p)} />
            <span style={{ fontSize: 15 }}>
              {p === "cash" ? "All cash" : p === "credit" ? <>All store credit <b>(1.3×)</b></> : <>Split · <input name="splitCashPct" type="number" min={0} max={100} defaultValue={splitCashPct} aria-label="Cash percentage" style={{ width: 56, border: "1px solid var(--line)", background: "var(--paper)", padding: "0 4px" }} />% cash, the rest as credit</>}
              <small className="block text-[13px] text-[color:var(--ink-soft)] mt-0.5">{PREF_NOTE[p]}</small>
            </span>
          </label>
        ))}
        {choice !== "split" && <input type="hidden" name="splitCashPct" value={splitCashPct} />}
        <button type="submit" style={smallBtn}>Save preference</button>
        {prefState?.ok && <span className="text-[12.5px] ml-2" style={{ color: "var(--tested)" }}>Saved</span>}
        {prefState?.error && <p role="alert" className="text-[12.5px] text-[color:var(--specimen)] mt-2">{prefState.error}</p>}
      </form>
      <div className="s-pp-panel" style={{ padding: "14px 16px", marginTop: 16, borderTopWidth: 1 }}>
        <p className="s-micro mb-1.5">Cash payout method</p>
        {!editing && methodHint ? (
          <p className="text-[14px]">{methodHint} <button type="button" className="underline ml-2 text-[color:var(--specimen)]" onClick={() => setEditing(true)}>Change</button></p>
        ) : (
          <form action={methodAction}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {(["ach", "zelle"] as const).map((k) => (
                <label key={k} className="text-[12.5px]"><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} /> {k === "ach" ? "ACH (bank)" : "Zelle"}</label>
              ))}
            </div>
            {kind === "ach" ? (
              <>
                <label htmlFor="pm-routing" className="s-micro block mb-1.5">Routing number</label><input id="pm-routing" name="routing" inputMode="numeric" autoComplete="off" className={field} />
                <label htmlFor="pm-account" className="s-micro block mb-1.5">Checking account number</label><input id="pm-account" name="account" inputMode="numeric" autoComplete="off" className={field} />
                <label htmlFor="pm-bank" className="s-micro block mb-1.5">Bank name</label><input id="pm-bank" name="bank" autoComplete="off" className={field} />
              </>
            ) : (
              <><label htmlFor="pm-zelle" className="s-micro block mb-1.5">Zelle email or US phone</label><input id="pm-zelle" name="handle" autoComplete="off" className={field} /></>
            )}
            <button type="submit" style={smallBtn}>Save method</button>
            <p className="text-[12.5px] text-[color:var(--ink-soft)] mt-2">Stored encrypted. Only the last four digits are shown here.</p>
          </form>
        )}
        {methodState?.ok && <p className="text-[12.5px] mt-2" style={{ color: "var(--tested)" }}>Saved</p>}
        {methodState?.error && <p role="alert" className="text-[12.5px] text-[color:var(--specimen)] mt-2">{methodState.error}</p>}
      </div>
    </div>
  );
}
