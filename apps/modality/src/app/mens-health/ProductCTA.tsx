"use client";

import { useState, type ReactNode } from "react";
import StartVisit from "@/app/StartVisit";

const CATEGORY = "mens-health";

type Props = {
  children: ReactNode;
  className?: string;
  sub?: number;
  /** Which product this CTA hands off to — shared across the men's-health
   *  lane (hub + compare pages route to more than one SKU), so the id/label
   *  are passed in per-CTA instance. Mirrors weight-loss/ProductCTA.tsx. */
  productId: string;
  label: string;
};

/** Any conversion CTA on this lane opens the same save-your-match modal used
 *  site-wide, which then hands off to /go/mens-health/[id] (StartVisit owns
 *  that URL construction — see src/app/go/[category]/[id]/route.ts). */
export default function ProductCTA({ children, className, sub, productId, label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <StartVisit
          open
          onClose={() => setOpen(false)}
          category={CATEGORY}
          productId={productId}
          label={label}
          sub={sub}
        />
      )}
    </>
  );
}
