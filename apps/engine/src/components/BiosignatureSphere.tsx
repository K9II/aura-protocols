"use client";

import { useEffect, useRef } from "react";
import { SIG } from "@/lib/theme/instrument";

const DIALS = [
  { label: "HRV", color: SIG.bio },
  { label: "RECOVERY", color: SIG.llm },
  { label: "STRAIN", color: SIG.alert },
];

const LOG_LINES = [
  "hrv_sync :: handshake ok  42ms",
  "sleep_arch :: mapping rem bands",
  "recovery_index :: computing…",
  "strain_curve :: integrating 7d window",
  "resp_rate :: baseline established",
  "spo2 :: within envelope",
  "tension_scan :: 0 flags raised",
  "protocol_router :: peptide stack → modality handoff",
  "protocol_cache :: cold — awaiting rebuild",
];

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return ctx;
}

export default function BiosignatureSphere() {
  const dialRef = useRef<HTMLCanvasElement | null>(null);
  const logRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafDial = 0, rafLog = 0;
    const cleanups: (() => void)[] = [];

    // ── Dial cluster ──────────────────────────────────────────
    if (dialRef.current) {
      const canvas = dialRef.current;
      const ctx = setupCanvas(canvas);
      const state = DIALS.map(() => ({ val: 0.5, target: 0.5, next: Math.random() * 60 }));

      const drawDials = () => {
        const w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
        ctx.clearRect(0, 0, w, h);

        const dialW = w / 3;
        const cy = h * 0.5;
        const r = Math.min(dialW * 0.34, h * 0.3);

        DIALS.forEach((d, i) => {
          const s = state[i];
          if (!reduced) {
            s.next--;
            if (s.next <= 0) { s.target = 0.15 + Math.random() * 0.7; s.next = 90 + Math.random() * 90; }
            s.val += (s.target - s.val) * 0.035;
          }
          const cx = dialW * i + dialW / 2;

          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
          ctx.strokeStyle = "rgba(28,26,21,0.08)";
          ctx.lineWidth = 9;
          ctx.stroke();

          ctx.strokeStyle = "rgba(28,26,21,0.28)";
          ctx.lineWidth = 1;
          for (let k = 0; k <= 10; k++) {
            const a = Math.PI * 0.75 + (Math.PI * 1.5) * (k / 10);
            const x1 = cx + Math.cos(a) * (r - 7), y1 = cy + Math.sin(a) * (r - 7);
            const x2 = cx + Math.cos(a) * (r + 2), y2 = cy + Math.sin(a) * (r + 2);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }

          const a = Math.PI * 0.75 + (Math.PI * 1.5) * s.val;
          const nx = cx + Math.cos(a) * (r - 10), ny = cy + Math.sin(a) * (r - 10);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = d.color;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, Math.PI * 2);
          ctx.fillStyle = SIG.ink;
          ctx.fill();

          ctx.font = "9px ui-monospace, 'SF Mono', Consolas, monospace";
          ctx.fillStyle = SIG.inkSoft;
          ctx.textAlign = "center";
          ctx.fillText(d.label, cx, cy + r + 18);
          ctx.textAlign = "left";
        });

        rafDial = requestAnimationFrame(drawDials);
      };
      drawDials();
      cleanups.push(() => cancelAnimationFrame(rafDial));
    }

    // ── Boot log ──────────────────────────────────────────────
    if (logRef.current) {
      const canvas = logRef.current;
      const ctx = setupCanvas(canvas);
      let printed: string[] = [];
      let lineIdx = 0, charIdx = 0, frame = 0, cursorOn = true;

      const step = () => {
        if (!reduced) {
          frame++;
          if (frame % 5 === 0) {
            if (lineIdx < LOG_LINES.length) {
              charIdx++;
              if (charIdx > LOG_LINES[lineIdx].length) {
                printed.push(LOG_LINES[lineIdx]);
                lineIdx++; charIdx = 0;
                if (printed.length > 3) printed.shift();
              }
            } else {
              lineIdx = 0; charIdx = 0; printed = [];
            }
          }
          if (frame % 18 === 0) cursorOn = !cursorOn;
        }

        const w = canvas.getBoundingClientRect().width, h = canvas.getBoundingClientRect().height;
        ctx.clearRect(0, 0, w, h);
        ctx.textBaseline = "top";
        ctx.font = "11px ui-monospace, 'SF Mono', Consolas, monospace";

        const lineH = 17;
        printed.forEach((l, i) => {
          ctx.fillStyle = SIG.inkSoft;
          ctx.fillText("▸ " + l, 4, i * lineH);
        });

        if (lineIdx < LOG_LINES.length) {
          const partial = LOG_LINES[lineIdx].slice(0, charIdx);
          ctx.fillStyle = SIG.bio;
          const y = printed.length * lineH;
          ctx.fillText("▸ " + partial, 4, y);
          const tw = ctx.measureText("▸ " + partial).width;
          if (cursorOn) {
            ctx.fillStyle = SIG.bio;
            ctx.fillRect(4 + tw + 2, y + 1, 6, 12);
          }
        }

        rafLog = requestAnimationFrame(step);
      };
      step();
      cleanups.push(() => cancelAnimationFrame(rafLog));
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div style={{ maxWidth: 340, margin: "0 auto" }}>
      <canvas ref={dialRef} style={{ width: "100%", height: 140, display: "block" }} />
      <div style={{ marginTop: 10, borderTop: `1px solid ${SIG.line}`, paddingTop: 8 }}>
        <canvas ref={logRef} style={{ width: "100%", height: 88, display: "block" }} />
      </div>
    </div>
  );
}
