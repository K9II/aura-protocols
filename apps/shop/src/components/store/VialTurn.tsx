"use client";

import { useEffect, useRef, useState } from "react";
import Vial from "@/components/store/Vial";
import { useChosenStrength } from "@/lib/chosen-strength";
import type { Vial3D, VialLabelInput } from "@/components/store/vial-3d";
import { MAX_DPR, QR_FACING_TURN } from "@/lib/vial-label";

// Product page vial: the store's <Vial> paints first (and stays when WebGL isn't there);
// then the same vial in 3D takes its place and turns slowly to show the barcode and the
// QR code for its lot. Drag to turn it by hand. Reduce-motion keeps it still on the front.
// Paused while off screen or in a background tab. It follows the size picker: each strength
// shows its own strength, lot and QR code (redrawn in place, without restarting the turn).
export type VialStrength = { id: string; strength: string; lot: string | null; qr: string[] };
// Home page (2026-10-17): `turns` 2 and `restOn` "qr" — it turns twice, then comes to rest
// with the QR code facing out (the dotted line to the certificate points at it); after a
// drag it eases back there. Reduce-motion starts and stays on the QR code.
type Props = {
  id: string; slug: string; label: string; label2?: string; parts?: string[];
  cap?: VialLabelInput["cap"]; rule?: string; strengths: VialStrength[];
  turns?: number; restOn?: "front" | "qr";
};

// Turning speed in radians a second, by how far the vial has turned from its front: slow
// while the front panel (the compound) faces out, quicker round the barcode and QR code,
// easing smoothly between (one turn takes about 18 s with the QR hold, 8 of them within 45° of
// the front). After MAX_TURNS (two) it rests facing front.
// It also eases into the QR code and holds there (QR_HOLD_MS) while the caption under the
// picture lights up ("aura:vial-qr" event → QrNote), then eases out.
const SLOW = 0.15, FAST = 1.1;
const HOLD_MS = 2000; // when the page opens, the front holds still this long before it starts to turn
const QR_HOLD_MS = 1500;
// After this many full turns it comes to rest facing front (the compound) and stays there;
// dragging still turns it.
export const MAX_TURNS = 2; // was 6; two everywhere since 2026-10-18 (Alvester)
const TAU = 2 * Math.PI;
const turnedOf = (angle: number) => ((-angle % TAU) + TAU) % TAU; // 0 = front facing out
const speedAt = (angle: number) => {
  const turned = turnedOf(angle);
  const nearQr = Math.exp(-(((turned - QR_FACING_TURN) / 0.45) ** 2));
  return (SLOW + (FAST - SLOW) * (1 - Math.cos(turned)) / 2) * (1 - 0.7 * nearQr);
};
// One frame of the automatic turn. The angle is kept within one turn: a running total grows
// each lap until rounding made a just-finished pause look like the QR code arriving again, and
// the vial froze on it (2026-10-17). The QR code pauses it once per turn: `armed` resets only
// after the vial comes round past its front.
// `lapDone`: it came round past its front this frame (one full turn).
export function advanceTurn(angle: number, dt: number, armed: boolean): { angle: number; armed: boolean; atQr: boolean; lapDone: boolean } {
  const before = turnedOf(angle);
  const next = -turnedOf(angle - dt * speedAt(angle));
  const after = turnedOf(next);
  const lapDone = after < before;
  if (lapDone) armed = true;
  if (armed && before < QR_FACING_TURN && after >= QR_FACING_TURN) return { angle: -QR_FACING_TURN, armed: false, atQr: true, lapDone };
  return { angle: next, armed, atQr: false, lapDone };
}

export const VIAL_QR_EVENT = "aura:vial-qr";
const announceQr = (slug: string, showing: boolean) =>
  window.dispatchEvent(new CustomEvent(VIAL_QR_EVENT, { detail: { slug, showing } }));

function webgl2(): boolean {
  if (typeof WebGL2RenderingContext === "undefined") return false;
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export default function VialTurn({ id, slug, label, label2, parts = [], cap = "red", rule = "#A32B1F", strengths, turns = MAX_TURNS, restOn = "front" }: Props) {
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
    const onQr = restOn === "qr";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true, vial: Vial3D | null = null, raf = 0, last = 0, angle = onQr && still ? -QR_FACING_TURN : 0, onScreen = true, startAt = 0, qrUntil = 0, qrArmed = true, laps = 0, resting = false, finishing = false;
    let drag: { x: number; angle: number } | null = null;
    // While the page scrolls the vial holds still and draws nothing, so the phone's graphics
    // go to the scroll (2026-10-18: the turning vial made phones stutter); it picks up again
    // a moment after the scroll stops.
    let scrollingUntil = 0, scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      scrollingUntil = performance.now() + 180;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => wake(), 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // the code turns the store's red while the vial pauses on it, as the caption under it lights
    const lightQr = (on: boolean) => vial?.setLabel({ ...inputRef.current, qrLit: on });

    const frame = (t: number) => {
      raf = 0;
      if (!vial || !alive) return;
      if (!drag && performance.now() < scrollingUntil) return; // resumes via the scroll timer
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (qrUntil && (t >= qrUntil || drag)) { qrUntil = 0; announceQr(slug, false); lightQr(false); }
      if (!still && !resting && !drag && t >= startAt && !qrUntil) {
        const step = advanceTurn(angle, dt, qrArmed);
        angle = step.angle; qrArmed = step.armed;
        // reached the QR code: it faces out exactly; hold and light the caption —
        // or, after the last turn of a vial that rests on its QR code, stop there
        if (step.atQr && finishing) { resting = true; announceQr(slug, true); }
        else if (step.atQr) { qrUntil = t + QR_HOLD_MS; announceQr(slug, true); lightQr(true); }
        // the last full turn ends facing front, where it rests (or goes on to its QR code)
        if (step.lapDone && ++laps >= turns) { if (onQr) finishing = true; else { angle = 0; resting = true; } }
      }
      // resting on its QR code: after a drag it eases back
      let easing = false;
      if (onQr && (resting || still) && !drag) {
        const off = -QR_FACING_TURN - angle;
        if (Math.abs(off) > 0.002) { angle += still ? off : off * Math.min(1, dt * 5); easing = true; }
        else if (angle !== -QR_FACING_TURN) { angle = -QR_FACING_TURN; announceQr(slug, true); }
      }
      vial.setAngle(angle);
      vial.render();
      if (onScreen && !document.hidden && ((!still && !resting) || drag || qrUntil || easing)) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && vial && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

    const down = (e: PointerEvent) => { drag = { x: e.clientX, angle }; canvas.setPointerCapture(e.pointerId); if (onQr && (resting || still)) announceQr(slug, false); wake(); };
    const move = (e: PointerEvent) => { if (drag) { angle = drag.angle + (e.clientX - drag.x) * 0.012; wake(); } };
    const up = () => { drag = null; wake(); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); });
    seen.observe(canvas);
    // exact device pixels where the browser reports them (not Safari): no resampling blur
    const exact = (window.devicePixelRatio || 1) <= MAX_DPR;
    let px: { w?: number; h?: number } = {};
    const sized = new ResizeObserver(([e]) => {
      // trusted only when it agrees with the CSS size × pixel ratio (emulators report 1×)
      const box = exact ? e.devicePixelContentBoxSize?.[0] : undefined;
      const want = e.contentRect.width * (window.devicePixelRatio || 1);
      px = box && Math.abs(box.inlineSize - want) <= 2 ? { w: box.inlineSize, h: box.blockSize } : {};
      vial?.resize(px.w, px.h);
      start();
      wake();
    });
    try { sized.observe(canvas, { box: "device-pixel-content-box" }); } catch { sized.observe(canvas); }
    document.addEventListener("visibilitychange", wake);

    // Started only once it's on the page: a vial inside something hidden (the desktop strip on a
    // phone) never builds its 3D scene until it's shown.
    let started = false;
    const start = () => {
      if (started || !canvas.getClientRects().length) return;
      started = true;
      import("@/components/store/vial-3d")
      .then(({ mountVial3D }) => mountVial3D(canvas, inputRef.current))
      .then((v) => {
        if (!alive) { v.dispose(); return; }
        vial = v; vialRef.current = v; wakeRef.current = wake;
        v.resize(px.w, px.h);
        v.setLabel(inputRef.current); // a size picked while it loaded
        startAt = performance.now() + HOLD_MS; setReady(true); wake();
        if (onQr && still) announceQr(slug, true);
      })
      .catch((err) => console.error("turning vial unavailable; showing the still vial", err));
    };
    start();

    return () => {
      alive = false;
      if (qrUntil) announceQr(slug, false);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(scrollTimer);
      window.removeEventListener("scroll", onScroll);
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
  }, [slug, label, label2, parts.join("|"), cap, rule, turns, restOn]);

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
        aria-label={`${label2 ? `${label} ${label2}` : label} ${strength} vial, ${restOn === "qr" ? "turning to show" : "turning to show its barcode and"} ${lot ? `the QR code for lot ${lot}'s certificate of analysis` : "a QR code to the certificate lookup"}`}
      />
    </div>
  );
}
