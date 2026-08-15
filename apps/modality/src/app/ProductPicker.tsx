"use client";

import { useState } from "react";
import type { CatalogProduct } from "@/lib/telehealth/types";
import type { ProductGroup } from "@/lib/telehealth/groups";
import StartVisit from "./StartVisit";

const PICKER_THRESHOLD = 6;

export type Lane = {
  category: string;
  code: string;
  label: string;
  fromAmount: number | null;
  productId: string;
  groups: ProductGroup[];
};

type Props = {
  lane: Lane;
  sub?: number;
  signalMatch: boolean;
};

type Picked = { productId: string; label: string };

function totalCount(groups: ProductGroup[]): number {
  return groups.reduce((n, g) => n + g.products.length, 0);
}

export default function ProductPicker({ lane, sub, signalMatch }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chosen, setChosen] = useState<Picked | null>(null);

  const count = totalCount(lane.groups);
  const mode: "shortcut" | "inline" | "modal" =
    count <= 1 ? "shortcut" : count <= PICKER_THRESHOLD ? "inline" : "modal";
  const isOpen = expanded || pickerOpen;
  const hasBrandGroup = lane.groups.length === 2;
  const caption = count <= 1 ? null : hasBrandGroup ? `${count} products, incl. brand-name` : `${count} products`;

  function pick(picked: Picked) {
    setExpanded(false);
    setPickerOpen(false);
    setChosen(picked);
  }

  function onRowClick() {
    if (mode === "shortcut") {
      const only = lane.groups[0]?.products[0];
      pick(only ? { productId: only.id, label: only.name } : { productId: lane.productId, label: lane.label });
      return;
    }
    if (mode === "inline") setExpanded((v) => !v);
    else setPickerOpen((v) => !v);
  }

  return (
    <>
      <button type="button" className="irow" aria-expanded={isOpen} onClick={onRowClick}>
        <span className="code">{lane.code}</span>
        <span className="nm">
          {lane.label}
          {caption && <small>{caption}</small>}
        </span>
        {signalMatch ? <span className="flag">★ Matches your signal</span> : <span aria-hidden="true" />}
        <span className="px">
          {lane.fromAmount != null ? (
            <>
              <small>from</small> ${lane.fromAmount}
              <small>/mo</small>
            </>
          ) : (
            <small>See options</small>
          )}
        </span>
        {mode !== "shortcut" && (
          <span className="chev" aria-hidden="true">
            ›
          </span>
        )}
      </button>

      {mode === "inline" && expanded && (
        <div className="expand-panel">
          <ProductGroups groups={lane.groups} onPick={pick} />
        </div>
      )}

      {mode === "modal" && pickerOpen && (
        <div className="m-scrim" role="presentation" onClick={() => setPickerOpen(false)}>
          <div
            className="m-modal picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Choose your ${lane.label} protocol`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mtag">Before your visit</p>
            <h2>Choose your {lane.label} protocol</h2>
            <ProductGroups groups={lane.groups} onPick={pick} />
          </div>
        </div>
      )}

      {chosen && (
        <StartVisit
          open
          onClose={() => setChosen(null)}
          category={lane.category}
          productId={chosen.productId}
          label={chosen.label}
          sub={sub}
        />
      )}
    </>
  );
}

function ProductGroups({ groups, onPick }: { groups: ProductGroup[]; onPick: (p: Picked) => void }) {
  return (
    <>
      {groups.map((g) => (
        <div className="grp" key={g.heading ?? "all"}>
          {g.heading && <p className="grp-h">{g.heading}</p>}
          <div className="pgrid">
            {g.products.map((p: CatalogProduct) => (
              <button
                type="button"
                key={p.id}
                className="pcard"
                onClick={() => onPick({ productId: p.id, label: p.name })}
              >
                <div className="pn">{p.name}</div>
                <div className="pp">
                  from ${p.fromPrice?.amount}
                  <small>/mo</small>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
