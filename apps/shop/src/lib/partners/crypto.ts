import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Partner bank / Zelle details at rest: AES-256-GCM, key from PAYOUT_DETAILS_KEY
// (32 random bytes, base64). Output = base64(iv[12] | tag[16] | ciphertext).
function key(): Buffer {
  const raw = process.env.PAYOUT_DETAILS_KEY;
  const k = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (k.length !== 32) throw new Error("PAYOUT_DETAILS_KEY must be 32 bytes, base64-encoded");
  return k;
}

export function encryptDetails(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptDetails(enc: string): string {
  const buf = Buffer.from(enc, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}
