import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.GATE_COOKIE_SECRET;
  if (!s) throw new Error("Missing GATE_COOKIE_SECRET environment variable");
  return s;
}

const sig = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function hashIp(ip: string): string {
  return createHash("sha256").update(`${secret()}:${ip}`).digest("hex");
}

// Set on a browser that has been told to verify its email (a flagged
// account): new accounts made from it must verify before browsing too.
export const DEVICE_FLAG_COOKIE = "aura_dev";
export const DEVICE_FLAG_MAX_AGE_S = 60 * 60 * 24 * 365;

export function signDeviceFlag(nowMs: number = Date.now()): string {
  const payload = String(nowMs);
  return `${payload}.${sig(`dev:${payload}`)}`;
}

export function verifyDeviceFlag(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [payload, given] = parts;
  if (!payload || !given) return false;
  const expected = Buffer.from(sig(`dev:${payload}`));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
