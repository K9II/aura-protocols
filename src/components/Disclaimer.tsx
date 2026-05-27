import { DISCLAIMER } from "@/lib/constants";

export default function Disclaimer() {
  return (
    <aside
      role="note"
      className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100"
    >
      {DISCLAIMER}
    </aside>
  );
}
