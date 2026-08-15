import crypto from "node:crypto";

export function verifyWebhookSignature(params: {
  header: string | null;
  rawBody: string;
  secret: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): { valid: boolean; reason?: string } {
  const { header, rawBody, secret } = params;
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = params.toleranceSeconds ?? 300;

  if (!header) return { valid: false, reason: "missing_header" };

  const fields: Record<string, string> = {};
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    fields[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  const t = Number(fields.t);
  const v1 = fields.v1;
  if (!Number.isFinite(t) || !v1) return { valid: false, reason: "malformed" };
  if (Math.abs(now - t) > tolerance) return { valid: false, reason: "stale" };

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, reason: "mismatch" };
  return { valid: true };
}
