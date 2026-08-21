"use client";

import { useState, type ReactNode } from "react";
import StartVisit from "@/app/StartVisit";

// This landing page is about one specific SKU, so the hand-off is hard-wired
// to it rather than resolved from the live catalog (per the verified snapshot
// this page was built against — re-check before publishing if pricing moves).
const CATEGORY = "weight-loss";
const PRODUCT_ID = "f11f887a-f9a2-4696-9cd8-735b26824b60";
const LABEL = "Injectable Tirzepatide with additives";

type Props = {
  children: ReactNode;
  className?: string;
  sub?: number;
};

/** Any conversion CTA on this page opens the same save-your-match modal used
 *  site-wide, which then hands off to /go/weight-loss/[id] (StartVisit owns
 *  that URL construction — see src/app/go/[category]/[id]/route.ts). */
export default function TirzepatideCTA({ children, className, sub }: Props) {
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
          productId={PRODUCT_ID}
          label={LABEL}
          sub={sub}
        />
      )}
    </>
  );
}
