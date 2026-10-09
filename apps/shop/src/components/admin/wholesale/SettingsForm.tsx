"use client";

// Admin → Wholesale → Settings (mock a6). The first tier always starts at the
// minimum; tiers 2 and 3 are optional. The server re-validates everything.
import { useActionState, useState } from "react";
import { saveWholesaleSettingsAction } from "@/app/admin/wholesale/actions";
import type { WholesaleSettings } from "@/lib/wholesale/rules";

export default function SettingsForm({ s, autoCutoffLabel }: { s: WholesaleSettings; autoCutoffLabel: string }) {
  const [state, action, pending] = useActionState(saveWholesaleSettingsAction, null);
  const [minKits, setMinKits] = useState(String(s.minKits));
  const e = state?.fieldErrors ?? {};
  const err = (k: string) => (e[k] ? <div className="a-err" role="alert">{e[k]}</div> : null);
  const tier = (i: number) => s.tiers[i];
  return (
    <form action={action} className="a-card" style={{ maxWidth: 720 }}>
      <div className="a-card-b">
        <label className="a-cbrow" style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 14 }}>
          <input type="checkbox" name="open" defaultChecked={s.open} style={{ marginTop: 3 }} />
          <span><b>Wholesale ordering is open</b><span className="muted" style={{ display: "block", fontSize: 12 }}>Off: /wholesale shows the inquiry form only. Keep it off until the processor approves the deposit + balance charges.</span></span>
        </label>
        <div className="a-row3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="a-fld"><label htmlFor="ws-min">Minimum kits per order</label><input id="ws-min" name="minKits" className="a-input" inputMode="numeric" value={minKits} onChange={(x) => setMinKits(x.target.value)} />{err("minKits")}</div>
          <div className="a-fld"><label htmlFor="ws-dep">Deposit %</label><input id="ws-dep" name="depositPct" className="a-input" inputMode="numeric" defaultValue={s.depositPct} />{err("depositPct")}</div>
          <div className="a-fld"><label htmlFor="ws-bal">Balance due within (days)</label><input id="ws-bal" name="balanceDays" className="a-input" inputMode="numeric" defaultValue={s.balanceDays} />{err("balanceDays")}</div>
        </div>
        <div className="a-fld"><label>Volume tiers</label>
          <table className="a-t a-ws-tiers"><thead><tr><th>From kits</th><th>Discount off list × 10</th></tr></thead><tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>
                <td>{i === 0
                  ? <><input className="a-input" value={minKits} disabled aria-label="Tier 1 from kits (= the minimum)" /> <span className="muted" style={{ fontSize: 12 }}>= the minimum</span></>
                  : <input name={`tierKits${i}`} className="a-input" inputMode="numeric" defaultValue={tier(i)?.minKits ?? ""} aria-label={`Tier ${i + 1} from kits`} />}
                  {err(`tierKits${i}`)}</td>
                <td><input name={`tierPct${i}`} className="a-input" inputMode="numeric" defaultValue={tier(i)?.pct ?? ""} aria-label={`Tier ${i + 1} discount %`} />{err(`tierPct${i}`)}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        <div className="a-row3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div className="a-fld"><label htmlFor="ws-run">Run every (days)</label><input id="ws-run" name="runDays" className="a-input" inputMode="numeric" defaultValue={s.runDays} />{err("runDays")}</div>
          <div className="a-fld"><label htmlFor="ws-cut">Next order-by date</label><input id="ws-cut" name="nextCutoff" type="date" className="a-input" defaultValue={s.nextCutoffOverride ?? ""} />
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Empty = automatic ({autoCutoffLabel})</div>{err("nextCutoff")}</div>
          <div className="a-fld"><label htmlFor="ws-lead">Order-by → ships (days)</label><input id="ws-lead" name="leadDays" className="a-input" inputMode="numeric" defaultValue={s.leadDays} />{err("leadDays")}</div>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" className="a-btn primary" disabled={pending}>Save settings</button>
          {state?.ok && <span className="a-flash" role="status">{state.ok}</span>}
          {state?.error && <span className="a-err" role="alert">{state.error}</span>}
        </div>
      </div>
    </form>
  );
}
