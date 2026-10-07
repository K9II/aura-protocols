"use client";

// New no-charge order — port of mock Screen 5 (desktop, two columns with a
// sticky summary) and Screen 7 right (phone, one column with the summary
// line and Create pinned at the bottom). Posts to createNoChargeOrderAction:
// `customer`, `reason`, `replaces`, `note`, repeated `line` =
// slug:variantId:vials, `email` ("on") and the ship_* address fields.
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { createNoChargeOrderAction, type NoChargeState } from "@/app/admin/orders/actions";
import { NO_CHARGE_NOTE_MAX, NO_CHARGE_MAX_VIALS, NO_CHARGE_REASONS, REASON_LABEL, type NoChargeReason, type StockOption } from "@/lib/no-charge/rules";
import { US_STATES, type ShipAddress } from "@/lib/ship-address";
import { shortDate } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { Icon } from "@/components/admin/ui";

type Customer = { id: string; name: string; ship: ShipAddress | null };
type Line = { key: number; sel: string; vials: string };
type Address = { name: string; line1: string; line2: string; city: string; state: string; zip: string };

// Seeding and replacements are expected by the customer; samples and other
// sends may not be, so the email starts off for those.
const emailDefault = (r: NoChargeReason | null) => r === "seeding" || r === "replacement";
const vialsText = (n: number) => `${n} vial${n === 1 ? "" : "s"}`;

function CreateButton({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending}>{pending ? "Creating…" : "Create order"}</button>;
}

export default function NoChargeForm({ customer, stock, originals, month, recipientCard }: {
  customer: Customer; stock: StockOption[]; originals: Array<{ number: string; createdAt: string }>;
  month: { orders: number; retailCents: number }; recipientCard: React.ReactNode;
}) {
  const [state, action] = useActionState<NoChargeState, FormData>(createNoChargeOrderAction, null);
  const err = state?.errors ?? {};
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;
  const firstName = customer.name.trim().split(/\s+/)[0] ?? customer.name;

  const [reason, setReason] = useState<NoChargeReason | null>(null);
  const [replaces, setReplaces] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 0, sel: "", vials: "1" }]);
  const [nextKey, setNextKey] = useState(1);
  const [email, setEmail] = useState(emailDefault(null));
  const [emailTouched, setEmailTouched] = useState(false);
  const saved = customer.ship;
  const [editing, setEditing] = useState(!saved);
  const [addr, setAddr] = useState<Address>({
    name: saved?.name ?? customer.name, line1: saved?.line1 ?? "", line2: saved?.line2 ?? "",
    city: saved?.city ?? "", state: saved?.state ?? "", zip: saved?.zip ?? "",
  });

  const opt = (sel: string) => stock.find((s) => `${s.slug}:${s.variantId}` === sel);
  const count = (l: Line) => { const n = Number(l.vials); return Number.isInteger(n) && n > 0 ? n : 0; };
  const chosen = lines.filter((l) => opt(l.sel));
  const vials = chosen.reduce((s, l) => s + count(l), 0);
  const retail = chosen.reduce((s, l) => s + count(l) * opt(l.sel)!.priceCents, 0);
  const noteRequired = reason === "replacement" || reason === "other";

  const pickReason = (r: NoChargeReason) => { setReason(r); if (!emailTouched) setEmail(emailDefault(r)); };
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => { setLines((ls) => [...ls, { key: nextKey, sel: "", vials: "1" }]); setNextKey((k) => k + 1); };
  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key));
  const setA = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));
  const addrOneLine = `${addr.name} · ${addr.line1}${addr.line2 ? `, ${addr.line2}` : ""}, ${addr.city}, ${addr.state} ${addr.zip}`;

  return (
    <form action={action} className="a-nc-form" noValidate>
      <input type="hidden" name="customer" value={customer.id} />
      {chosen.map((l) => <input key={l.key} type="hidden" name="line" value={`${l.sel}:${l.vials.trim()}`} />)}
      {!editing && <>
        <input type="hidden" name="ship_name" value={addr.name} /><input type="hidden" name="ship_line1" value={addr.line1} />
        <input type="hidden" name="ship_line2" value={addr.line2} /><input type="hidden" name="ship_city" value={addr.city} />
        <input type="hidden" name="ship_state" value={addr.state} /><input type="hidden" name="ship_zip" value={addr.zip} />
      </>}

      <div className="a-nc-grid">
        <div className="a-nc-main">
          {recipientCard}

          <div className="a-card"><div className="a-card-b">
            <div className="a-nstep"><span className="sn">2</span><h3>Reason</h3></div>
            <div className="a-reasons" role="radiogroup" aria-label="Reason">{NO_CHARGE_REASONS.map((r) => (
              <label key={r} className={`opt${reason === r ? " on" : ""}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => pickReason(r)} className="sr-only" />{REASON_LABEL[r]}
              </label>
            ))}</div>
            {err.reason && <div className="a-err" role="alert">{err.reason}</div>}
            <div className={`a-nc-why${reason === "replacement" ? " two" : ""}`}>
              {reason === "replacement" && (
                <div className="a-fld"><label htmlFor={id("orig")}>Original order</label>
                  <select id={id("orig")} name="replaces" className="a-nc-select" value={replaces} onChange={(e) => setReplaces(e.target.value)}>
                    <option value="">{originals.length ? "Choose…" : "No paid orders"}</option>
                    {originals.map((o) => <option key={o.number} value={o.number}>{`${o.number} · ${shortDate(o.createdAt)}`}</option>)}
                  </select>
                  {err.replaces && <div className="a-err" role="alert">{err.replaces}</div>}</div>
              )}
              <div className="a-fld"><label htmlFor={id("note")}>Note {noteRequired && <span className="muted">(required)</span>}</label>
                <div className="a-input"><input id={id("note")} name="note" value={note} maxLength={NO_CHARGE_NOTE_MAX} onChange={(e) => setNote(e.target.value)}
                  placeholder={reason === "replacement" ? "What happened" : reason === "other" ? "What the vials are for" : "Optional"} /></div>
                {err.note && <div className="a-err" role="alert">{err.note}</div>}</div>
            </div>
          </div></div>

          <div className="a-card"><div className="a-card-b">
            <div className="a-nstep"><span className="sn">3</span><h3>Items</h3></div>
            <table className="a-lines">
              <thead className="a-only-desk"><tr><th>Product · strength</th><th>Available</th><th className="num">Retail</th><th>Vials</th><th /></tr></thead>
              <tbody>{lines.map((l) => {
                const o = opt(l.sel);
                const taken = new Set(lines.filter((x) => x.key !== l.key).map((x) => x.sel));
                return (
                  <tr key={l.key}>
                    <td className="prod">
                      <select aria-label="Product · strength" className="a-nc-select" value={l.sel} onChange={(e) => setLine(l.key, { sel: e.target.value })}>
                        <option value="">Choose a strength…</option>
                        {stock.map((s) => { const v = `${s.slug}:${s.variantId}`; return <option key={v} value={v} disabled={taken.has(v)}>{`${s.name} · ${s.strength} — ${s.available} available`}</option>; })}
                      </select>
                      {o?.hidden && <span className="hid">Hidden</span>}
                      {o && <div className="avail a-only-phone">{o.available} available · {usd(o.priceCents)}</div>}
                    </td>
                    <td className="avail a-only-desk">{o ? vialsText(o.available) : ""}</td>
                    <td className="num a-only-desk">{o ? usd(o.priceCents) : ""}</td>
                    <td className="q"><input type="number" aria-label="Vials" className="qty" min={1} max={Math.min(NO_CHARGE_MAX_VIALS, o?.available ?? NO_CHARGE_MAX_VIALS)} value={l.vials} onChange={(e) => setLine(l.key, { vials: e.target.value })} /></td>
                    <td className="rm"><button type="button" className="a-linkbtn muted" onClick={() => removeLine(l.key)}>Remove</button></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {err.lines && <div className="a-err" role="alert">{err.lines}</div>}
            <button type="button" className="a-btn sm" style={{ marginTop: 10 }} onClick={addLine}><Icon name="plus" />Add item</button>
          </div></div>

          <div className="a-card"><div className="a-card-b">
            <div className="a-nstep"><span className="sn">4</span><h3>Ship to</h3>
              {!editing && <button type="button" className="a-linkbtn a-nc-edit a-only-desk" onClick={() => setEditing(true)}>Edit</button>}</div>
            {editing ? (
              <div className="a-nc-addr">
                <div className="a-fld"><label htmlFor={id("name")}>Name</label><div className="a-input"><input id={id("name")} name="ship_name" value={addr.name} onChange={setA("name")} autoComplete="off" /></div></div>
                <div className="a-fld"><label htmlFor={id("l1")}>Address</label><div className="a-input"><input id={id("l1")} name="ship_line1" value={addr.line1} onChange={setA("line1")} autoComplete="off" /></div></div>
                <div className="a-fld"><label htmlFor={id("l2")}>Apt, suite <span className="muted">(optional)</span></label><div className="a-input"><input id={id("l2")} name="ship_line2" value={addr.line2} onChange={setA("line2")} autoComplete="off" /></div></div>
                <div className="a-nc-csz">
                  <div className="a-fld"><label htmlFor={id("city")}>City</label><div className="a-input"><input id={id("city")} name="ship_city" value={addr.city} onChange={setA("city")} autoComplete="off" /></div></div>
                  <div className="a-fld"><label htmlFor={id("st")}>State</label><select id={id("st")} name="ship_state" className="a-nc-select" value={addr.state} onChange={setA("state")}>
                    <option value="">—</option>{US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="a-fld"><label htmlFor={id("zip")}>ZIP</label><div className="a-input"><input id={id("zip")} name="ship_zip" value={addr.zip} onChange={setA("zip")} inputMode="numeric" autoComplete="off" /></div></div>
                </div>
              </div>
            ) : (
              <>
                <div className="a-addr a-only-desk">{addr.name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.zip}</div>
                <div className="a-addr a-only-phone">{addrOneLine} <button type="button" className="a-linkbtn" onClick={() => setEditing(true)}>Edit</button></div>
                <div className="a-nc-help">From the customer&apos;s saved address.</div>
              </>
            )}
          </div></div>
        </div>

        <div className="a-nc-side">
          <div className="a-card">
            <div className="a-card-h"><h3>Summary</h3></div>
            <div className="a-card-b">
              <div className="a-sumrow"><span>Vials</span><span>{vials}</span></div>
              <div className="a-sumrow"><span>Retail value</span><span>{usd(retail)}</span></div>
              <div className="a-sumrow"><span>Shipping</span><span>{usd(0)}</span></div>
              <div className="a-sumrow big"><span>Charged</span><span>{usd(0)}</span></div>
              <label className="a-checkline">
                <input type="checkbox" name="email" className="sr-only" checked={email} onChange={(e) => { setEmail(e.target.checked); setEmailTouched(true); }} />
                <span className="box" aria-hidden />
                <span>Email {firstName} that it&apos;s on its way<br /><small>no prices in the email · the tracking email follows when you ship</small></span>
              </label>
              {err.form && <div className="a-err" role="alert">{err.form}</div>}
              <CreateButton className="a-btn primary a-nc-create a-only-desk" />
              <div className="a-nc-help">{vials === 0 ? "Vials are" : vials === 1 ? "1 vial is" : `${vials} vials are`} taken from stock now. Cancel any time before it ships to put them back.</div>
              <div className="a-monthline">This month: {month.orders} no-charge order{month.orders === 1 ? "" : "s"} · {usd(month.retailCents)} at retail</div>
            </div>
          </div>
        </div>
      </div>

      <div className="a-nc-bar a-only-phone">
        <div className="line"><span>{vialsText(vials)} · {usd(retail)} retail</span><b>{usd(0)} charged</b></div>
        <CreateButton className="a-btn primary a-nc-create" />
      </div>
    </form>
  );
}
