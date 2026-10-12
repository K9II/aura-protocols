"use client";
// Lets CertificateDialog / CorrectionDialog report a success message to a
// full-width row under the lot instead of squeezing it into the narrow
// actions cell (2026-10-11 live check: the message and the "+ Add
// certificate" / "Correct count" buttons overflowed into the Held · sold ·
// left column). Wraps a lot's row group (main row, discrepancy note, cert
// list) so every dialog nested anywhere inside it — the actions cell's own
// "+ Add certificate", or a certificate's Edit / Correction note — shares
// the same message line.
import { createContext, useContext, useState, type ReactNode } from "react";

const Ctx = createContext<((msg: string) => void) | null>(null);

export function useLotMessage() {
  return useContext(Ctx);
}

// `as="row"` (default) is for the desktop table, a <tr> sibling of the lot's
// own row; `as="block"` is for the phone card, a plain <div> inside it (a
// <tr> there would be invalid outside a table).
export default function LotRowMessages({ children, as = "row" }: { children: ReactNode; as?: "row" | "block" }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Ctx.Provider value={setMsg}>
      {children}
      {msg && (as === "row"
        ? <tr className="a-msgrow"><td colSpan={5}><span className="a-ok" role="status">{msg}</span></td></tr>
        : <div className="a-msgrow"><span className="a-ok" role="status">{msg}</span></div>)}
    </Ctx.Provider>
  );
}
