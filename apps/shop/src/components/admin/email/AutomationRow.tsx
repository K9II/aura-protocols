"use client";
// One row of the Automations table (mock screen 1): a summary row with a
// chevron that expands/collapses its per-step detail rows. Welcome opens by
// default, Cart reminders starts collapsed — set by the caller via
// `defaultExpanded`. Renders a pair of <tbody> elements (no wrapping tag),
// so it's used directly as a child of the <table>.
import { useState } from "react";
import { Icon } from "@/components/admin/ui";

export default function AutomationRow({
  defaultExpanded, name, meta, switchSlot, cells, steps,
}: {
  defaultExpanded: boolean;
  name: string;
  meta: React.ReactNode;
  switchSlot: React.ReactNode;
  cells: React.ReactNode;
  steps: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  return (
    <>
      <tbody>
        <tr className={open ? "expanded" : undefined}>
          <td className="a-auto-name"><b>{name}</b><small>{meta}</small></td>
          <td>{switchSlot}</td>
          {cells}
          <td className="a-rowmenu">
            <button type="button" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${name}`} onClick={() => setOpen((o) => !o)}>
              <Icon name="down" style={open ? { transform: "rotate(180deg)" } : undefined} />
            </button>
          </td>
        </tr>
      </tbody>
      {open && <tbody className="a-steprows">{steps}</tbody>}
    </>
  );
}
