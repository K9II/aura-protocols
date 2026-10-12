"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { PublicCert } from "@/data/catalog";
import { CLASS_COLOR } from "@/lib/class-colors";
import CertCard from "@/components/store/CertCard";

export type LotHit = { lot: string; name: string; slug: string; strength: string; status: string; chemicalClass: string };

const TEST_LABELS: Record<string, string> = { identity: "Identity", endotoxin: "Endotoxin", sterility: "Sterility", heavy_metals: "Heavy metals", fentanyl: "Fentanyl" };

function cardHead(c: PublicCert): string {
  if (c.purityPct != null) return "Purity panel";
  const passed = (Object.keys(c.tests) as (keyof PublicCert["tests"])[]).filter((k) => c.tests[k] === "pass").map((k) => TEST_LABELS[k]);
  if (!passed.length) return "Certificate";
  return passed.map((label, i) => (i === 0 ? label : label.toLowerCase())).join(" & ");
}

export default function CoaLookup({ lots, certs }: { lots: LotHit[]; certs: PublicCert[] }) {
  const [value, setValue] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const hit = searched ? lots.find((l) => l.lot.toUpperCase() === searched.toUpperCase()) : undefined;
  const hitCerts = hit ? certs.filter((c) => c.lot === hit.lot) : [];
  const hitLabs = new Set(hitCerts.map((c) => c.labName)).size;

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
          <div className="s-coa-hit" style={{ "--cls": CLASS_COLOR[hit.chemicalClass as keyof typeof CLASS_COLOR] } as CSSProperties}>
            <div className="s-coa-hith">
              <div>
                <p className="s-cert-cls"><i />{hit.chemicalClass}</p>
                <p className="s-micro">Lot {hit.lot} · {hit.status}</p>
                <p className="s-coa-hitn"><Link href={`/products/${hit.slug}`}>{hit.name}</Link> <small>{hit.strength}</small></p>
              </div>
              <p className="s-micro s-coa-hitc">{hitCerts.length} certificate{hitCerts.length === 1 ? "" : "s"} · {hitLabs} lab{hitLabs === 1 ? "" : "s"}</p>
            </div>
            {hitCerts.length ? (
              <div className="s-certs">{hitCerts.map((c) => <CertCard key={c.id} cert={c} showName={false} head={cardHead(c)} />)}</div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--specimen)]">No certificate is published for this lot yet.</p>
            )}
          </div>
        ) : (
          <p className="mt-8 text-[color:var(--specimen)]">No lot “{searched}” found. Check the number printed on your vial label.</p>
        ))}
      </div>
    </div>
  );
}
