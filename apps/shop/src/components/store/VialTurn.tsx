"use client";

import { useEffect, useRef, useState } from "react";
import Vial from "@/components/store/Vial";
import { useChosenStrength } from "@/lib/chosen-strength";
import type { Vial3D, VialLabelInput } from "@/components/store/vial-3d";

// Product page vial: the store's <Vial> paints first (and stays when WebGL isn't there);
// then the same vial in 3D takes its place and turns slowly to show the barcode and the
// QR code for its lot. Drag to turn it by hand. Reduce-motion keeps it still on the front.
// Paused while off screen or in a background tab. It follows the size picker: each strength
// shows its own strength, lot and QR code (redrawn in place, without restarting the turn).
export type VialStrength = { id: string; strength: string; lot: string | null; qr: string[] };
type Props = {
  id: string; slug: string; label: string; label2?: string; parts?: string[];
  cap?: VialLabelInput["cap"]; rule?: string; strengths: VialStrength[];
};

// Turning speed in radians a second, by how far the vial has turned from its front: slow
// while the front panel (the compound) faces out, quicker round the barcode and QR code,
// easing smoothly between (one turn takes about 13 s, almost 7 of them within 45° of the front).
const SLOW = 0.2, FAST = 1.1;
const HOLD_MS = 2000; // when the page opens, the front holds still this long before it starts to turn
const speedAt = (angle: number) => {
  const turned = ((-angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // 0 = front facing out
  return SLOW + (FAST - SLOW) * (1 - Math.cos(turned)) / 2;
};

function webgl2(): boolean {
  if (typeof WebGL2RenderingContext === "undefined") return false;
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export default function VialTurn({ id, slug, label, label2, parts = [], cap = "red", rule = "#A32B1F", strengths }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const chosenId = useChosenStrength(slug, strengths[0].id);
  const { strength, lot, qr } = strengths.find((s) => s.id === chosenId) ?? strengths[0];
  const input: VialLabelInput = { label, label2, strength, parts, cap, rule, lot, qr };
  const inputRef = useRef(input);
  inputRef.current = input;
  const vialRef = useRef<Vial3D | null>(null);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !webgl2()) return;
    let alive = true, vial: Vial3D | null = null, raf = 0, last = 0, angle = 0, onScreen = true, startAt = 0;
    let drag: { x: number; angle: number } | null = null;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = (t: number) => {
      raf = 0;
      if (!vial || !alive) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (!still && !drag && t >= startAt) angle -= dt * speedAt(angle);
      vial.setAngle(angle);
      vial.render();
      if (onScreen && !document.hidden && (!still || drag)) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && vial && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

    const down = (e: PointerEvent) => { drag = { x: e.clientX, angle }; canvas.setPointerCapture(e.pointerId); wake(); };
    const move = (e: PointerEvent) => { if (drag) { angle = drag.angle + (e.clientX - drag.x) * 0.012; wake(); } };
    const up = () => { drag = null; wake(); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); });
    seen.observe(canvas);
    const sized = new ResizeObserver(() => { vial?.resize(); wake(); });
    sized.observe(canvas);
    document.addEventListener("visibilitychange", wake);

    import("@/components/store/vial-3d")
      .then(({ mountVial3D }) => mountVial3D(canvas, inputRef.current))
      .then((v) => {
        if (!alive) { v.dispose(); return; }
        vial = v; vialRef.current = v; wakeRef.current = wake;
        v.setLabel(inputRef.current); // a size picked while it loaded
        startAt = performance.now() + HOLD_MS; setReady(true); wake();
      })
      .catch((err) => console.error("turning vial unavailable; showing the still vial", err));

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      seen.disconnect(); sized.disconnect();
      document.removeEventListener("visibilitychange", wake);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      vial?.dispose();
      vialRef.current = null; wakeRef.current = () => {};
    };
    // the product is fixed for the page; parts is a new array each render, so key on its text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, label2, parts.join("|"), cap, rule]);

  // a new size: redraw the label where it is
  const qrKey = qr.join("");
  useEffect(() => {
    if (!vialRef.current) return;
    vialRef.current.setLabel(inputRef.current);
    wakeRef.current();
  }, [strength, lot, qrKey]);

  return (
    <div className={`s-vialturn${ready ? " is-3d" : ""}`}>
      <div className="s-vialturn-still" aria-hidden={ready || undefined}>
        <Vial id={id} label={label} label2={label2} cap={cap} rule={rule} parts={parts} strength={strength} tilt={0} />
      </div>
      <canvas
        ref={canvasRef}
        className="s-vialturn-3d"
        role="img"
        aria-hidden={!ready || undefined}
        aria-label={`${label2 ? `${label} ${label2}` : label} ${strength} vial, turning to show its barcode and ${lot ? `the QR code for lot ${lot}'s certificate of analysis` : "a QR code to the certificate lookup"}`}
      />
    </div>
  );
}
