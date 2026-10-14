"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ChemicalClass, Compound } from "@/data/catalog";
import { useCart } from "@/components/store/CartProvider";
import Vial from "@/components/store/Vial";
import { useFocusTrap } from "@/components/store/useFocusTrap";
import { compoundTitle, fromPackPriceUsd, isPendingLot, vialCap, vialLabel, vialParts } from "@/lib/catalog";
import { formatUsd } from "@/lib/cart";
import { CLASS_COLOR } from "@/lib/class-colors";
import {
  coaLookupHref, lotSuggestion, popularSearches, searchClasses, searchCompounds, shopClassHref,
} from "@/lib/site-search";

// Nav search (mock "Storefront Search", approved 2026-10-14): a Search button
// (or "/") opens a panel over the page. Suggestions before typing; results as
// you type or after picking a class; the highlighted compound's vial previews
// beside the list (above it on phones).

type Row =
  | { kind: "lot"; key: string; href: string; title: string; meta: string }
  | { kind: "compound"; key: string; href: string; c: Compound };

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

function strengthsText(c: Compound): string {
  return c.variants.map((v) => v.strength).join(" · ");
}

export default function SiteSearch() {
  const { catalog } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cls, setCls] = useState<ChemicalClass | null>(null);
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // "/" or Ctrl/Cmd+K opens search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target);
      const cmdK = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (slash || cmdK) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      inputRef.current?.focus();
    } else if (previouslyFocusedRef.current) {
      previouslyFocusedRef.current.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open]);

  useFocusTrap(panelRef, open);

  const rows = useMemo<Row[]>(() => {
    const hits = searchCompounds(catalog, query, cls);
    const lot = cls ? null : lotSuggestion(catalog, query, hits.length);
    const out: Row[] = hits.map((c) => ({ kind: "compound", key: c.slug, href: `/products/${c.slug}`, c }));
    if (lot) {
      out.unshift({
        kind: "lot", key: `lot-${lot.lot}`, href: coaLookupHref(lot.lot), title: `Lot ${lot.lot}`,
        meta: lot.compound ? `${lot.compound.name} ${lot.strength} · certificate lookup` : "Certificate lookup",
      });
    }
    return out;
  }, [catalog, query, cls]);

  const q = query.trim();
  const showResults = !!q || !!cls;
  const current = Math.min(active, Math.max(rows.length - 1, 0));
  const highlighted = rows[current];
  const preview = highlighted?.kind === "compound" ? highlighted.c : rows.find((r): r is Extract<Row, { kind: "compound" }> => r.kind === "compound")?.c;
  const compoundCount = rows.filter((r) => r.kind === "compound").length;
  const label = cls && !q
    ? `${cls} · ${compoundCount} compound${compoundCount === 1 ? "" : "s"}`
    : `${rows.length} match${rows.length === 1 ? "" : "es"}${cls ? ` in ${cls}` : ""}`;

  const close = () => setOpen(false);
  const reset = () => { setQuery(""); setCls(null); setActive(0); };
  const typed = (v: string) => { setQuery(v); setActive(0); };
  const pickClass = (c: ChemicalClass) => { setCls(c); setQuery(""); setActive(0); inputRef.current?.focus(); };

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(current + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(current - 1, 0)); }
    else if (e.key === "Enter" && highlighted) { e.preventDefault(); close(); router.push(highlighted.href); }
    else if (e.key === "Backspace" && !query && cls) { setCls(null); setActive(0); }
  }

  return (
    <>
      <button type="button" className="s-nav-search" onClick={() => setOpen(true)} aria-label="Search the catalog" title="Search ( / )" aria-haspopup="dialog">
        <SearchIcon />
      </button>
      {open && (
        <div className="pharmacopoeia s-sx">
          <div className="s-sx-backdrop" onClick={close} />
          <div ref={panelRef} className="s-sx-panel" role="dialog" aria-modal="true" aria-label="Search Aura Protocols">
            <div className="s-sx-head">
              <div>
                <p className="s-micro s-sx-eyebrow">Search Aura Protocols</p>
                <h2 className="s-sx-h">Find a <em>compound.</em></h2>
              </div>
              <button type="button" className="s-sx-close" onClick={close} aria-label="Close search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M5 5l14 14M19 5L5 19" /></svg>
              </button>
            </div>

            <div className="s-sx-box">
              <SearchIcon />
              {cls && (
                <button type="button" className="s-sx-chip" onClick={() => { setCls(null); setActive(0); inputRef.current?.focus(); }} aria-label={`Remove ${cls} filter`}>
                  <i aria-hidden style={{ background: CLASS_COLOR[cls] }} />{cls}<span aria-hidden>×</span>
                </button>
              )}
              <label htmlFor="site-search" className="sr-only">Search compounds, blends or a lot number</label>
              <input
                ref={inputRef}
                id="site-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => typed(e.target.value)}
                onKeyDown={onInputKey}
                placeholder={cls ? `Narrow ${cls.toLowerCase()}…` : "Compound, blend nickname, class, or lot number"}
              />
              {showResults && <button type="button" className="s-sx-clear s-micro" onClick={() => { reset(); inputRef.current?.focus(); }}>Clear</button>}
            </div>

            {!showResults ? (
              <div className="s-sx-suggest">
                <div>
                  <p className="s-micro s-sx-k">Popular searches</p>
                  <div className="s-sx-pills">
                    {popularSearches(catalog).map((p) => (
                      <button key={p} type="button" onClick={() => { typed(p); inputRef.current?.focus(); }}>{p}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="s-micro s-sx-k">Browse by class</p>
                  <div className="s-sx-pills">
                    {searchClasses(catalog).map(({ cls: c, count }) => (
                      <button key={c} type="button" onClick={() => pickClass(c)}>
                        <i aria-hidden style={{ background: CLASS_COLOR[c] }} />{c}<span>{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="s-sx-results">
                <div className="s-sx-list">
                  <p className="s-micro s-sx-k" role="status" aria-live="polite">{rows.length ? label : "No matches"}</p>
                  {rows.length > 0 && (
                    <ul>
                      {rows.map((r, i) => (
                        <li key={r.key}>
                          <Link
                            href={r.href}
                            className="s-sx-row"
                            data-active={i === current || undefined}
                            onMouseEnter={() => setActive(i)}
                            onFocus={() => setActive(i)}
                            onClick={close}
                            style={{ "--cls": r.kind === "compound" ? CLASS_COLOR[r.c.chemicalClass] : "var(--ink)" } as CSSProperties}
                          >
                            <span className="s-sx-row-t">
                              <span className="s-sx-row-n">{r.kind === "compound" ? compoundTitle(r.c) : r.title}</span>
                              <span className="s-micro s-sx-row-m">
                                {r.kind === "compound"
                                  ? `${cls ? "" : `${r.c.chemicalClass} · `}${strengthsText(r.c)} · from ${formatUsd(fromPackPriceUsd(r.c))}`
                                  : r.meta}
                              </span>
                            </span>
                            <span className="s-micro s-sx-row-go" aria-hidden>{r.kind === "compound" ? "View →" : "Open COA →"}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rows.length === 0 && (
                    <p className="s-sx-none">
                      {cls ? `No ${cls} match “${q}”.` : `Nothing matches “${q}”.`} Try a scientific name, a blend nickname, or{" "}
                      <Link href="/products" onClick={close}>see all compounds →</Link>
                    </p>
                  )}
                  {cls && <Link href={shopClassHref(cls)} onClick={close} className="s-micro s-sx-shop">See all {cls} in the Shop →</Link>}
                </div>
                {preview && <Preview c={preview} onNavigate={close} />}
              </div>
            )}

            <div className="s-sx-foot">
              <span className="s-sx-keys"><kbd>↑</kbd><kbd>↓</kbd> to move <kbd>Enter</kbd> to open <kbd>Esc</kbd> to close</span>
              <span className="s-micro">For laboratory research use only</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// The highlighted compound: its vial, as on its card and product page.
function Preview({ c, onNavigate }: { c: Compound; onNavigate: () => void }) {
  const color = CLASS_COLOR[c.chemicalClass];
  const certified = c.variants.some((v) => !isPendingLot(v.lot));
  const allOut = c.variants.every((v) => v.stock === "out");
  return (
    <Link href={`/products/${c.slug}`} onClick={onNavigate} className="s-sx-pv" aria-label={`View ${compoundTitle(c)}`} style={{ "--cls": color } as CSSProperties}>
      <span className="s-sx-pv-vial">
        <Vial id={`sx-${c.slug}`} label={vialLabel(c)} cap={vialCap(c)} rule={color} parts={vialParts(c)} strength={c.variants[0].strength} tilt={-8} width={150} />
      </span>
      <span className="s-sx-pv-info">
        <span className="s-micro s-sx-pv-cls"><i aria-hidden />{c.chemicalClass}</span>
        <span className="s-sx-pv-n">{compoundTitle(c)}</span>
        <span className="s-sx-pv-p">{strengthsText(c)} · from <b>{formatUsd(fromPackPriceUsd(c))}</b></span>
        {allOut
          ? <span className="s-micro s-sx-pv-out">Out of stock</span>
          : <span className="s-micro s-sx-pv-coa">{certified ? "● Certificate on file for the lot shipping now" : "COA pending"}</span>}
        <span className="s-sx-pv-go">View compound →</span>
      </span>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
    </svg>
  );
}
