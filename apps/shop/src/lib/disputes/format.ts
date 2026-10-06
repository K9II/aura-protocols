// Formatting for dispute evidence. Pure.
import { SHOP_TZ } from "@/lib/discounts/time";

const CARRIER_NAME: Record<string, string> = { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL" };
export const carrierName = (c: string | null): string => (c ? CARRIER_NAME[c] ?? c.toUpperCase() : "");

// "September 22, 2026" — the shop's date, for letters.
export const longDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: SHOP_TZ, month: "long", day: "numeric", year: "numeric" });

// "2026-09-15 01:02:41 UTC" — unambiguous, for the records a bank reads.
export const utcStamp = (iso: string): string => `${new Date(iso).toISOString().slice(0, 19).replace("T", " ")} UTC`;

export type Addr = { name: string; line1: string; line2: string | null; city: string; state: string; zip: string };
export const addressText = (a: Addr): string => [a.name, a.line1, a.line2, `${a.city}, ${a.state} ${a.zip}`].filter(Boolean).join(", ");

export const plural = (n: number, word: string): string => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

// pdf-lib's standard fonts encode WinAnsi only: drawing "≤" or an emoji
// throws. Common typography maps to plain text; anything else outside
// printable ASCII + Latin-1 becomes "?".
const MAP: Array<[RegExp, string]> = [
  [/[‐-―−]/g, "-"], [/[‘’‚′]/g, "'"], [/[“”„″]/g, "\""],
  [/…/g, "..."], [/≤/g, "<="], [/≥/g, ">="], [/→/g, "->"], [/[   ]/g, " "], [/\t/g, "  "],
];
export function pdfSafe(s: string): string {
  let t = s;
  for (const [re, to] of MAP) t = t.replace(re, to);
  let out = "";
  for (const ch of t) {
    const c = ch.codePointAt(0)!;
    out += ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) ? ch : "?";
  }
  return out;
}
