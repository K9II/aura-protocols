import QRCode from "qrcode";
import { siteUrl } from "./supabase/env";

// The QR code printed on every vial opens its lot's certificate through /L/<lot>.
// In capitals, as on the label proof: the URL then fits QR's compact alphanumeric mode,
// so the code has fewer, larger squares at 0.40 in.
export function lotQrUrl(lot: string, base: string = siteUrl()): string {
  return `${base}/L/${encodeURIComponent(lot)}`.toUpperCase();
}

// Before a strength has its first lot (only before launch: the release check needs a live lot
// on every strength for sale) the code opens the certificate lookup instead.
export function coaLookupQrUrl(base: string = siteUrl()): string {
  return `${base}/coa`;
}

// Rows of "1" (dark) and "0" (light), no quiet zone; small enough to pass to the browser.
export function qrRows(text: string): string[] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const rows: string[] = [];
  for (let y = 0; y < modules.size; y++) {
    let row = "";
    for (let x = 0; x < modules.size; x++) row += modules.get(x, y) ? "1" : "0";
    rows.push(row);
  }
  return rows;
}
