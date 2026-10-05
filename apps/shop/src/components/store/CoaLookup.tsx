"use client";

import Link from "next/link";
import { useState } from "react";

export type LotRow = {
  lot: string; name: string; slug: string; strength: string;
  purityPct: number; method: string; testedOn: string; coaFile: string;
  status: string;   // "Current" | "Sold out" | "Retired"
};

export default function CoaLookup({ rows }: { rows: LotRow[] }) {
  const [value, setValue] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const hit = searched ? rows.find((r) => r.lot.toUpperCase() === searched.toUpperCase()) : undefined;

  return (
    <div>
      <form
        className="s-search"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (!trimmed) return;
          setSearched(trimmed);
        }}
      >
        <label htmlFor="lot" className="sr-only">Lot number</label>
        <input id="lot" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Lot number, e.g. AP-XXXX" required />
        <button type="submit">Look up →</button>
      </form>
      <div role="status" aria-live="polite">
        {searched && (hit ? (
          <div className="mt-8 border border-[color:var(--line)] p-6 max-w-xl">
            <p className="s-micro text-[color:var(--ink-soft)]">Lot {hit.lot} · {hit.status}</p>
            <p className="p-serif text-3xl my-2"><Link href={`/products/${hit.slug}`}>{hit.name}</Link></p>
            <p className="text-sm text-[color:var(--ink-soft)]">{hit.strength} · Purity {hit.purityPct}% · {hit.method} · tested {hit.testedOn}</p>
            {hit.coaFile ? (
              <a className="s-certlink" href={hit.coaFile} target="_blank" rel="noopener noreferrer">◇ Open certificate</a>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--specimen)]">The certificate file is being uploaded — check back shortly.</p>
            )}
          </div>
        ) : (
          <p className="mt-8 text-[color:var(--specimen)]">No lot “{searched}” found. Check the number printed on your vial label.</p>
        ))}
      </div>
    </div>
  );
}
