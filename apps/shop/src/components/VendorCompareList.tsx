"use client";

import { useState } from "react";
import { goUrl } from "@/lib/affiliate";
import { vendorProfiles } from "@/data/vendorProfiles";
import type { ProductVendor } from "@/data/products";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-3 h-1.5 rounded-sm ${i <= score ? "bg-cyan-400" : "bg-white/10"}`} />
      ))}
    </div>
  );
}

const SCORE_ROWS: [string, "catalogBreadth" | "shippingSpeed" | "coaPractices"][] = [
  ["Catalog Breadth", "catalogBreadth"],
  ["Shipping Speed", "shippingSpeed"],
  ["COA Practices", "coaPractices"],
];

export default function VendorCompareList({
  vendors,
  productSlug,
}: {
  vendors: ProductVendor[];
  productSlug: string;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (vendorName: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(vendorName)) next.delete(vendorName);
      else next.add(vendorName);
      return next;
    });
  };

  const showPicker = vendors.length >= 3;
  const selectedProfiles = vendorProfiles.filter((v) => checked.has(v.vendor));

  return (
    <div className="space-y-3">
      {vendors.map((v, i) => (
        <div key={v.vendor} className={i > 0 ? "pt-3 border-t border-white/5" : ""}>
          <div className="flex items-start gap-2 mb-1">
            {showPicker && (
              <input
                type="checkbox"
                checked={checked.has(v.vendor)}
                onChange={() => toggle(v.vendor)}
                className="mt-1 accent-cyan-400"
                aria-label={`Compare ${v.vendor}`}
              />
            )}
            <p className="text-sm font-semibold text-white">{v.vendor}</p>
          </div>
          {v.note && <p className="text-xs text-slate-500 mb-2">{v.note}</p>}
          <a
            href={goUrl(v.vendor, productSlug)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`w-full text-center text-xs py-2 block ${i === 0 ? "btn-primary" : "btn-outline"}`}
          >
            Buy Direct from {v.vendor} →
          </a>
        </div>
      ))}

      {showPicker && selectedProfiles.length >= 2 && (
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-3">
            Comparing {selectedProfiles.length} Vendors
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-slate-500 font-semibold pb-2 pr-3">Category</th>
                  {selectedProfiles.map((p) => (
                    <th key={p.vendor} className="text-left text-slate-300 font-semibold pb-2 pr-3">
                      {p.vendor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_ROWS.map(([label, key]) => (
                  <tr key={key} className="border-t border-white/5">
                    <td className="text-slate-500 py-2 pr-3">{label}</td>
                    {selectedProfiles.map((p) => (
                      <td key={p.vendor} className="py-2 pr-3">
                        <ScoreBar score={p.scores[key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPicker && checked.size === 1 && (
        <p className="text-xs text-slate-500 pt-2">Select one more vendor to compare.</p>
      )}
    </div>
  );
}
