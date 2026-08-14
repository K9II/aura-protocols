"use client";

// The Biosignature Constellation (v5 design), driven by REAL telemetry and
// tension data — used in RecommendationCard's Protocol Terminal. Unlike the
// homepage's BiosignatureSphere (which simulates random drift for a decorative
// teaser), nodes here hold real snapshot values and ease smoothly toward new
// values only when props change. Canvas + DOM labels are driven imperatively
// via refs (not React state) to stay smooth — same convention as
// BiosignatureSphere.tsx. Center emblem is the finalized live Aura A + pulse.

import { useEffect, useRef } from "react";
import { SIG } from "@/lib/theme/instrument";

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export type ConstellationMetric = {
  key: string;
  label: string;
  lo: number;
  hi: number;
  inv: boolean;
  dec: number;
  unit: string;
  acc: string;
  value: number;
  trend?: "up" | "down" | "neutral";
};

export type ConstellationTension = {
  id: string;
  a: string; // metric key
  b: string; // metric key
  target: string; // metric key the compound docks under
  label: string;
  severity: "watch" | "elevated" | "high";
  rx: string;
  dose: string;
  tier: string;
};

type Props = {
  metrics: ConstellationMetric[];
  tensions: ConstellationTension[];
  sessionLabel: string;
  templateLabel: string;
  stackLabel: string;
  idleCaption?: string;
};

const SEV_A = { watch: 0.4, elevated: 0.68, high: 1 };
const PULSE = "M44,110 L56,86 L68,86 L74,68 L80,108 L86,86 L100,86";

type Node = ConstellationMetric & {
  x: number; y: number; z: number;
  cur: number; from: number; to: number; animT: number;
  ra: number; rx: number; ry: number;
};
type Cloud = { x: number; y: number; z: number; ph: number; sp: number; hot: boolean };

const rotY = (p: { x: number; y: number; z: number }, a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
};
const rotX = (p: { x: number; y: number; z: number }, a: number) => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
};
function fib(n: number, r: number): Cloud[] {
  const o: Cloud[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = ga * i;
    o.push({ x: Math.cos(th) * rr * r, y: y * r, z: Math.sin(th) * rr * r, ph: Math.random() * TAU, sp: 0.8 + Math.random() * 0.8, hot: Math.random() < 0.09 });
  }
  return o;
}

export default function BiosignatureConstellation({
  metrics, tensions, sessionLabel, templateLabel, stackLabel, idleCaption = "No active tensions detected.",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const chipRef = useRef<HTMLDivElement | null>(null);
  const chipTRef = useRef<HTMLSpanElement | null>(null);
  const chipCRef = useRef<HTMLSpanElement | null>(null);
  const chipDRef = useRef<HTMLDivElement | null>(null);
  const capDotRef = useRef<HTMLSpanElement | null>(null);
  const capTextRef = useRef<HTMLSpanElement | null>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelValRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // live refs so the animation loop always sees the latest props without restarting the effect
  const metricsRef = useRef(metrics);
  const tensionsRef = useRef(tensions);
  const idleCaptionRef = useRef(idleCaption);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  useEffect(() => { tensionsRef.current = tensions; }, [tensions]);
  useEffect(() => { idleCaptionRef.current = idleCaption; }, [idleCaption]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const chip = chipRef.current;
    if (!canvas || !overlay || !chip) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0, persp = 0;
    let cloud: Cloud[] = [];
    let nodes: Node[] = [];

    function seedNodes() {
      const src = metricsRef.current;
      nodes = src.map((m, i) => {
        const lat = i % 2 ? -0.22 : 0.34;
        const lon = (i / src.length) * TAU;
        const ra = (i / src.length) * TAU - Math.PI / 2;
        return {
          ...m,
          x: R * Math.cos(lat) * Math.cos(lon),
          y: R * Math.sin(lat),
          z: R * Math.cos(lat) * Math.sin(lon),
          cur: m.value, from: m.value, to: m.value, animT: 1,
          ra, rx: cx + Math.cos(ra) * R * 1.5, ry: cy + Math.sin(ra) * R * 1.16,
        };
      });
    }

    function build() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.29;
      cx = W / 2;
      cy = H * 0.46;
      persp = R * 3.6;
      cloud = fib(155, R);
      seedNodes();
      nodes.forEach((n, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        el.style.left = `${(n.rx / W) * 100}%`;
        el.style.top = `${(n.ry / H) * 100}%`;
        const cr = Math.cos(n.ra);
        if (cr > 0.15) {
          el.style.transform = "translate(6px,-50%)";
          el.style.textAlign = "left";
        } else if (cr < -0.15) {
          el.style.transform = "translate(calc(-100% - 6px),-50%)";
          el.style.textAlign = "right";
        } else {
          el.style.transform = `translate(-50%,${Math.sin(n.ra) > 0 ? "8px" : "calc(-100% - 8px)"})`;
          el.style.textAlign = "center";
        }
      });
    }
    build();

    // ease nodes toward new metric values whenever props change, instead of random drift
    let lastMetricsRef = metricsRef.current;
    function syncTargets() {
      const src = metricsRef.current;
      if (src === lastMetricsRef) return;
      lastMetricsRef = src;
      nodes.forEach((n, i) => {
        const m = src[i];
        if (!m || m.value === n.to) return;
        n.from = n.cur; n.to = m.value; n.animT = 0;
      });
    }

    let yaw = 0, pitch = 0, drag = false, px = 0, py = 0;
    const onDown = (e: PointerEvent) => {
      drag = true; px = e.clientX; py = e.clientY;
      canvas!.setPointerCapture(e.pointerId);
      canvas!.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      yaw += (e.clientX - px) * 0.008;
      pitch = Math.max(-1, Math.min(1, pitch + (e.clientY - py) * 0.008));
      px = e.clientX; py = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      drag = false;
      canvas!.style.cursor = "grab";
      try { canvas!.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const proj = (p: { x: number; y: number; z: number }) => {
      const f = persp / (persp + p.z);
      return { x: cx + p.x * f, y: cy + p.y * f, z: p.z };
    };
    const normVal = (n: Node) => {
      const v = Math.max(0, Math.min(1, (n.cur - n.lo) / (n.hi - n.lo)));
      return n.inv ? 1 - v : v;
    };
    const fmt = (n: Node) => n.cur.toFixed(n.dec) + n.unit;
    const KEY = (k: string) => nodes.findIndex((n) => n.key === k);

    let tIdx = 0, tClk = 0;
    const HOLD = 4.6;
    const t0 = performance.now();
    let last = t0;
    let lastDom = 0;
    let raf = 0;

    function dockChip(targetKey: string) {
      const i = KEY(targetKey);
      const el = i >= 0 ? labelRefs.current[i] : null;
      if (!el || !overlay || !chip) return;
      const or = overlay.getBoundingClientRect();
      const lr = el.getBoundingClientRect();
      chip.style.left = `${lr.left - or.left}px`;
      chip.style.top = `${lr.bottom - or.top + 5}px`;
    }

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = (now - t0) / 1000;
      const ang = t * 0.15 + yaw;
      const wob = Math.sin(t * 0.26) * 0.11 + pitch;
      const sweep = (t * 0.5) % TAU;

      syncTargets();
      nodes.forEach((n) => {
        if (n.animT < 1) {
          n.animT = Math.min(1, n.animT + dt / 0.7);
          const e = 1 - Math.pow(1 - n.animT, 3);
          n.cur = lerp(n.from, n.to, e);
        }
      });

      const tens = tensionsRef.current;
      let act: ConstellationTension | null = null;
      let aPh = 0;
      if (tens.length > 0) {
        tClk += dt;
        if (tClk >= HOLD) { tClk = 0; tIdx = (tIdx + 1) % tens.length; }
        act = tens[tIdx % tens.length];
        aPh = Math.sin(Math.min(tClk / HOLD, 1) * Math.PI);
      }

      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.9);
      g.addColorStop(0, rgba(SIG.alert, 0.05));
      g.addColorStop(0.5, rgba(SIG.alert, 0.02));
      g.addColorStop(1, rgba(SIG.alert, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const pc = cloud
        .map((p) => ({ p: proj(rotX(rotY(p, ang), wob)), s: p }))
        .sort((a, b) => a.p.z - b.p.z);
      for (const { p, s } of pc) {
        const pulse = 0.55 + 0.45 * Math.sin(t * s.sp * 1.7 + s.ph);
        const depth = (p.z + R) / (2 * R);
        let sw = Math.cos(Math.atan2(p.y - cy, p.x - cx) - sweep);
        sw = sw > 0.6 ? (sw - 0.6) / 0.4 : 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.7 + 1.05 * pulse * (0.4 + depth * 0.6) + sw * 1.3, 0, TAU);
        ctx.fillStyle = rgba(s.hot ? SIG.alert : SIG.ink, Math.min(0.9, 0.15 + 0.48 * depth + sw * 0.45));
        ctx.fill();
      }

      tens.forEach((pr, i) => {
        if (act && i === tIdx % tens.length) return;
        const ia = KEY(pr.a), ib = KEY(pr.b);
        if (ia < 0 || ib < 0) return;
        const a = nodes[ia], b = nodes[ib];
        const pa = proj(rotX(rotY(a, ang), wob)), pb = proj(rotX(rotY(b, ang), wob));
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = rgba(SIG.alert, 0.1);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      if (act) {
        const ia = KEY(act.a), ib = KEY(act.b), it = KEY(act.target);
        if (ia >= 0 && ib >= 0) {
          const na = nodes[ia], nb = nodes[ib];
          const pa = proj(rotX(rotY(na, ang), wob)), pb = proj(rotX(rotY(nb, ang), wob));
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.strokeStyle = rgba(SIG.alert, 0.35 + aPh * 0.55);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          const tr = Math.abs(((t * 0.6) % 2) - 1);
          const dx = lerp(pa.x, pb.x, tr), dy = lerp(pa.y, pb.y, tr);
          ctx.beginPath(); ctx.arc(dx, dy, 4, 0, TAU); ctx.fillStyle = rgba(SIG.alert, 0.2); ctx.fill();
          ctx.beginPath(); ctx.arc(dx, dy, 2, 0, TAU); ctx.fillStyle = rgba(SIG.alert, 0.9); ctx.fill();
        }
        if (it >= 0) {
          const nt = nodes[it];
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(nt.rx, nt.ry);
          ctx.lineTo(nt.rx, nt.ry + 14);
          ctx.strokeStyle = rgba(SIG.alert, 0.3 + aPh * 0.3);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      nodes.forEach((n) => {
        const q = rotX(rotY(n, ang), wob);
        const p = proj(q);
        const nv = normVal(n);
        const on = !!act && (n.key === act.a || n.key === act.b);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 + 2.2 * nv, 0, TAU);
        ctx.fillStyle = rgba(on ? SIG.alert : n.acc, 0.9);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.rx, n.ry, 1.5, 0, TAU);
        ctx.fillStyle = rgba(on ? SIG.alert : SIG.ink, 0.75);
        ctx.fill();
      });

      if (now - lastDom > 90) {
        lastDom = now;
        nodes.forEach((n, i) => {
          const valEl = labelValRefs.current[i];
          if (valEl) valEl.textContent = fmt(n);
          const el = labelRefs.current[i];
          if (el) el.classList.toggle("bs-hot", !!act && (n.key === act.a || n.key === act.b));
        });
        if (act) {
          if (chipTRef.current) chipTRef.current.textContent = act.tier;
          if (chipCRef.current) chipCRef.current.textContent = act.rx;
          if (chipDRef.current) chipDRef.current.textContent = act.dose;
          if (chip) chip.style.opacity = String(0.55 + aPh * 0.45);
          dockChip(act.target);
          if (capDotRef.current) capDotRef.current.style.background = rgba(SIG.alert, SEV_A[act.severity]);
          if (capTextRef.current) {
            const na = KEY(act.a) >= 0 ? nodes[KEY(act.a)] : null;
            const nb = KEY(act.b) >= 0 ? nodes[KEY(act.b)] : null;
            capTextRef.current.innerHTML =
              (na ? `${na.label} ${fmt(na)} · ` : "") +
              (nb ? `${nb.label} ${fmt(nb)} ` : "") +
              `<span class="bs-arrow">→</span> ${act.label} <span class="bs-arrow">→</span> ` +
              `<span class="bs-rxc">${act.tier} ${act.rx} · ${act.dose}</span>`;
          }
        } else {
          if (chip) chip.style.opacity = "0";
          if (capDotRef.current) capDotRef.current.style.background = rgba(SIG.ok, 0.6);
          if (capTextRef.current) capTextRef.current.textContent = idleCaptionRef.current;
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    }

    if (reduced) { draw(t0 + 16); if (tensionsRef.current[0]) dockChip(tensionsRef.current[0].target); }
    else raf = requestAnimationFrame(draw);

    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        build();
        if (reduced) draw(performance.now());
      }, 180);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("resize", onResize);
    };
    // metrics/tensions are read via refs inside the loop so it never restarts on prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bs-panel">
      <div className="bs-bar">
        <span className="bs-live"><i />Live</span>
        <span>
          SESSION <b>{sessionLabel}</b> · TEMPLATE <b>{templateLabel}</b> · STACK <b>{stackLabel}</b>
        </span>
      </div>

      <div className="bs-stage">
        <canvas ref={canvasRef} />
        <div className="bs-overlay" ref={overlayRef}>
          {metrics.map((m, i) => (
            <div key={m.key} className="bs-mlabel" ref={(el) => { labelRefs.current[i] = el; }}>
              {m.label}
              <br />
              <span className="bs-v" ref={(el) => { labelValRefs.current[i] = el; }}>—</span>
            </div>
          ))}

          <div className="bs-chip" ref={chipRef} style={{ opacity: 0 }}>
            <div className="bs-chip-r">
              <span className="bs-chip-t" ref={chipTRef}>T1</span>
              <span ref={chipCRef}>—</span>
            </div>
            <div className="bs-chip-d" ref={chipDRef} />
          </div>

          <div className="bs-core" aria-hidden="true">
            <svg viewBox="0 0 160 150" fill="none" strokeLinecap="round" strokeLinejoin="miter" strokeMiterlimit={9}>
              <g transform="translate(6,4) skewX(-7)" className="aura-svg aura-loop">
                <g stroke="#1C1A15" strokeWidth={6}>
                  <path d="M30,128 L63,23" />
                  <path d="M77,23 L124,128" />
                </g>
                <path className="aura-glow" pathLength={100} stroke="#A32B1F" strokeWidth={4} d={PULSE} />
                <path className="aura-pulse" pathLength={100} stroke="#A32B1F" strokeWidth={2.5} d={PULSE} />
                <circle className="aura-comet" r={2.5} fill="#EDE9E0" stroke="none" style={{ offsetPath: `path('${PULSE}')` }} />
                <circle className="aura-spark" cx={100} cy={86} r={3} fill="#EDE9E0" stroke="none" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div className="bs-caption">
        <span className="bs-dot" ref={capDotRef} />
        <span ref={capTextRef}>Scanning for correlations&hellip;</span>
      </div>
    </div>
  );
}
