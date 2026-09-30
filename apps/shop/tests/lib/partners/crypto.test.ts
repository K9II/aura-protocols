import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";

describe("payout details encryption", () => {
  beforeEach(() => { process.env.PAYOUT_DETAILS_KEY = randomBytes(32).toString("base64"); });

  it("round-trips and never stores plaintext", async () => {
    const { encryptDetails, decryptDetails } = await import("@/lib/partners/crypto");
    const plain = JSON.stringify({ routing: "021000021", account: "123456784821", bank: "Chase" });
    const enc = encryptDetails(plain);
    expect(enc).not.toContain("123456784821");
    expect(decryptDetails(enc)).toBe(plain);
    expect(encryptDetails(plain)).not.toBe(enc); // random IV
  });

  it("rejects tampered ciphertext", async () => {
    const { encryptDetails, decryptDetails } = await import("@/lib/partners/crypto");
    const enc = Buffer.from(encryptDetails("hello"), "base64");
    enc[enc.length - 1] ^= 1;
    expect(() => decryptDetails(enc.toString("base64"))).toThrow();
  });

  it("requires a 32-byte key", async () => {
    process.env.PAYOUT_DETAILS_KEY = Buffer.from("short").toString("base64");
    const { encryptDetails } = await import("@/lib/partners/crypto");
    expect(() => encryptDetails("x")).toThrow(/PAYOUT_DETAILS_KEY/);
  });
});
