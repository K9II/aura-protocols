"use client";

import { goUrl } from "@/lib/affiliate";
import { vendorProfiles } from "@/data/vendorProfiles";
import type { ProductVendor } from "@/data/products";

export default function VendorCompareList({
  vendors,
  productSlug,
}: {
  vendors: ProductVendor[];
  productSlug: string;
}) {
  return (
    <div className="pharmacopoeia space-y-3">
      {vendors.map((v, i) => {
        const fact = vendorProfiles.find((p) => p.vendor === v.vendor)?.pros[0];
        return (
        <div key={v.vendor} className={i > 0 ? "pt-3 border-t border-[color:var(--line)]" : ""}>
          <p className="text-sm font-semibold text-[color:var(--ink)] mb-1">{v.vendor}</p>
          {fact && <p className="text-xs text-[color:var(--ink-soft)] mb-2">{fact}</p>}
          {v.note && <p className="text-xs text-[color:var(--ink-soft)] mb-2">{v.note}</p>}
          <a
            href={goUrl(v.vendor, productSlug)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className={`w-full text-center text-xs py-2 block ${i === 0 ? "p-btn-primary" : "p-btn-outline"}`}
          >
            Buy Direct from {v.vendor} →
          </a>
        </div>
        );
      })}
    </div>
  );
}
