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
    <div className="space-y-3">
      {vendors.map((v, i) => {
        const fact = vendorProfiles.find((p) => p.vendor === v.vendor)?.pros[0];
        return (
        <div key={v.vendor} className={i > 0 ? "pt-3 border-t border-white/5" : ""}>
          <p className="text-sm font-semibold text-white mb-1">{v.vendor}</p>
          {fact && <p className="text-xs text-slate-400 mb-2">{fact}</p>}
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
        );
      })}
    </div>
  );
}
