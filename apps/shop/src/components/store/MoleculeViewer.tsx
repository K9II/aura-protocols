"use client";

import { useEffect, useRef, useState } from "react";
import { ELEMENT_COLORS, type Structure } from "@/lib/structure";

type Status = "idle" | "ready" | "unavailable";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
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
    let viewer: { clear: () => void; spin: (axis: string | boolean, speed?: number) => void } | null = null;

    const start = async () => {
      if (!hasWebGL()) { setStatus("unavailable"); return; }
      try {
        const [{ createViewer }, text] = await Promise.all([
          import("3dmol"),
          fetch(structure.file).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); }),
        ]);
        if (cancelled) return;
        const v = createViewer(el, { backgroundColor: "#E2DCCC" });
        if (!v) { setStatus("unavailable"); return; }
        v.addModel(text, "sdf");
        const colorscheme = { prop: "elem", map: ELEMENT_COLORS };
        v.setStyle({}, { stick: { radius: 0.14, colorscheme: colorscheme as never }, sphere: { scale: 0.22, colorscheme: colorscheme as never } });
        v.zoomTo();
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) v.spin("y", 0.6);
        v.render();
        viewer = v as unknown as typeof viewer;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    };

    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); void start(); }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      viewer?.spin(false);
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
