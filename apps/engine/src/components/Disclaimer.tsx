import { DISCLAIMER } from "@/lib/constants";

export default function Disclaimer() {
  return (
    <aside
      role="note"
      className="border border-[color:var(--line)] bg-[color:var(--paper-deep)] p-4 text-sm text-[color:var(--ink-faint)]"
    >
      {DISCLAIMER}
    </aside>
  );
}
