"use client";

// Rotating point-cloud biosignature with metric nodes on a ring and a live
// "correlation" connector that pulses between related metrics, resolving into
// a routed protocol lane. Ported from the approved Modality mockup (itself
// derived from the shop's BiosignatureSphere), recolored bordeaux and stripped
// of the shop's peptide-product links — lanes here point at telehealth protocols.
// All values are simulated; no wearable is connected on the marketing surface.

import { useEffect, useRef } from "react";

type MetricDef = {
  key: string;
  label: string;
  unit: string;
  lo: number;
  hi: number;
  invert: boolean;
  dec: number;
  lane?: string;
};

const METRICS: MetricDef[] = [
  { key: "glucose", label: "GLUCOSE", unit: "", lo: 72, hi: 118, invert: true, dec: 0, lane: "GLP-1 track" },
  { key: "hrv", label: "HRV", unit: "ms", lo: 15, hi: 70, invert: false, dec: 0 },
  { key: "recovery", label: "RECOVERY", unit: "", lo: 20, hi: 95, invert: false, dec: 0, lane: "Recovery" },
  { key: "strain", label: "STRAIN", unit: "", lo: 2, hi: 14, invert: true, dec: 1 },
  { key: "sleep", label: "SLEEP", unit: "h", lo: 5, hi: 9, invert: false, dec: 1, lane: "Longevity" },
  { key: "vo2", label: "VO2 MAX", unit: "", lo: 30, hi: 55, invert: false, dec: 0 },
];

const TENSIONS: { a: string; b: string; sev: number; text: string }[] = [
  { a: "hrv", b: "recovery", sev: 0.62, text: "HRV + RECOVERY — overreaching · Recovery" },
  { a: "glucose", b: "strain", sev: 1.0, text: "GLUCOSE + STRAIN — metabolic load · GLP-1 track" },
  { a: "sleep", b: "hrv", sev: 0.35, text: "SLEEP + HRV — recovery deficit · Longevity" },
];

type Vec = { x: number; y: number; z: number };
type CloudPoint = Vec & { phase: number; speed: number };
type Metric = {
  def: MetricDef;
  value: number;
  target: number;
  nextRe: number;
  clock: number;
  pos: Vec;
  ringX: number;
  ringY: number;
  ringAngle: number;
};

function rotY(p: Vec, a: number): Vec {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotX(p: Vec, a: number): Vec {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cssVar(el: HTMLElement, name: string, fallback: string): string {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

type Props = {
  /** internal coordinate space; the canvas is scaled to its container width */
  width?: number;
  height?: number;
};

export default function BiosignatureSphere({ width = 380, height = 340 }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sevRef = useRef<HTMLSpanElement | null>(null);
  const txtRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const sevDot = sevRef.current;
    const txtEl = txtRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accent = cssVar(host, "--bios-accent", "122, 46, 46");
    const ink = cssVar(host, "--bios-ink", "33, 30, 27");
    const W = width, H = height;

    const canvas = document.createElement("canvas");
    const labels = document.createElement("div");
    labels.className = "labels";
    host.appendChild(canvas);
    host.appendChild(labels);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = W / 2, cy = H / 2, persp = 460;
    const R = Math.min(W, H) * 0.3, ringR = Math.min(W, H) * 0.44;

    const N = 84, cloud: CloudPoint[] = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yF = 1 - (i / (N - 1)) * 2;
      const rr = Math.sqrt(Math.max(0, 1 - yF * yF));
      const th = ga * i;
      cloud.push({ x: Math.cos(th) * rr * R, y: yF * R, z: Math.sin(th) * rr * R, phase: Math.random() * 6.283, speed: 0.9 + Math.random() * 0.6 });
    }

    const metrics: Metric[] = METRICS.map((def, idx) => {
      const start = def.lo + Math.random() * (def.hi - def.lo);
      const lat = idx % 2 === 0 ? 0.34 : -0.2;
      const lon = (idx / METRICS.length) * Math.PI * 2;
      const ringAngle = (idx / METRICS.length) * Math.PI * 2 - Math.PI / 2;
      return {
        def, value: start, target: start, nextRe: 2 + Math.random() * 3, clock: 0,
        pos: { x: R * Math.cos(lat) * Math.cos(lon), y: R * Math.sin(lat), z: R * Math.cos(lat) * Math.sin(lon) },
        ringX: cx + Math.cos(ringAngle) * ringR, ringY: cy + Math.sin(ringAngle) * ringR * 0.72, ringAngle,
      };
    });
    const byKey = (k: string): Metric => metrics.find((m) => m.def.key === k)!;
    const normOf = (m: Metric): number => {
      const n = Math.max(0, Math.min(1, (m.value - m.def.lo) / (m.def.hi - m.def.lo)));
      return m.def.invert ? 1 - n : n;
    };
    const fmt = (m: Metric): string => m.value.toFixed(m.def.dec) + (m.def.unit || "");

    const valEls: Record<string, HTMLSpanElement> = {};
    const labelEls = metrics.map((m) => {
      const el = document.createElement("div");
      el.className = "bios-label";
      el.style.color = `rgba(${ink},0.62)`;
      el.style.left = `${(m.ringX / W) * 100}%`;
      el.style.top = `${(m.ringY / H) * 100}%`;
      const c = Math.cos(m.ringAngle);
      if (c > 0.15) { el.style.transform = "translate(6px,-50%)"; el.style.textAlign = "left"; }
      else if (c < -0.15) { el.style.transform = "translate(calc(-100% - 6px),-50%)"; el.style.textAlign = "right"; }
      else { el.style.transform = `translate(-50%,${Math.sin(m.ringAngle) > 0 ? "6px" : "calc(-100% - 6px)"})`; el.style.textAlign = "center"; }
      el.appendChild(document.createTextNode(m.def.label));
      const v = document.createElement("span");
      v.className = "v"; v.textContent = "—"; v.style.color = `rgb(${ink})`;
      el.appendChild(document.createElement("br")); el.appendChild(v);
      if (m.def.lane) {
        const ln = document.createElement("span");
        ln.className = "lane"; ln.textContent = m.def.lane; ln.style.color = `rgb(${accent})`;
        el.appendChild(ln);
      }
      labels.appendChild(el);
      valEls[m.def.key] = v;
      return el;
    });

    const project = (x: number, y: number, z: number) => {
      const f = persp / (persp + z);
      return { x: cx + x * f, y: cy + y * f, z };
    };

    let tIdx = 0, tClock = 0;
    const HOLD = 4.2;
    let lastFrame = performance.now();
    const t0 = lastFrame;
    let lastDom = 0, raf = 0, running = false;
    let userYaw = 0, userPitch = 0, dragging = false, lastPX = 0, lastPY = 0;

    const onDown = (e: PointerEvent) => { dragging = true; lastPX = e.clientX; lastPY = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      userYaw += (e.clientX - lastPX) * 0.008;
      userPitch = Math.max(-0.9, Math.min(0.9, userPitch + (e.clientY - lastPY) * 0.008));
      lastPX = e.clientX; lastPY = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false; canvas.style.cursor = "grab";
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const draw = (now: number) => {
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      const t = (now - t0) / 1000;

      for (const m of metrics) {
        m.clock += dt;
        if (m.clock >= m.nextRe) { m.clock = 0; m.nextRe = 3 + Math.random() * 4; m.target = m.def.lo + Math.random() * (m.def.hi - m.def.lo); }
        m.value = lerp(m.value, m.target, 1 - Math.pow(0.001, dt));
      }
      tClock += dt;
      if (tClock >= HOLD) { tClock = 0; tIdx = (tIdx + 1) % TENSIONS.length; }
      const active = TENSIONS[tIdx];
      const tAlpha = Math.sin(Math.min(tClock / HOLD, 1) * Math.PI);

      ctx.clearRect(0, 0, W, H);
      const angle = t * 0.16 + userYaw, wob = Math.sin(t * 0.29) * 0.1 + userPitch;

      const proj = cloud.map((p) => { const q = rotX(rotY(p, angle), wob); return project(q.x, q.y, q.z); });
      const order = proj.map((_, i) => i).sort((a, b) => proj[a].z - proj[b].z);
      for (const idx of order) {
        const p = proj[idx], src = cloud[idx];
        const pulse = 0.6 + 0.4 * Math.sin(t * src.speed * 1.6 + src.phase);
        const da = 0.2 + 0.55 * ((p.z + R) / (2 * R));
        const rad = 0.8 + 0.9 * pulse * (((p.z + R) / (2 * R)) * 0.6 + 0.4);
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 6.283); ctx.fillStyle = `rgba(${ink},${da.toFixed(3)})`; ctx.fill();
      }
      for (const m of metrics) {
        const q = rotX(rotY(m.pos, angle), wob), p = project(q.x, q.y, q.z), n = normOf(m);
        ctx.globalAlpha = 0.4 + 0.5 * n;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2 + 1.8 * n, 0, 6.283); ctx.fillStyle = `rgba(${ink},0.85)`; ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(m.ringX, m.ringY, 1.6, 0, 6.283); ctx.fillStyle = `rgba(${ink},0.88)`; ctx.fill();
      }
      TENSIONS.forEach((pair, i) => {
        if (i === tIdx) return;
        const a = byKey(pair.a), b = byKey(pair.b);
        const qa = rotX(rotY(a.pos, angle), wob), qb = rotX(rotY(b.pos, angle), wob);
        const pa = project(qa.x, qa.y, qa.z), pb = project(qb.x, qb.y, qb.z);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.strokeStyle = `rgba(${ink},0.10)`; ctx.lineWidth = 1; ctx.stroke();
      });
      const ma = byKey(active.a), mb = byKey(active.b);
      const qa = rotX(rotY(ma.pos, angle), wob), qb = rotX(rotY(mb.pos, angle), wob);
      const pa = project(qa.x, qa.y, qa.z), pb = project(qb.x, qb.y, qb.z);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `rgba(${accent},${(0.35 + tAlpha * 0.6).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.stroke();
      const travel = Math.abs(((t * 0.5) % 2) - 1);
      const px = lerp(pa.x, pb.x, travel), py = lerp(pa.y, pb.y, travel), g2 = 0.4 + tAlpha * 0.5;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.283); ctx.fillStyle = `rgba(${accent},${(g2 * 0.25).toFixed(3)})`; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.283); ctx.fillStyle = `rgba(${accent},${g2.toFixed(3)})`; ctx.fill();

      if (now - lastDom > 90) {
        lastDom = now;
        if (txtEl) { txtEl.textContent = active.text; txtEl.style.opacity = String(0.55 + 0.45 * tAlpha); }
        if (sevDot) sevDot.style.background = `rgba(${accent},${active.sev})`;
        for (const m of metrics) valEls[m.def.key].textContent = fmt(m);
        labelEls.forEach((el, i) => {
          const m = metrics[i], on = m === ma || m === mb;
          el.style.color = on ? `rgb(${accent})` : `rgba(${ink},0.62)`;
          el.style.opacity = on ? String(0.75 + 0.25 * tAlpha) : "1";
        });
      }
      if (running && !reduced) raf = requestAnimationFrame(draw);
    };

    const start = () => { if (running) return; running = true; lastFrame = performance.now(); raf = requestAnimationFrame(draw); };
    const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); };

    let io: IntersectionObserver | null = null;
    if (reduced) {
      draw(t0 + 1000);
    } else if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.05 });
      io.observe(host);
    } else {
      start();
    }

    return () => {
      stop();
      io?.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      host.removeChild(canvas);
      host.removeChild(labels);
    };
  }, [width, height]);

  return (
    <div className="instrument">
      <div className="bios-cap"><span className="live" />Your biosignature · live</div>
      <div className="bios" ref={hostRef}>
        <div className="bios-emblem" aria-hidden="true">
          <span className="word"><span className="cap">M</span>odality</span>
          <svg width="60" height="84" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 10 8 Q 12 18 10 32" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 20 5 L 20 50" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" />
            <path d="M 30 8 Q 28 18 30 32" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="bios-readout">
        <span className="sev" ref={sevRef} />
        <span className="txt" ref={txtRef} style={{ color: "var(--ink-soft)" }}>Scanning correlations…</span>
      </div>
    </div>
  );
}
