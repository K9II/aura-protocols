import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { TERMS_VERSION } from "@/lib/gate-shared";

function secret(): string {
  const s = process.env.GATE_COOKIE_SECRET;
  if (!s) throw new Error("Missing GATE_COOKIE_SECRET environment variable");
  return s;
}

function sig(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signGateToken(termsVersion: string, attestationId: string): string {
  // "." separator: cookie values are URL-encoded by Next, "|" would not round-trip.
  const payload = `${termsVersion}.${attestationId}`;
  return `${payload}.${sig(payload)}`;
}

export function verifyGateToken(token: string, currentVersion: string = TERMS_VERSION): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, id, given] = parts;
  if (version !== currentVersion || !id) return false;
  const expected = Buffer.from(sig(`${version}.${id}`));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secret()}:${ip}`).digest("hex");
}
