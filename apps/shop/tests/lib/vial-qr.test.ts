import { describe, it, expect } from "vitest";
import { lotQrUrl, qrRows } from "@/lib/vial-qr";

describe("vial QR", () => {
  it("links to the lot's certificate through /L/, in capitals like the printed label", () => {
    expect(lotQrUrl("bpc-2609-01", "https://auraprotocols.com")).toBe("HTTPS://AURAPROTOCOLS.COM/L/BPC-2609-01");
  });

  it("is a square of rows small enough for the 0.40 in label (at most 29 squares a side for a lot link)", () => {
    const rows = qrRows(lotQrUrl("BPC-2609-01", "https://auraprotocols.com"));
    expect(rows.length).toBeLessThanOrEqual(29);
    expect(rows.every((r) => r.length === rows.length && /^[01]+$/.test(r))).toBe(true);
    // finder pattern in the top-left corner
    expect(rows[0].slice(0, 7)).toBe("1111111");
  });
});
