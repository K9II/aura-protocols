import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "@/lib/telehealth/signature";

const SECRET = "whsec_test";
function sign(body: string, t: number) {
  const v1 = crypto.createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "lead.created" });
  const now = 1_785_956_299;

  it("accepts a valid, fresh signature", () => {
    const header = sign(body, now);
    expect(verifyWebhookSignature({ header, rawBody: body, secret: SECRET, nowSeconds: now })).toEqual({ valid: true });
  });

  it("rejects a tampered body", () => {
    const header = sign(body, now);
    const r = verifyWebhookSignature({ header, rawBody: body + "x", secret: SECRET, nowSeconds: now });
    expect(r.valid).toBe(false);
  });

  it("rejects a stale timestamp beyond the 5-minute window", () => {
    const header = sign(body, now - 400);
    const r = verifyWebhookSignature({ header, rawBody: body, secret: SECRET, nowSeconds: now });
    expect(r).toEqual({ valid: false, reason: "stale" });
  });

  it("rejects a missing header", () => {
    expect(verifyWebhookSignature({ header: null, rawBody: body, secret: SECRET, nowSeconds: now }).valid).toBe(false);
  });
});
