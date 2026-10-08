import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyHumanCheck } from "@/lib/turnstile";

const REAL = "0x4AAAAAAA-real-secret";
const TEST_PASS = "1x0000000000000000000000000000000AA";
const fetchMock = vi.fn();
const reply = (body: object, status = 200) => fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe("verifyHumanCheck", () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); vi.stubEnv("TURNSTILE_SECRET_KEY", REAL); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("passes a genuine token for our site and the checkout action", async () => {
    reply({ success: true, action: "checkout", hostname: "auraprotocols.com" });
    expect(await verifyHumanCheck("tok", "1.2.3.4", "auraprotocols.com")).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = init.body as URLSearchParams;
    expect(body.get("secret")).toBe(REAL);
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("fails a rejected token, the wrong action and the wrong site", async () => {
    reply({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "failed" });
    reply({ success: true, action: "login", hostname: "auraprotocols.com" });
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "failed" });
    reply({ success: true, action: "checkout", hostname: "evil.example" });
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "failed" });
  });

  it("fails a missing token without calling Cloudflare", async () => {
    expect(await verifyHumanCheck(undefined, null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is unavailable (not the customer's fault) with no secret, a bad secret, an HTTP error or no answer", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "unavailable" });
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL);
    reply({ success: false, "error-codes": ["invalid-input-secret"] });
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "unavailable" });
    reply({}, 500);
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "unavailable" });
    fetchMock.mockRejectedValue(new Error("timeout"));
    expect(await verifyHumanCheck("tok", null, "auraprotocols.com")).toMatchObject({ ok: false, reason: "unavailable", detail: expect.stringMatching(/timeout/) });
  });

  it("with Cloudflare's test secret, only success counts (test keys report no real action or site)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", TEST_PASS);
    reply({ success: true, action: "", hostname: "example.com" });
    expect(await verifyHumanCheck("XXXX.DUMMY.TOKEN.XXXX", null, "localhost")).toEqual({ ok: true });
  });
});
