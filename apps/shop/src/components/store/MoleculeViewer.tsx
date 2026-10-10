"use client";

import { useEffect, useRef, useState } from "react";
import { ELEMENT_COLORS, type Structure } from "@/lib/structure";

type Status = "idle" | "ready" | "unavailable";

// Copper–ligand bonds aren't in the SDF bond table (RDKit leaves dative bonds
// out), so the Cu would float unbound. Draw a dashed line from each Cu to every
// N/O donor within 2.4 Å — the coordination sphere.
const COORD_MAX_A = 2.4;
type Atom = { elem?: string; x?: number; y?: number; z?: number };
type CoordViewer = { selectedAtoms: (sel: object) => Atom[]; addCylinder: (spec: object) => unknown };

function drawCopperCoordination(v: CoordViewer): void {
  const atoms = v.selectedAtoms({});
  const donors = atoms.filter((a) => a.elem === "N" || a.elem === "O");
  for (const cu of atoms.filter((a) => a.elem === "Cu")) {
    for (const d of donors) {
      const dist = Math.hypot((d.x ?? 0) - (cu.x ?? 0), (d.y ?? 0) - (cu.y ?? 0), (d.z ?? 0) - (cu.z ?? 0));
      if (dist > COORD_MAX_A) continue;
      v.addCylinder({
        start: { x: cu.x, y: cu.y, z: cu.z }, end: { x: d.x, y: d.y, z: d.z },
        radius: 0.06, color: ELEMENT_COLORS.Cu, dashed: true, dashLength: 0.18, gapLength: 0.14,
        fromCap: "round", toCap: "round",
      });
    }
  }
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    // Free the probe context right away: browsers cap live WebGL contexts,
    // and phones hit that cap fast.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

// Same pace as the 3Dmol spin("y", 0.6) it replaces: 0.6° every 25 ms.
const SPIN_DEG_PER_S = 24;
// At most ~60 redraws a second, even on 120 Hz phone screens.
const MIN_FRAME_MS = 15;
// Touch screens render at no more than this pixel density.
const TOUCH_MAX_DPR = 1.5;

type Renderer = {
  setSize: (w: number, h: number) => void;
  devicePixelRatio: number;
  rows?: number;
  isLost: () => boolean;
  initFrameBuffer: () => void;
  _canvas: HTMLCanvasElement;
  _gl: WebGLRenderingContext;
  _viewportWidth: number;
  _viewportHeight: number;
};

// 3Dmol always renders at the full screen density (3x on iPhones: nine
// times the pixels of the box) and has no option to lower it. Redo the tail
// of its Renderer.setSize (3dmol 2.5.5, single viewport) at a capped ratio.
// If 3Dmol's internals change, this quietly does nothing.
function capPixelRatio(viewer: { renderer?: Renderer; resize: () => void }, max: number): void {
  const r = viewer.renderer;
  if (!r?.setSize || !r._canvas || !r._gl) return;
  const original = r.setSize.bind(r);
  r.setSize = (w, h) => {
    original(w, h);
    if (r.devicePixelRatio <= max || r.rows !== undefined) return;
    r.devicePixelRatio = max;
    r._canvas.width = w * max;
    r._canvas.height = h * max;
    r._viewportWidth = r._canvas.width;
    r._viewportHeight = r._canvas.height;
    if (!r.isLost()) r._gl.viewport(0, 0, r._gl.drawingBufferWidth, r._gl.drawingBufferHeight);
    r.initFrameBuffer();
  };
  viewer.resize();
}

// One rotating ball-and-stick model. 3Dmol loads only when the stage scrolls
// into view, so it never lands in the shared bundle or slows other pages.
export default function MoleculeViewer({ structure, className = "s-mol-stage" }: { structure: Structure; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let viewer: { clear: () => void; rotate: (angle: number, axis: string) => void } | null = null;
    let inView = false;
    let spins = false;
    let raf = 0;
    let lastT = 0;

    // Spin on the screen's own refresh, by elapsed time. 3Dmol's spin() is a
    // 25 ms timer: out of step with 60/120 Hz screens (visible stutter) and
    // re-rendering forever, on screen or not.
    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const dt = t - lastT;
      if (dt < MIN_FRAME_MS) return;
      lastT = t;
      viewer?.rotate((Math.min(dt, 50) / 1000) * SPIN_DEG_PER_S, "y");
    };
    // Run it only while the model is visible and the tab is in front.
    const syncSpin = () => {
      const on = !!viewer && spins && inView && !document.hidden;
      if (on && !raf) { lastT = performance.now(); raf = requestAnimationFrame(step); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    };

    const start = async () => {
      if (!hasWebGL()) { setStatus("unavailable"); return; }
      try {
        const [{ createViewer }, text] = await Promise.all([
          import("3dmol"),
          fetch(structure.file).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); }),
        ]);
        if (cancelled) return;
        // Antialiasing costs a lot of GPU on phones and their dense screens
        // don't need it.
        const coarse = window.matchMedia?.("(pointer: coarse)").matches;
        const v = createViewer(el, { backgroundColor: "#E2DCCC", antialias: !coarse });
        if (!v) { setStatus("unavailable"); return; }
        if (coarse) capPixelRatio(v as unknown as Parameters<typeof capPixelRatio>[0], TOUCH_MAX_DPR);
        v.addModel(text, "sdf");
        const colorscheme = { prop: "elem", map: ELEMENT_COLORS };
        v.setStyle({}, { stick: { radius: 0.14, colorscheme: colorscheme as never }, sphere: { scale: 0.22, colorscheme: colorscheme as never } });
        drawCopperCoordination(v as unknown as CoordViewer);
        v.zoomTo();
        // zoomTo fits the current pose only; leave margin so the model stays
        // inside the stage as it spins about y.
        v.zoom(0.8);
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        spins = !reduced;
        v.render();
        viewer = v as unknown as typeof viewer;
        syncSpin();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    };

    // Size is fixed (Alvester, 2026-10-10): no wheel or pinch zoom. Stop those
    // events before 3Dmol sees them; one-finger drag still rotates, and a wheel
    // over the model scrolls the page instead of being swallowed.
    const blockZoom = (e: Event) => {
      if (e.type.startsWith("touch") && (e as TouchEvent).touches.length < 2) return;
      e.stopImmediatePropagation();
      e.stopPropagation();
    };
    const ZOOM_EVENTS = ["wheel", "DOMMouseScroll", "touchstart", "touchmove"] as const;
    for (const t of ZOOM_EVENTS) el.addEventListener(t, blockZoom, { capture: true, passive: true });

    let started = false;
    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      if (inView && !started) { started = true; void start(); }
      syncSpin();
    }, { rootMargin: "200px" });
    io.observe(el);
    document.addEventListener("visibilitychange", syncSpin);
    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", syncSpin);
      for (const t of ZOOM_EVENTS) el.removeEventListener(t, blockZoom, { capture: true });
      if (raf) cancelAnimationFrame(raf);
      viewer?.clear();
      // 3Dmol has no dispose() API and never removes the <canvas> it appends,
      // so without this a client-routed browsing session leaks a WebGL
      // context per product page viewed and eventually exhausts the
      // browser's context cap. Best-effort: never let cleanup throw.
      try {
        el.querySelectorAll("canvas").forEach((c) => {
          (c.getContext("webgl2") ?? c.getContext("webgl"))?.getExtension("WEBGL_lose_context")?.loseContext();
          c.remove();
        });
      } catch {
        // ignore
      }
    };
  }, [structure.file]);

  const label = status === "unavailable" ? `3D model of ${structure.label} unavailable in this browser` : `3D model of ${structure.label}`;

  return (
    <div className={className} ref={ref} role="img" aria-label={label}>
      {status === "unavailable" && (
        <p className="s-mol-fallback s-micro">3D model unavailable in this browser</p>
      )}
    </div>
  );
}
