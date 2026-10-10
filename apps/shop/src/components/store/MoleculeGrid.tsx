"use client";

import { useState } from "react";
import MoleculeViewer from "@/components/store/MoleculeViewer";
import type { Structure } from "@/lib/structure";

// Blends: the components are separate molecules (not bonded). One full-size stage, the
// same as a single compound's, with a button per component to switch between them
// (Alvester 2026-10-10: blend molecules were drawn at half size in a grid).
export default function MoleculeGrid({ structures }: { structures: Structure[] }) {
  const [i, setI] = useState(0);
  const current = structures[i] ?? structures[0];
  if (!current) return null;
  return (
    <div className="s-mol-blend">
      <div className="s-mol-pick" role="group" aria-label="Show a component">
        {structures.map((s, k) => (
          <button key={s.id} type="button" aria-pressed={k === i} onClick={() => setI(k)}>{s.label}</button>
        ))}
      </div>
      {/* key: a fresh viewer per component, so the old one releases its WebGL context */}
      <MoleculeViewer key={current.id} structure={current} />
    </div>
  );
}
