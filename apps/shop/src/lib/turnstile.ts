import "server-only";
import { HUMAN_CHECK_ACTION } from "@/lib/human-check";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;
// Cloudflare's documented test secrets (always pass / always fail / already spent).
// Their answers carry no real action or hostname, so only `success` is checked.
const TEST_SECRET = /^[123]x0+AA$/;
// Errors that mean our setup is wrong, not that the visitor failed.
const OUR_FAULT = new Set(["missing-input-secret", "invalid-input-secret", "internal-error"]);

export type HumanCheckResult = { ok: true } | { ok: false; reason: "failed" | "unavailable"; detail: string };

type Siteverify = { success?: boolean; "error-codes"?: string[]; action?: string; hostname?: string };

// "unavailable" = we couldn't ask (no secret, Cloudflare down): checkout
// refuses and the owner is alerted. "failed" = the token isn't good.
export async function verifyHumanCheck(token: string | undefined, ip: string | null, expectedHost: string): Promise<HumanCheckResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: false, reason: "unavailable", detail: "TURNSTILE_SECRET_KEY is not set" };
  if (!token) return { ok: false, reason: "failed", detail: "no token" };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  let data: Siteverify;
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return { ok: false, reason: "unavailable", detail: `siteverify HTTP ${res.status}` };
    data = (await res.json()) as Siteverify;
  } catch (err) {
    return { ok: false, reason: "unavailable", detail: `siteverify unreachable: ${String(err)}` };
  }
  const codes = data["error-codes"] ?? [];
  if (data.success !== true) {
    if (codes.some((c) => OUR_FAULT.has(c))) return { ok: false, reason: "unavailable", detail: `siteverify: ${codes.join(",")}` };
    return { ok: false, reason: "failed", detail: codes.join(",") || "rejected" };
  }
  if (TEST_SECRET.test(secret)) return { ok: true };
  if (data.action !== HUMAN_CHECK_ACTION) return { ok: false, reason: "failed", detail: `wrong action ${data.action ?? "none"}` };
  if (data.hostname !== expectedHost) return { ok: false, reason: "failed", detail: `wrong hostname ${data.hostname ?? "none"}` };
  return { ok: true };
}
