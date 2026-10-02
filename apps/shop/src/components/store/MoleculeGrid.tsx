import MoleculeViewer from "@/components/store/MoleculeViewer";
import type { Structure } from "@/lib/structure";

// Blends: one rotating panel per component (they're separate molecules, not bonded).
export default function MoleculeGrid({ structures }: { structures: Structure[] }) {
  return (
    <div className={`s-mol-grid s-mol-grid--${structures.length}`}>
      {structures.map((s) => (
        <div key={s.id} className="s-mol-cell">
          <span className="s-mol-tag s-micro">{s.label}</span>
          <MoleculeViewer structure={s} className="s-mol-cell-stage" />
        </div>
      ))}
    </div>
  );
}
