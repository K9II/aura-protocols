import { describe, it, expect, vi, beforeEach } from "vitest";

const unsubscribe = vi.fn();
const recordEmailEvent = vi.fn();
vi.mock("@/lib/email/data", () => ({ unsubscribe }));
vi.mock("@/lib/email/admin-data", () => ({ recordEmailEvent }));
const alertOwner = vi.fn();
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

async function signed(email: string) {
  const { unsubscribeSig } = await import("@/lib/email/links");
  return `?e=${encodeURIComponent(email)}&s=${unsubscribeSig(email)}`;
}

describe("/api/unsubscribe", () => {
  beforeEach(() => {
    vi.resetModules(); unsubscribe.mockReset(); recordEmailEvent.mockReset(); alertOwner.mockReset();
    process.env.EMAIL_LINK_SECRET = "s"; unsubscribe.mockResolvedValue(true);
  });

  it("GET with a valid signature unsubscribes and redirects to the confirmation page", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(new Request(`http://localhost/api/unsubscribe${await signed("lab@example.com")}`));
    expect(unsubscribe).toHaveBeenCalledWith("lab@example.com");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/unsubscribed");
  });

  it("GET with a missing or forged signature changes nothing", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    for (const qs of ["?email=lab%40example.com", "?e=lab%40example.com&s=forged"]) {
      const res = await GET(new Request(`http://localhost/api/unsubscribe${qs}`));
      expect(res.headers.get("location")).toBe("https://auraprotocols.com/unsubscribed?state=invalid");
    }
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("POST (one-click from Gmail/Yahoo) unsubscribes and returns 200", async () => {
    const { POST } = await import("@/app/api/unsubscribe/route");
    const res = await POST(new Request(`http://localhost/api/unsubscribe${await signed("lab@example.com")}`, { method: "POST", body: "List-Unsubscribe=One-Click" }));
    expect(res.status).toBe(200);
    expect(unsubscribe).toHaveBeenCalledWith("lab@example.com");
  });

  it("returns 500 when the write fails (loud, not a fake success)", async () => {
    unsubscribe.mockRejectedValue(new Error("down"));
    const { POST } = await import("@/app/api/unsubscribe/route");
    expect((await POST(new Request(`http://localhost/api/unsubscribe${await signed("a@b.co")}`, { method: "POST" }))).status).toBe(500);
  });

  it("records where the unsubscribe came from when the link is tagged", async () => {
    const { unsubscribeUrl } = await import("@/lib/email/links");
    const url = unsubscribeUrl("https://auraprotocols.com", "a@b.co", "campaign.0b6f1c2e-1111-4222-8333-944455556666");
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(new Request(url.replace("https://auraprotocols.com", "http://localhost")));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/unsubscribed");
    expect(recordEmailEvent).toHaveBeenCalledWith({ type: "unsubscribe", email: "a@b.co", sourceKind: "campaign", sourceRef: "0b6f1c2e-1111-4222-8333-944455556666" });
  });

  it("doesn't record anything when the address was already unsubscribed", async () => {
    unsubscribe.mockResolvedValue(false);
    const { GET } = await import("@/app/api/unsubscribe/route");
    await GET(new Request(`http://localhost/api/unsubscribe${await signed("a@b.co")}`));
    expect(recordEmailEvent).not.toHaveBeenCalled();
  });

  it("an untagged link records an unknown source", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    await GET(new Request(`http://localhost/api/unsubscribe${await signed("a@b.co")}`));
    expect(recordEmailEvent).toHaveBeenCalledWith({ type: "unsubscribe", email: "a@b.co", sourceKind: null, sourceRef: null });
  });

  it("a tag that doesn't match the signature is refused", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(new Request(`http://localhost/api/unsubscribe${await signed("a@b.co")}&c=welcome_1`));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/unsubscribed?state=invalid");
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("a failed event write still unsubscribes (the event is secondary)", async () => {
    recordEmailEvent.mockRejectedValue(new Error("down"));
    const { GET } = await import("@/app/api/unsubscribe/route");
    const res = await GET(new Request(`http://localhost/api/unsubscribe${await signed("a@b.co")}`));
    expect(res.headers.get("location")).toBe("https://auraprotocols.com/unsubscribed");
    expect(alertOwner).toHaveBeenCalledWith("Unsubscribe not counted", expect.stringContaining("a@b.co"));
  });
});
