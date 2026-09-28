"use client";

import { useEffect, useRef } from "react";

// Decorative compound ring for the storefront homepage. Nodes are catalog
// compounds only — NO biometric readings or human-outcome pairings (removed
// 2026-09-28 before Stripe review). Each label links to its product page.
// Order matters — index 0 sits at the top of the ring, then clockwise from there.
export const NODES = [
  { key: "slu-pp-332", name: "SLU-PP-332", cls: "Mitochondrial & Metabolic" },
  { key: "mots-c", name: "MOTS-c", cls: "Mitochondrial & Metabolic" },
  { key: "bpc-157", name: "BPC-157", cls: "Peptide Fragments" },
  { key: "tesamorelin", name: "Tesamorelin", cls: "GH-Axis Peptides" },
  { key: "cjc-1295-ipamorelin", name: "CJC-1295 / Ipamorelin", cls: "GH-Axis Peptides" },
  { key: "epithalon", name: "Epithalon", cls: "Short Peptides & Neuropeptides" },
] as const;

type NodeKey = (typeof NODES)[number]["key"];

// Highlighted connectors only ever join two compounds of the same chemical
// class, captioned with that class — never a combination or an outcome.
export const PAIRS: { a: NodeKey; b: NodeKey; text: string }[] = [
  { a: "slu-pp-332", b: "mots-c", text: "SLU-PP-332 · MOTS-c — Mitochondrial & Metabolic" },
  { a: "tesamorelin", b: "cjc-1295-ipamorelin", text: "Tesamorelin · CJC-1295 / Ipamorelin — GH-Axis Peptides" },
];

const INK = "28, 24, 19";
const SPECIMEN = "163, 43, 31";
const SPECIMEN_DARK = "104, 25, 18";

// `value` is an internal 0–1 signal that only drives node brightness; it is
// never displayed.
type Metric = {
  key: NodeKey;
  name: string;
  value: number;
  target: number;
  prevTarget: number;
  nextRetarget: number;
  retargetClock: number;
  pos: { x: number; y: number; z: number };
  ringX: number;
  ringY: number;
  ringAngle: number;
};

type CloudPoint = { x: number; y: number; z: number; phase: number; speed: number };

function rotateY<T extends { x: number; y: number; z: number }>(p: T, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotateX<T extends { x: number; y: number; z: number }>(p: T, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function normOf(m: Metric) {
  return Math.max(0, Math.min(1, m.value));
}
function makeCloudPoints(n: number, R: number): CloudPoint[] {
  const points: CloudPoint[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const yF = 1 - (i / (n - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - yF * yF);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * radiusAtY * R,
      y: yF * R,
      z: Math.sin(theta) * radiusAtY * R,
      phase: Math.random() * Math.PI * 2,
      speed: 0.9 + Math.random() * 0.6,
    });
  }
  return points;
}

export default function BiosignatureSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelHostRef = useRef<HTMLDivElement>(null);
  const tensionTextRef = useRef<HTMLSpanElement>(null);
  const sevDotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const labelHostEl = labelHostRef.current;
    const tensionTextNode = tensionTextRef.current;
    const sevDotNode = sevDotRef.current;
    if (!canvasEl || !labelHostEl || !tensionTextNode || !sevDotNode) return;
    // Reassign into non-nullable bindings — TS control-flow narrowing above doesn't
    // survive into the nested `draw` closure invoked later via requestAnimationFrame.
    const canvas: HTMLCanvasElement = canvasEl;
    const labelHost: HTMLDivElement = labelHostEl;
    const tensionTextEl: HTMLSpanElement = tensionTextNode;
    const sevDotEl: HTMLSpanElement = sevDotNode;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 720, H = 600;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;
    ctx.scale(dpr, dpr);

    const cx = W / 2, cy = H / 2;
    const persp = 460, R = 130, ringR = 220;

    const cloud = makeCloudPoints(130, R);

    const metrics: Metric[] = NODES.map((base) => {
      const start = Math.random();
      return {
        key: base.key,
        name: base.name,
        value: start,
        target: start,
        prevTarget: start,
        nextRetarget: 2 + Math.random() * 3,
        retargetClock: 0,
        pos: { x: 0, y: 0, z: 0 },
        ringX: 0,
        ringY: 0,
        ringAngle: 0,
      };
    });

    metrics.forEach((m, idx) => {
      const lat = idx % 2 === 0 ? 0.34 : -0.2;
      const lon = (idx / metrics.length) * Math.PI * 2;
      m.pos = {
        x: R * Math.cos(lat) * Math.cos(lon),
        y: R * Math.sin(lat),
        z: R * Math.cos(lat) * Math.sin(lon),
      };
      m.ringAngle = (idx / metrics.length) * Math.PI * 2 - Math.PI / 2;
    });

    function metric(key: NodeKey) {
      return metrics.find((m) => m.key === key)!;
    }

    // Build the fixed HTML label overlay — text updates each frame; positions are
    // (re)computed by layoutRing() on mount and whenever the canvas is resized.
    labelHost.innerHTML = "";
    const labelEls = metrics.map((m) => {
      const el = document.createElement("div");
      el.className = "p-biosig-label";
      const link = document.createElement("a");
      link.className = "p-biosig-peptide";
      link.href = `/products/${m.key}`;
      // Blend names ("CJC-1295 / Ipamorelin") break onto two lines so the
      // side labels don't overrun the ring and clip.
      m.name.split(" / ").forEach((part, i, parts) => {
        link.appendChild(document.createTextNode(i < parts.length - 1 ? `${part} /` : part));
        if (i < parts.length - 1) link.appendChild(document.createElement("br"));
      });
      link.style.pointerEvents = "auto";
      el.appendChild(link);
      labelHost.appendChild(el);
      return el;
    });

    // Narrow viewports render the canvas much smaller than its 720px intrinsic
    // width, but the label text stays a fixed pixel size — so on phones the
    // left/right labels used to overrun the (overflow-hidden) container and clip.
    // Pull the ring inward horizontally as the rendered canvas shrinks so every
    // label keeps room to sit fully on-screen.
    function horizontalSqueeze() {
      const dispW = canvas.getBoundingClientRect().width || W;
      if (dispW >= 460) return 1;
      if (dispW <= 320) return 0.62;
      return 0.62 + ((dispW - 320) / (460 - 320)) * (1 - 0.62);
    }

    function layoutRing() {
      const sx = horizontalSqueeze();
      metrics.forEach((m, i) => {
        m.ringX = cx + Math.cos(m.ringAngle) * ringR * sx;
        m.ringY = cy + Math.sin(m.ringAngle) * ringR * 0.72;
        const el = labelEls[i];
        el.style.left = (m.ringX / W) * 100 + "%";
        el.style.top = (m.ringY / H) * 100 + "%";
        const isRight = Math.cos(m.ringAngle) > 0.15;
        const isLeft = Math.cos(m.ringAngle) < -0.15;
        if (isRight) {
          el.style.transform = "translate(6px, -50%)";
          el.style.textAlign = "left";
        } else if (isLeft) {
          el.style.transform = "translate(calc(-100% - 6px), -50%)";
          el.style.textAlign = "right";
        } else {
          el.style.transform = `translate(-50%, ${Math.sin(m.ringAngle) > 0 ? "6px" : "calc(-100% - 6px)"})`;
          el.style.textAlign = "center";
        }
      });
    }

    layoutRing();
    const resizeObs = new ResizeObserver(() => layoutRing());
    resizeObs.observe(canvas);

    function project(x: number, y: number, z: number) {
      const f = persp / (persp + z);
      return { x: cx + x * f, y: cy + y * f, z };
    }

    let tIdx = 0;
    let tClock = 0;
    const HOLD = 4.2;
    let lastFrame = performance.now();
    const t0 = lastFrame;
    let lastDom = 0;
    let raf = 0;

    // Drag-to-rotate: pointer offsets add on top of the ambient auto-rotation
    // so the sphere still drifts on its own but yields to the cursor.
    let userYaw = 0;
    let userPitch = 0;
    let dragging = false;
    let lastPX = 0;
    let lastPY = 0;

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      lastPX = e.clientX;
      lastPY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - lastPX;
      const dy = e.clientY - lastPY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      userYaw += dx * 0.008;
      userPitch = Math.max(-0.9, Math.min(0.9, userPitch + dy * 0.008));
    }
    function onPointerUp(e: PointerEvent) {
      if (!dragging) return;
      dragging = false;
      canvas.style.cursor = "grab";
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture may already be released by the browser
      }
    }
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    function draw(now: number) {
      const dt = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      const t = (now - t0) / 1000;

      metrics.forEach((m) => {
        m.retargetClock += dt;
        if (m.retargetClock >= m.nextRetarget) {
          m.retargetClock = 0;
          m.nextRetarget = 3 + Math.random() * 4;
          m.prevTarget = m.target;
          m.target = Math.random();
        }
        m.value = lerp(m.value, m.target, 1 - Math.pow(0.001, dt));
      });
      tClock += dt;
      if (tClock >= HOLD) {
        tClock = 0;
        tIdx = (tIdx + 1) % PAIRS.length;
      }
      const active = PAIRS[tIdx];
      const tPhase = tClock / HOLD;
      const tAlpha = Math.sin(Math.min(tPhase, 1) * Math.PI);

      ctx.clearRect(0, 0, W, H);
      const angle = t * 0.16 + userYaw;
      const wobble = Math.sin(t * 0.29) * 0.1 + userPitch;

      const proj = cloud.map((p) => {
        const q = rotateX(rotateY(p, angle), wobble);
        return project(q.x, q.y, q.z);
      });
      const order = proj.map((_, i) => i).sort((ia, ib) => proj[ia].z - proj[ib].z);
      order.forEach((idx) => {
        const p = proj[idx];
        const src = cloud[idx];
        const pulse = 0.6 + 0.4 * Math.sin(t * src.speed * 1.6 + src.phase);
        const depthAlpha = 0.2 + 0.55 * ((p.z + R) / (2 * R));
        const radius = 0.8 + 0.9 * pulse * (((p.z + R) / (2 * R)) * 0.6 + 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${INK},${depthAlpha.toFixed(3)})`;
        ctx.fill();
      });

      metrics.forEach((m) => {
        const q = rotateX(rotateY(m.pos, angle), wobble);
        const p = project(q.x, q.y, q.z);
        const n = normOf(m);
        ctx.globalAlpha = 0.4 + 0.5 * n;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 + 1.8 * n, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${INK},0.85)`;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(m.ringX, m.ringY, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${INK},0.88)`;
        ctx.fill();
      });

      // Faint background web — every pair except the currently-active
      // one, so the active connector (drawn next, brighter) reads as one
      // highlighted edge in a larger relationship network rather than an
      // isolated line appearing out of nowhere.
      PAIRS.forEach((pair, i) => {
        if (i === tIdx) return;
        const pma = metric(pair.a);
        const pmb = metric(pair.b);
        const qa = rotateX(rotateY(pma.pos, angle), wobble);
        const qb = rotateX(rotateY(pmb.pos, angle), wobble);
        const pa2 = project(qa.x, qa.y, qa.z);
        const pb2 = project(qb.x, qb.y, qb.z);
        ctx.beginPath();
        ctx.moveTo(pa2.x, pa2.y);
        ctx.lineTo(pb2.x, pb2.y);
        ctx.strokeStyle = `rgba(${SPECIMEN_DARK},0.14)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      const ma = metric(active.a);
      const mb = metric(active.b);
      const qa = rotateX(rotateY(ma.pos, angle), wobble);
      const qb = rotateX(rotateY(mb.pos, angle), wobble);
      const pa = project(qa.x, qa.y, qa.z);
      const pb = project(qb.x, qb.y, qb.z);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `rgba(${SPECIMEN_DARK},${(0.35 + tAlpha * 0.6).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Traveling pulse along the active connector — a small glowing dot
      // moving back and forth, reinforcing the "live signal" framing.
      const travel = Math.abs(((t * 0.5) % 2) - 1); // 0 -> 1 -> 0
      const px = lerp(pa.x, pb.x, travel);
      const py = lerp(pa.y, pb.y, travel);
      const glowAlpha = 0.4 + tAlpha * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${SPECIMEN},${(glowAlpha * 0.25).toFixed(3)})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${SPECIMEN},${glowAlpha.toFixed(3)})`;
      ctx.fill();

      if (now - lastDom > 90) {
        lastDom = now;
        tensionTextEl.textContent = active.text;
        tensionTextEl.style.opacity = String(0.55 + 0.45 * tAlpha);
        sevDotEl.style.background = `rgba(${SPECIMEN},${(0.55 + 0.45 * tAlpha).toFixed(3)})`;
        labelEls.forEach((el, i) => {
          const m = metrics[i];
          const isActive = m === ma || m === mb;
          el.style.color = isActive ? "var(--specimen)" : "";
          el.style.opacity = isActive ? String(0.75 + 0.25 * tAlpha) : "1";
        });
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    if (reduced) draw(t0 + 1000);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObs.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      labelHost.innerHTML = "";
    };
  }, []);

  return (
    <div className="overflow-hidden">
      <div className="relative">
        <canvas ref={canvasRef} className="block w-full h-auto" />
        <div ref={labelHostRef} className="absolute inset-0 pointer-events-none" />
      </div>
      <div className="px-[22px] py-3 text-[10.5px] text-[color:var(--ink-soft)] flex items-center justify-center gap-2 min-h-[38px]">
        <span ref={sevDotRef} className="w-1.5 h-1.5 rounded-full bg-[color:var(--specimen)] flex-shrink-0" />
        <span ref={tensionTextRef} className="transition-opacity duration-300">
          Lot-tested research compounds
        </span>
      </div>
    </div>
  );
}
