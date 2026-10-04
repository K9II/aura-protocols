"use client";

// Error boundary for everything under /admin. In production Next hides the
// real message from a thrown server action (lib/discounts/data.ts, actions.ts
// throw loudly on a failed write) — so this shows a calm generic message and,
// when present, the error.digest to match server logs. unstable_retry()
// re-renders the boundary's children without a full navigation (Next 16.2+);
// reset() is kept as a fallback for older error.tsx callers.
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
};

export default function AdminError({ error, unstable_retry, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const retry = unstable_retry ?? reset ?? (() => {});

  return (
    <div className="adm">
      <div className="a-content">
        <div className="a-page">
          <div className="a-empty">
            <p>That didn&apos;t go through. The page may be out of date — reload and try again.</p>
            {error.digest && <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", marginTop: 8 }}>{error.digest}</p>}
            <button type="button" className="a-btn primary" style={{ marginTop: 16 }} onClick={retry}>Try again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
