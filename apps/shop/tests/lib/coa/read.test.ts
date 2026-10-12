import { describe, it, expect, vi, beforeEach } from "vitest";

const create = vi.fn();
class APIError extends Error { status: number; constructor(status: number, m = "err") { super(m); this.status = status; } }
class AuthenticationError extends APIError { constructor() { super(401, "invalid x-api-key"); } }
class PermissionDeniedError extends APIError { constructor() { super(403, "forbidden"); } }
class RateLimitError extends APIError { constructor(m = "slow down") { super(429, m); } }
class BadRequestError extends APIError { constructor(m = "bad request") { super(400, m); } }
vi.mock("@anthropic-ai/sdk", () => {
  // Arrow functions are never constructible (ES2015 semantics) — `new Anthropic()`
  // in the module under test needs a real function here, not the plan's arrow form.
  const Anthropic = vi.fn(function AnthropicMock() { return { beta: { messages: { create } } }; });
  Object.assign(Anthropic, { APIError, AuthenticationError, PermissionDeniedError, RateLimitError, BadRequestError });
  return { default: Anthropic };
});
const alertOwner = vi.fn();
vi.mock("@/lib/notify", () => ({ alertOwner }));
const hasOpenAlert = vi.fn();
vi.mock("@/lib/today/alerts", () => ({ hasOpenAlert }));

const READING = {
  lab_name: "Vanguard Laboratory", lab_city: "Olympia, WA", report_number: "VGD-24109", verify_code: null,
  tested_on: "2026-10-05", purity_pct: 99.47, method: "HPLC+MS", measured_mg: 10.42,
  identity: "pass", endotoxin: "pass", sterility: null, heavy_metals: null, fentanyl: null,
  product_name: "Tirzepatide", strength_label: "10 mg", batch: null,
};
const answer = (text: string, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text }], usage: { input_tokens: 5000, output_tokens: 400 } });
const PDF = new Uint8Array([37, 80, 68, 70]);

describe("readCertificate", () => {
  beforeEach(() => { vi.resetModules(); create.mockReset(); alertOwner.mockReset(); hasOpenAlert.mockReset(); hasOpenAlert.mockResolvedValue(false); process.env.ANTHROPIC_API_KEY = "sk-test"; });

  it("sends the PDF as a document block with the JSON schema, Opus 5, fallbacks, and returns the reading", async () => {
    create.mockResolvedValue(answer(JSON.stringify(READING)));
    const { readCertificate, COA_READER_MODEL } = await import("@/lib/coa/read");
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: true, reading: READING });
    const p = create.mock.calls[0][0];
    expect(COA_READER_MODEL).toBe("claude-opus-5");
    expect(p.model).toBe("claude-opus-5");
    expect(p.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(p.fallbacks).toBe("default");
    expect(p.thinking).toEqual({ type: "adaptive" });
    expect(p.output_config.format.type).toBe("json_schema");
    expect(p.output_config.format.schema.required).toContain("purity_pct");
    expect(p.messages[0].content[0]).toEqual({ type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(PDF).toString("base64") } });
    expect(p.messages[0].content[1].type).toBe("text");
    expect(JSON.stringify(p)).not.toMatch(/"result"/);
  });

  it("a thinking block before the text block still returns the reading", async () => {
    create.mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "thinking", thinking: "", signature: "x" }, { type: "text", text: JSON.stringify(READING) }],
      usage: { input_tokens: 5000, output_tokens: 400 },
    });
    const { readCertificate } = await import("@/lib/coa/read");
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: true, reading: READING });
  });

  it("refusal or max_tokens → not ok, no alert", async () => {
    const { readCertificate } = await import("@/lib/coa/read");
    create.mockResolvedValueOnce(answer("", "refusal"));
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    create.mockResolvedValueOnce(answer("{", "max_tokens"));
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("bad JSON or wrong shape → not ok", async () => {
    const { readCertificate } = await import("@/lib/coa/read");
    create.mockResolvedValueOnce(answer("not json"));
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    create.mockResolvedValueOnce(answer(JSON.stringify({ lab_name: 1 })));
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
  });

  it("missing key → alert with the stable title, no API call", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { readCertificate } = await import("@/lib/coa/read");
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    expect(create).not.toHaveBeenCalled();
    expect(alertOwner).toHaveBeenCalledWith("Certificate reader unavailable", expect.stringMatching(/^AP-1105 · /));
  });

  it("rejected key (401/403) → alert; rate limit / network → no alert", async () => {
    const { readCertificate } = await import("@/lib/coa/read");
    create.mockRejectedValueOnce(new AuthenticationError());
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    create.mockRejectedValueOnce(new PermissionDeniedError());
    await readCertificate(PDF, "AP-1106", "2026-10-12");
    expect(alertOwner).toHaveBeenCalledTimes(2);
    expect(alertOwner.mock.calls[0][0]).toBe("Certificate reader unavailable");
    alertOwner.mockReset();
    create.mockRejectedValueOnce(new RateLimitError());
    create.mockRejectedValueOnce(new Error("socket hang up"));
    await readCertificate(PDF, "AP-1105", "2026-10-12");
    await readCertificate(PDF, "AP-1105", "2026-10-12");
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("out of credit / over the spend limit (400 or 429) → alert; other bad requests → no alert", async () => {
    const { readCertificate } = await import("@/lib/coa/read");
    create.mockRejectedValueOnce(new BadRequestError("Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."));
    await readCertificate(PDF, "AP-1105", "2026-10-12");
    create.mockRejectedValueOnce(new RateLimitError("You have reached your specified API usage limits."));
    await readCertificate(PDF, "AP-1106", "2026-10-12");
    create.mockRejectedValueOnce(new BadRequestError("Workspace Spend Limit reached"));
    await readCertificate(PDF, "AP-1107", "2026-10-12");
    expect(alertOwner).toHaveBeenCalledTimes(3);
    expect(alertOwner).toHaveBeenNthCalledWith(1, "Certificate reader unavailable", expect.stringMatching(/^AP-1105 · .*out of credit or over its spend limit/));
    expect(alertOwner.mock.calls[1][1]).toMatch(/^AP-1106 · /);
    alertOwner.mockReset();
    create.mockRejectedValueOnce(new BadRequestError("messages: text content blocks must be non-empty"));
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    expect(alertOwner).not.toHaveBeenCalled();
  });

  it("alerts once: an open reader alert already there → no new alert; a failed check still alerts", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { readCertificate } = await import("@/lib/coa/read");
    hasOpenAlert.mockResolvedValueOnce(true);
    expect(await readCertificate(PDF, "AP-1105", "2026-10-12")).toEqual({ ok: false });
    expect(hasOpenAlert).toHaveBeenCalledWith("Certificate reader unavailable");
    expect(alertOwner).not.toHaveBeenCalled();
    hasOpenAlert.mockRejectedValueOnce(new Error("open alert read failed"));
    await readCertificate(PDF, "AP-1106", "2026-10-12");
    expect(alertOwner).toHaveBeenCalledWith("Certificate reader unavailable", expect.stringMatching(/^AP-1106 · /));
  });
});
