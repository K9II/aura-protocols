"use client";

// Create / edit / batch code form — port of mock screens 2 (single) and 3
// (batch Code section). Posts to saveCodeAction (app/admin/discounts/actions.ts).
import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { compounds, CHEMICAL_CLASSES } from "@/data/catalog";
import { codeAvailableAction, saveCodeAction, type SaveState } from "@/app/admin/discounts/actions";
import { generateBatchCodes, MAX_BATCH_SIZE, normalizePrefix, ruleSentence, type CodeKind, type CodeTerms, type DiscountCodeRow } from "@/lib/discounts/rules";
import { typicalBaskets, worstCase } from "@/lib/discounts/preview";
import { isoToZonedLocal, shortDate, zonedToIso } from "@/lib/discounts/time";
import { usd } from "@/lib/html";
import { FREE_SHIPPING_MIN_CENTS } from "@/lib/pricing";
import { Chip, Icon } from "@/components/admin/ui";

type Token = { type: "class" | "product"; value: string };
const KINDS: Array<{ id: CodeKind; label: string; hint: string }> = [
  { id: "item_pct", label: "Item %", hint: "Competes with pack and new-account per item; larger wins" },
  { id: "order_pct", label: "Order %", hint: "Off the goods total" },
  { id: "order_amount", label: "Order $", hint: "Fixed amount off goods" },
  { id: "ship_only", label: "Free shipping", hint: "Shipping only" },
];
// Bounds match parseRule in actions.ts.
const MAX_NOTE_LEN = 120;
const MAX_ORDER_AMOUNT = 10_000;
const MAX_MIN_ORDER = 100_000;
const MAX_USES = 1_000_000;

const nameOf = (slug: string) => compounds.find((c) => c.slug === slug)?.name ?? slug;

function Toggle({ on, set, label, help, kind }: { on: boolean; set: (b: boolean) => void; label: string; help?: string; kind: "switch" | "checkbox" }) {
  const id = useId();
  return (
    <div className="a-toggle">
      <button type="button" role={kind} aria-checked={on} aria-labelledby={`${id}-l`} aria-describedby={help ? `${id}-h` : undefined}
        className={kind === "switch" ? `a-sw${on ? " on" : ""}` : `a-cb${on ? " on" : ""}`} onClick={() => set(!on)} />
      <div><b id={`${id}-l`} className="a-toggle-l" onClick={() => set(!on)}>{label}</b>{help && <small id={`${id}-h`}>{help}</small>}</div>
    </div>
  );
}

const dollars = (cents: number) => (cents % 100 === 0 ? `$${(cents / 100).toLocaleString("en-US")}` : usd(cents));

// Mock screen 2: "Oct 5 – Oct 31, 2026 (27 days)". Inputs are Mountain datetime-local strings.
function runsText(startsAt: string, endsAt: string): string {
  const iso = (v: string) => { if (!v) return null; try { return zonedToIso(v); } catch { return null; } };
  const s = iso(startsAt), e = iso(endsAt);
  const year = (v: string) => v.slice(0, 4);
  if (!e) return `${s ? shortDate(s) : "From now"} – no end`;
  const from = s ? `${shortDate(s)}${year(startsAt) !== year(endsAt) ? `, ${year(startsAt)}` : ""}` : "Now";
  const days = Math.round((Date.parse(e) - (s ? Date.parse(s) : Date.now())) / 86_400_000);
  return `${from} – ${shortDate(e)}, ${year(endsAt)}${days > 0 ? ` (${days} day${days === 1 ? "" : "s"})` : ""}`;
}

// The summary sentence starts with the code; show it in mono as in the mock.
function SummaryText({ label, text }: { label: string; text: string }) {
  if (!text.startsWith(label)) return <>{text}</>;
  return <><span className="a-code">{label}</span>{text.slice(label.length)}</>;
}

function futureStart(local: string): string | null {
  if (!local) return null;
  try {
    const iso = zonedToIso(local);
    return Date.parse(iso) > Date.now() ? shortDate(iso) : null;
  } catch { return null; }
}

export default function DiscountForm({ mode, capPct, existing }: { mode: "single" | "batch"; capPct: number; existing?: DiscountCodeRow }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveCodeAction, null);
  const fe = state?.fieldErrors ?? {};
  const [code, setCode] = useState(existing?.code ?? "");
  const [prefix, setPrefix] = useState("");
  const [count, setCount] = useState("50");
  const [note, setNote] = useState(existing?.note ?? "");
  const [kind, setKind] = useState<CodeKind>(existing?.kind ?? "item_pct");
  const [value, setValue] = useState(existing ? String(existing.kind === "order_amount" ? existing.value / 100 : existing.value || "") : "");
  const [onTop, setOnTop] = useState(existing?.stack_on_top ?? false);
  const [freeShip, setFreeShip] = useState(existing?.free_shipping ?? false);
  const [startsAt, setStartsAt] = useState(existing?.starts_at ? isoToZonedLocal(existing.starts_at) : "");
  const [endsAt, setEndsAt] = useState(existing?.ends_at ? isoToZonedLocal(existing.ends_at) : "");
  const [maxUses, setMaxUses] = useState(existing?.max_uses != null ? String(existing.max_uses) : "");
  const [once, setOnce] = useState(existing?.once_per_customer ?? true);
  const [lock, setLock] = useState(!!existing?.locked_email);
  const [lockedEmail, setLockedEmail] = useState(existing?.locked_email ?? "");
  const [minOrder, setMinOrder] = useState(existing?.min_order_cents != null ? String(existing.min_order_cents / 100) : "");
  const initialScope = existing && (existing.include_slugs.length + existing.include_classes.length) ? "only" : existing && (existing.exclude_slugs.length + existing.exclude_classes.length) ? "except" : "all";
  const [scope, setScope] = useState<"all" | "only" | "except">(initialScope);
  const [tokens, setTokens] = useState<Token[]>(existing ? [
    ...[...existing.include_classes, ...existing.exclude_classes].map((value) => ({ type: "class" as const, value })),
    ...[...existing.include_slugs, ...existing.exclude_slugs].map((value) => ({ type: "product" as const, value })),
  ] : []);
  // The last availability answer, tagged with the code it was for.
  const [availFor, setAvailFor] = useState<{ code: string; ok: boolean; message: string } | null>(null);

  const batch = mode === "batch";
  const isOrder = kind === "order_pct" || kind === "order_amount";
  const terms: CodeTerms = useMemo(() => {
    const n = Number(value);
    const v = kind === "order_amount" ? Math.round(n * 100) : kind === "ship_only" ? 0 : Math.round(n);
    const pick = (t: Token["type"]) => tokens.filter((x) => x.type === t).map((x) => x.value);
    return {
      kind, value: Number.isFinite(v) ? v : 0, stackOnTop: isOrder && onTop, freeShipping: kind !== "ship_only" && freeShip,
      minOrderCents: minOrder ? Math.round(Number(minOrder) * 100) || null : null,
      includeSlugs: scope === "only" ? pick("product") : [], excludeSlugs: scope === "except" ? pick("product") : [],
      includeClasses: scope === "only" ? pick("class") : [], excludeClasses: scope === "except" ? pick("class") : [],
    };
  }, [kind, value, isOrder, onTop, freeShip, minOrder, scope, tokens]);
  const valid = kind === "ship_only" || terms.value > 0;
  const label = batch ? (existing ? "Each code" : `${normalizePrefix(prefix) || "PREFIX-"}·····`) : (code.trim().toUpperCase() || "This code");
  const worst = useMemo(() => (valid ? worstCase(terms, compounds, capPct) : null), [terms, valid, capPct]);
  const baskets = useMemo(() => (valid ? typicalBaskets(terms, compounds, capPct) : []), [terms, valid, capPct]);
  const startsOn = futureStart(startsAt);

  const checkable = mode === "single" && !existing && code.trim().length >= 3;
  const avail = checkable && availFor?.code === code ? availFor : null;
  useEffect(() => {
    if (!checkable) return;
    let cancelled = false; // a slower, older response must not overwrite a newer one
    const t = setTimeout(() => {
      void codeAvailableAction(code).then((r) => { if (!cancelled) setAvailFor({ code, ...r }); }).catch(() => { if (!cancelled) setAvailFor(null); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [code, checkable]);

  const addToken = (raw: string) => {
    if (!raw) return;
    const [type, v] = raw.split(":", 2) as [Token["type"], string];
    if (!tokens.some((t) => t.type === type && t.value === v)) setTokens([...tokens, { type, value: v }]);
  };
  const errId = (k: string) => `d-err-${k}`;
  const err = (k: string) => fe[k] && <div className="a-err" id={errId(k)} role="alert">{fe[k]}</div>;
  // aria-invalid + aria-describedby (error first, then help) for an input.
  const aria = (k: string, helpId?: string) => {
    const ids = [fe[k] ? errId(k) : null, helpId ?? null].filter(Boolean).join(" ");
    return { "aria-invalid": fe[k] ? true : undefined, "aria-describedby": ids || undefined } as const;
  };
  const hasFieldErrors = Object.keys(fe).length > 0;
  const shipOnly = kind === "ship_only";
  const noteField = (
    <div className="a-fld">
      <label htmlFor="d-note">Internal note <span className="opt">· optional</span></label>
      <div className="a-input"><input id="d-note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE_LEN} {...aria("note", "d-note-help")} /></div>
      <div className="help" id="d-note-help">Only you see this.</div>{err("note")}
    </div>
  );

  return (
    <form action={action} className="a-grid2">
      <input type="hidden" name="mode" value={mode} />
      {existing && <input type="hidden" name="id" value={existing.id} />}
      <input type="hidden" name="kind" value={kind} />
      {/* Free shipping has no product scope: never post a stale "only" list. */}
      <input type="hidden" name="scope" value={shipOnly ? "all" : scope} />
      <input type="hidden" name="scopeItems" value={shipOnly ? "[]" : JSON.stringify(tokens)} />
      {onTop && <input type="hidden" name="stackOnTop" value="on" />}
      {freeShip && <input type="hidden" name="freeShipping" value="on" />}
      {once && <input type="hidden" name="oncePerCustomer" value="on" />}
      {!batch && lock && <input type="hidden" name="lockEmail" value="on" />}

      <div>
        <section className="a-fsec">
          <div className="a-fsec-h"><h3>{batch ? "Codes" : "Code"}</h3></div>
          <div className="a-fsec-b">
            {batch && existing ? (
              <>
                <p className="help">Codes are fixed once generated.</p>
                {noteField}
              </>
            ) : batch ? (
              <>
                <div className="a-row">
                  <div className="a-fld"><label htmlFor="d-prefix">Prefix</label><div className="a-input mono"><input id="d-prefix" name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="VIP-OCT-" maxLength={12} autoComplete="off" required {...aria("prefix")} /></div>{err("prefix")}</div>
                  <div className="a-fld"><label htmlFor="d-count">How many</label><div className="a-input"><input id="d-count" name="count" type="number" min={1} max={MAX_BATCH_SIZE} step={1} value={count} onChange={(e) => setCount(e.target.value)} required {...aria("count", "d-count-help")} /></div><div className="help" id="d-count-help">Up to {MAX_BATCH_SIZE.toLocaleString("en-US")}.</div>{err("count")}</div>
                </div>
                <div className="a-fld"><label htmlFor="d-example">Example</label><div className="a-input mono dis"><input id="d-example" readOnly value={`${normalizePrefix(prefix) || "PREFIX-"}7KQ2M`} aria-describedby="d-example-help" /></div><div className="help" id="d-example-help">5 random characters, no look-alikes (0/O, 1/I). Each code works once.</div></div>
                {noteField}
              </>
            ) : (
              <div className="a-row">
                <div className="a-fld">
                  <label htmlFor="d-code">Code</label>
                  <div className="a-input mono">
                    <input id="d-code" name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} readOnly={!!existing} maxLength={24} autoComplete="off" {...aria("code", "d-code-help")} />
                    {!existing && <button type="button" className="a-btn ghost sm" style={{ marginRight: 3 }} onClick={() => setCode(generateBatchCodes("", 1)[0])}>Generate</button>}
                  </div>
                  <div className="help" id="d-code-help">{existing ? "A code's text can't change." : "Letters, numbers and dashes. Customers can type it in any case."}</div>{err("code")}
                </div>
                {noteField}
              </div>
            )}
          </div>
        </section>

        <section className="a-fsec">
          <div className="a-fsec-h"><h3>Discount</h3></div>
          <div className="a-fsec-b">
            <div className="a-seg" role="radiogroup" aria-label="Kind" {...aria("kind")}>
              {KINDS.map((k) => (
                <button type="button" key={k.id} role="radio" aria-checked={kind === k.id} className={kind === k.id ? "on" : undefined} onClick={() => setKind(k.id)} disabled={!!existing}>
                  <b>{k.label}</b><small>{k.hint}</small>
                </button>
              ))}
            </div>
            {err("kind")}
            {kind !== "ship_only" && (
              <div className="a-fld">
                <label htmlFor="d-value">{kind === "order_amount" ? "Amount off" : "Percent off"}</label>
                <div className="a-input" style={{ width: 160 }}>
                  {kind === "order_amount" && <span className="affix l">$</span>}
                  <input id="d-value" name="value" type="number" value={value} onChange={(e) => setValue(e.target.value)}
                    min={kind === "order_amount" ? 0.01 : 1} max={kind === "order_amount" ? MAX_ORDER_AMOUNT : 100} step={kind === "order_amount" ? 0.01 : 1} required {...aria("value")} />
                  {kind !== "order_amount" && <span className="affix">%</span>}
                </div>
                {err("value")}
              </div>
            )}
            {isOrder && <Toggle kind="switch" on={onTop} set={setOnTop} label="Apply on top of item discounts" help="On: applies after pack, new-account and partner discounts. Off: the customer gets whichever is larger — those, or this code." />}
            {kind !== "ship_only" && <Toggle kind="checkbox" on={freeShip} set={setFreeShip} label="Also give free shipping" help="Free shipping always combines with other discounts." />}
          </div>
        </section>

        <section className="a-fsec">
          <div className="a-fsec-h"><h3>Dates and limits</h3><span>Every code should end and have a limit</span></div>
          <div className="a-fsec-b">
            <div className="a-row">
              <div className="a-fld"><label htmlFor="d-start">Starts</label><div className="a-input"><input id="d-start" type="datetime-local" name="startsAt" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} {...aria("startsAt", "d-start-help")} /></div><div className="help" id="d-start-help">Empty = now.</div>{err("startsAt")}</div>
              <div className="a-fld"><label htmlFor="d-end">Ends</label><div className="a-input"><input id="d-end" type="datetime-local" name="endsAt" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} {...aria("endsAt", "d-end-help")} /></div><div className="help" id="d-end-help">Mountain time.</div>{err("endsAt")}</div>
            </div>
            <div className="a-row">
              {!batch && <div className="a-fld"><label htmlFor="d-max">Total uses</label><div className="a-input" style={{ width: 140 }}><input id="d-max" name="maxUses" type="number" min={1} max={MAX_USES} step={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} {...aria("maxUses", "d-max-help")} /></div><div className="help" id="d-max-help">1 makes it a one-time code. Empty = no limit.</div>{err("maxUses")}</div>}
              <div className="a-fld"><label htmlFor="d-min">Minimum order</label><div className="a-input" style={{ width: 160 }}><span className="affix l">$</span><input id="d-min" name="minOrder" type="number" min={0} max={MAX_MIN_ORDER} step={0.01} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} {...aria("minOrder", "d-min-help")} /></div><div className="help" id="d-min-help">Goods after item discounts.</div>{err("minOrder")}</div>
            </div>
            <Toggle kind="checkbox" on={once} set={setOnce} label={batch ? "Once per customer (across the batch)" : "Once per customer"} />
            {!batch && <Toggle kind="checkbox" on={lock} set={setLock} label="Lock to one email" help="Only that account can use it." />}
            {!batch && lock && <div className="a-fld"><label htmlFor="d-email">Account email</label><div className="a-input"><input id="d-email" name="lockedEmail" type="email" maxLength={254} value={lockedEmail} onChange={(e) => setLockedEmail(e.target.value)} required {...aria("lockedEmail")} /></div>{err("lockedEmail")}</div>}
          </div>
        </section>

        {kind !== "ship_only" && (
          <section className="a-fsec">
            <div className="a-fsec-h"><h3>What it applies to</h3></div>
            <div className="a-fsec-b">
              <div className="a-seg2" role="radiogroup" aria-label="Applies to" {...aria("scope")}>
                {([["all", "All products"], ["only", "Only these"], ["except", "All except"]] as const).map(([k, l]) => (
                  <button type="button" key={k} role="radio" aria-checked={scope === k} className={scope === k ? "on" : undefined} onClick={() => setScope(k)}>{l}</button>
                ))}
              </div>
              {err("scope")}
              {scope !== "all" && (
                <div className="a-fld">
                  <div className="a-tokens" role="group" aria-label="Products and classes" {...aria("scopeItems")}>
                    {tokens.map((t) => (
                      <span key={`${t.type}:${t.value}`} className="a-tok"><em>{t.type === "class" ? "Class" : "Product"}</em>{t.type === "class" ? t.value : nameOf(t.value)}
                        <button type="button" className="x" aria-label={`Remove ${t.type === "class" ? t.value : nameOf(t.value)}`} onClick={() => setTokens(tokens.filter((x) => x !== t))}>×</button></span>
                    ))}
                    <select aria-label="Add a product or chemical class" value="" onChange={(e) => addToken(e.target.value)}>
                      <option value="">Add a product or chemical class…</option>
                      <optgroup label="Chemical classes">{CHEMICAL_CLASSES.map((c) => <option key={c} value={`class:${c}`}>{c}</option>)}</optgroup>
                      <optgroup label="Products">{compounds.map((c) => <option key={c.slug} value={`product:${c.slug}`}>{c.name}</option>)}</optgroup>
                    </select>
                  </div>
                </div>
              )}
              {err("scopeItems")}
              <div className="a-lockline"><Icon name="lock" />Redeemable by signed-in accounts with a confirmed email. One code per order.</div>
            </div>
          </section>
        )}

        <div className="a-savebar">
          <div className="msg">
            {state?.error || hasFieldErrors ? (
              <span className="a-err" role="alert">{[state?.error, hasFieldErrors ? "Fix the fields marked below." : null].filter(Boolean).join(" ")}</span>
            ) : avail ? <><Icon name={avail.ok ? "check" : "warn"} />{avail.message}</> : null}
          </div>
          <div className="r">
            <Link className="a-btn ghost" href="/admin/discounts">Cancel</Link>
            {!existing && <button className="a-btn" type="submit" name="intent" value="paused" disabled={pending}>Save paused</button>}
            <button className="a-btn primary" type="submit" name="intent" value="create" disabled={pending}>{existing ? "Save changes" : batch ? "Generate codes" : "Create code"}</button>
          </div>
        </div>
      </div>

      <aside className="a-sticky">
        <div className="a-card">
          <div className="a-card-h"><h3>Summary</h3>{startsOn && <span className="r"><Chip tone="sched">Starts {startsOn}</Chip></span>}</div>
          <div className="a-card-b">
            <p className="a-summary" data-testid="rule-summary">{valid ? <SummaryText label={label} text={ruleSentence(label, terms, nameOf)} /> : "Set a value to see the rule."}</p>
            <dl className="a-facts">
              <dt>Runs</dt><dd>{runsText(startsAt, endsAt)}</dd>
              <dt>Limit</dt><dd>{batch ? `${existing ? "One use per code" : `${count || 0} codes · one use each`}` : maxUses ? `${maxUses} uses` : "No limit"}{once ? " · once per customer" : ""}</dd>
              <dt>Cap</dt><dd>Store-wide {capPct}% still applies</dd>
            </dl>
          </div>
        </div>
        <div className="a-card">
          <div className="a-card-h"><h3>Worst-case basket</h3><span className="sub">largest discount this code allows</span></div>
          <div className="a-card-b" data-testid="worst-case">
            {!worst ? <p className="muted">No listed product qualifies yet.</p> : (
              <table className="a-wc"><tbody>
                <tr><td className="lbl">{worst.label}<br /><small>{worst.packQty > 1 ? `${worst.packQty}-pack` : "single"}{worst.newAccount ? " · new account" : ""}</small></td><td className="num">{usd(worst.listCents)}</td></tr>
                {worst.packCents > 0 && <tr><td className="lbl">{worst.packQty}-pack price · {worst.packPct}%</td><td className="num">−{usd(worst.packCents)}</td></tr>}
                {worst.autoCents > 0 && <tr><td className="lbl">New-account discount</td><td className="num">−{usd(worst.autoCents)}</td></tr>}
                {worst.codeCents > 0 && <tr><td className="lbl">{label} · {terms.kind === "order_amount" ? dollars(terms.value) : `${terms.value}%`}{terms.stackOnTop ? " on top" : ""}</td><td className="num">−{usd(worst.codeCents)}</td></tr>}
                {worst.capped && <tr className="cap"><td className="lbl">Store-wide cap · {worst.uncappedOffPct}% → {capPct}%</td><td className="num">+{usd(worst.cappedCents)}</td></tr>}
                <tr><td className="lbl">Shipping{worst.shippingCents === 0 ? (worst.paysCents >= FREE_SHIPPING_MIN_CENTS ? ` · free over ${dollars(FREE_SHIPPING_MIN_CENTS)} anyway` : " · free with this code") : ""}</td><td className="num">{usd(worst.shippingCents)}</td></tr>
                <tr className="total"><td>Goods total · {worst.offPct}% off list</td><td className="num">{usd(worst.paysCents)}</td></tr>
              </tbody></table>
            )}
          </div>
          {worst?.capped && <div style={{ padding: "0 16px 16px" }}><div className="a-callout warn" role="note"><Icon name="warn" /><div>On {worst.label} this code would reach {worst.uncappedOffPct}%. The {capPct}% cap trims it, and the order line shows &quot;capped at {capPct}%&quot;.</div></div></div>}
        </div>
        {baskets.length > 0 && (
          <div className="a-card">
            <div className="a-card-h"><h3>Typical baskets</h3></div>
            <div className="a-card-b" style={{ paddingTop: 10 }}>
              <table className="a-bk">
                <thead><tr><th>Basket · list</th><th>Pays</th><th>Off list</th></tr></thead>
                <tbody>{baskets.map((b) => (
                  <tr key={b.label + b.listCents}>
                    <td>{b.label} · {usd(b.listCents)}<small>{b.note}</small></td>
                    <td className={b.codeUsed ? undefined : "na"}>{usd(b.paysCents)}</td>
                    <td className={b.capped ? "capped" : b.codeUsed ? undefined : "na"}>{b.codeUsed ? <><span className="a-pct"><i style={{ width: `${Math.min(100, (b.offPct / capPct) * 100)}%`, ...(b.capped ? { background: "var(--specimen)" } : {}) }} /><b /></span>{b.offPct}%{b.capped ? " cap" : ""}</> : "no code"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </aside>
    </form>
  );
}
