"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RECORD_DRAW_MS, RECORD_STAGGER_MS, easeInOut, newSince, newsLine, recordGeo, runY, shortDate,
  type RecordLot,
} from "@/lib/lot-record";
import { setLotNews, visitBaseline } from "@/lib/lot-news";

// The lot record (approved 2026-10-10, ported from the home + MOTS-c demos): every
// released lot drawn as a chromatogram run from its certificate's purity, stacked
// in depth with the newest in front. Hover or tap a run (or its label / table row)
// for the lot's details and certificate.
//   home    — last releases across the store; lots released since the visitor's
//             last visit are red, tagged New, and announced in the top bar.
//   product — this compound's lots, with a lot table; height fits the right column
//             on desktop so both columns end level.
type Props = {
  lots: RecordLot[];
  variant: "home" | "product";
  nowMs: number;
  compoundName?: string;
};

const STATUS_LABEL = { live: "In stock", sold_out: "Sold out" } as const;

export default function LotRecord({ lots, variant, nowMs, compoundName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [sel, setSel] = useState(0);
  const [hover, setHover] = useState(-1);
  const [size, setSize] = useState({ W: 0, H: 0 });
  const state = useRef({ start: 0, raf: 0 });
  const [started, setStarted] = useState(false);
  const n = lots.length;
  const product = variant === "product";

  // Home: what's new since the last visit (browser storage), and tell the top bar.
  useEffect(() => {
    if (product) return;
    const baseline = visitBaseline(new Date().toISOString());
    const f = newSince(lots, baseline);
    setFresh(f);
    setLotNews(newsLine(lots, f));
    return () => setLotNews(null);
  }, [lots, product]);

  const reduce = useMemo(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches, []);

  const draw = useCallback((now: number): boolean => {
    const cv = canvasRef.current;
    if (!cv || !size.W) return false;
    const ctx = cv.getContext("2d");
    if (!ctx) return false;
    const { W, H } = size;
    const g = recordGeo(W, H, n);
    ctx.clearRect(0, 0, W, H);
    // floor grid: retention ticks running back in depth
    ctx.strokeStyle = "rgba(28,26,21,.08)"; ctx.lineWidth = 1;
    for (let k = 0; k <= 10; k++) {
      const x = (g.tw * k) / 10;
      ctx.beginPath(); ctx.moveTo(x + 0.5, g.y0); ctx.lineTo(x + 0.5 + (n - 1) * g.dx, g.y0 - (n - 1) * g.dy); ctx.stroke();
    }
    const focus = hover >= 0 ? hover : sel;
    const t = now - state.current.start;
    const steps = 220;
    for (let i = n - 1; i >= 0; i--) { // back to front, so nearer runs hide what's behind them
      const L = lots[i], ox = i * g.dx, by = g.y0 - i * g.dy;
      const delay = (n - 1 - i) * RECORD_STAGGER_MS;
      const p = reduce ? 1 : Math.max(0, Math.min(1, (t - delay) / RECORD_DRAW_MS));
      const end = Math.max(1, Math.round(steps * easeInOut(p)));
      const depth = n > 1 ? i / (n - 1) : 0;
      // paper fill under the run (hidden-line)
      ctx.beginPath(); ctx.moveTo(ox, by);
      for (let k = 0; k <= end; k++) { const u = k / steps; ctx.lineTo(ox + u * g.tw, by + runY(L.lot, L.purityPct, u, g.amp)); }
      ctx.lineTo(ox + (end / steps) * g.tw, by); ctx.closePath();
      const shade = 244 - Math.round(depth * 10);
      ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 10})`; ctx.fill();
      // the trace
      const isNew = fresh.has(L.lot), isOut = L.status === "sold_out";
      const focused = i === focus, dim = focus >= 0 && !focused;
      ctx.beginPath();
      for (let k = 0; k <= end; k++) {
        const u = k / steps, x = ox + u * g.tw, y = by + runY(L.lot, L.purityPct, u, g.amp);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.setLineDash(isOut ? [4, 3] : []);
      ctx.lineWidth = focused ? 1.9 : 1.2;
      const a = (dim ? 0.32 : 1) * (focused ? 1 : 0.85 - depth * 0.35);
      ctx.strokeStyle = isNew ? `rgba(163,43,31,${Math.max(a, dim ? 0.45 : 0.9)})` : `rgba(28,26,21,${a})`;
      ctx.stroke(); ctx.setLineDash([]);
      // baseline extension to the label
      if (p >= 1) {
        ctx.strokeStyle = `rgba(201,194,174,${dim ? 0.5 : 0.9})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox + g.tw, by + 0.5); ctx.lineTo(ox + g.tw + 10, by + 0.5); ctx.stroke();
      }
    }
    return !reduce && t < (n - 1) * RECORD_STAGGER_MS + RECORD_DRAW_MS + 40;
  }, [size, n, lots, hover, sel, fresh, reduce]);

  // Canvas size follows its box (device pixels capped at 2x).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const measure = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
      cv.getContext("2d")?.setTransform(d, 0, 0, d, 0, 0);
      setSize({ W: r.width, H: r.height });
    };
    if (typeof ResizeObserver === "undefined") { measure(); return; }
    const ro = new ResizeObserver(measure);
    ro.observe(cv);
    return () => ro.disconnect();
  }, []);

  // Draws once, the first time it comes into view; redraws on hover/selection.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    if (typeof IntersectionObserver === "undefined") { state.current.start = performance.now(); setStarted(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { state.current.start = performance.now(); setStarted(true); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(cv);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    const loop = (now: number) => { if (draw(now)) state.current.raf = requestAnimationFrame(loop); };
    state.current.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(state.current.raf);
  }, [draw, started]);

  // Product page: on desktop the left column (image + record) ends level with the right.
  useEffect(() => {
    if (!product) return;
    const band = bandRef.current, cv = canvasRef.current;
    const pdp = band?.closest(".s-pdp");
    const media = pdp?.querySelector<HTMLElement>(".s-media");
    const right = pdp?.querySelector<HTMLElement>(":scope > .relative");
    if (!band || !cv || !media || !right) return;
    // grid items stretch to the row, so measure where each column's content ends
    const contentH = (el: HTMLElement) => {
      const last = el.lastElementChild;
      return last ? last.getBoundingClientRect().bottom - el.getBoundingClientRect().top : el.offsetHeight;
    };
    const fit = () => {
      if (window.innerWidth <= 900) { cv.style.height = ""; return; } // stacked: natural height
      const gap = contentH(right) - contentH(media);
      const h = Math.max(220, Math.min(460, cv.offsetHeight + gap));
      if (Math.abs(h - cv.offsetHeight) > 1) cv.style.height = `${h}px`;
    };
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => requestAnimationFrame(fit));
    ro?.observe(right);
    window.addEventListener("resize", fit);
    fit();
    return () => { ro?.disconnect(); window.removeEventListener("resize", fit); };
  }, [product]);

  // Canvas hover: the run whose baseline band is under the pointer.
  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const g = recordGeo(size.W, size.H, n);
    let best = -1, bd = 1e9;
    for (let i = 0; i < n; i++) {
      const by = g.y0 - i * g.dy, ox = i * g.dx;
      if (x < ox - 6 || x > ox + g.tw + 6) continue;
      const d = Math.abs(y - (by - 6));
      if (d < bd && d < Math.max(g.dy, 40)) { bd = d; best = i; }
    }
    return best;
  };

  if (!n) return null;
  const g = recordGeo(size.W, size.H, n);
  const L = lots[sel] ?? lots[0];
  const statusOf = (l: RecordLot) => (fresh.has(l.lot) ? "New" : STATUS_LABEL[l.status]);
  const capLeft = product
    ? `${compoundName} lots · drawn from each certificate's purity`
    : `${n === 1 ? "First lot release" : `Last ${n} lot releases`} · drawn from each certificate's purity`;

  return (
    <div className={`s-rec s-rec--${variant}`} ref={bandRef}>
      {product && (
        <div className="s-rec-head"><h3 className="s-rec-h">Lot <em>record</em></h3><span className="s-micro"><span className="s-rec-hint-wide">Hover or tap a run</span><span className="s-rec-hint-phone">Tap a run</span></span></div>
      )}
      <div className="s-rec-band">
        <canvas
          ref={canvasRef}
          aria-hidden
          onMouseMove={(e) => { const b = pick(e); if (b !== hover) setHover(b); e.currentTarget.style.cursor = b >= 0 ? "pointer" : ""; }}
          onMouseLeave={() => setHover(-1)}
          onClick={(e) => { const b = pick(e); if (b >= 0) setSel(b); }}
        />
        <div className={`s-rec-labels${started ? " on" : ""}${g.narrow ? " narrow" : ""}`}>
          {lots.map((l, i) => {
            const isNew = fresh.has(l.lot), isOut = l.status === "sold_out";
            const tag = isNew ? "New" : isOut ? "Sold out" : product && l.status === "live" ? "In stock" : "";
            const main = g.narrow ? (product ? `${l.strength} · ${l.purityPct}%` : l.compound) : `${l.lot} · ${l.purityPct}%`;
            return (
              <button
                key={l.lot} type="button" aria-pressed={i === sel}
                className={isNew ? "new" : isOut ? "out" : undefined}
                // each label fades in as its run finishes drawing (CSS: .s-rec-labels.on)
                style={{ left: i * g.dx + g.tw + (g.narrow ? 12 : 14), top: g.y0 - i * g.dy, animationDelay: `${(n - 1 - i) * RECORD_STAGGER_MS + RECORD_DRAW_MS * 0.85}ms` }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                onFocus={() => setHover(i)} onBlur={() => setHover(-1)}
                onClick={() => setSel(i)}
                aria-label={`${l.compound} ${l.strength}, lot ${l.lot}, ${l.purityPct}% purity${tag ? `, ${tag}` : ""}`}
              >
                <span className="lt">{main}</span>{tag && <span className="tg">{tag}</span>}
              </button>
            );
          })}
        </div>
        <div className="s-rec-cap s-micro"><span>{capLeft}</span><span>{n === 1 ? "1 lot" : "Newest in front"}</span></div>
        {product && n === 1 && (
          <p className="s-rec-first">{compoundName}&apos;s first lot. Each new lot joins the record here, in front, with its own certificate.</p>
        )}
      </div>
      <div className="s-rec-detail" aria-live="polite">
        <div><small className="s-micro">Lot</small><b className="s-mono">{L.lot}</b></div>
        <div><small className="s-micro">Compound</small><b>{L.compound} {L.strength}</b></div>
        <div><small className="s-micro">Purity</small><b>{L.purityPct}%</b></div>
        <div><small className="s-micro">Method</small><b>{L.method}</b></div>
        <div><small className="s-micro">Tested</small><b>{shortDate(L.testedOn, nowMs)}</b></div>
        <div><small className="s-micro">Status</small><b>{statusOf(L)}</b></div>
        {L.coaFile && <a href={L.coaFile} target="_blank" rel="noopener noreferrer">Open this lot&apos;s certificate →</a>}
      </div>
      {product && (
        <div className="s-rec-table">
          <table>
            <thead><tr><th>Lot</th><th>Strength</th><th>Purity</th><th>Released</th><th>Status</th></tr></thead>
            <tbody>
              {lots.map((l, i) => (
                <tr
                  key={l.lot} tabIndex={0} aria-selected={i === sel}
                  onClick={() => setSel(i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); } }}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                >
                  <td>{l.lot}</td><td>{l.strength}</td><td>{l.purityPct}%</td><td>{shortDate(l.liveAt, nowMs)}</td>
                  <td className={l.status === "sold_out" ? "st-out" : "st-live"}>{STATUS_LABEL[l.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
