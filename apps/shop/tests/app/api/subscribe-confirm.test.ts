import { describe, it, expect, vi, beforeEach } from "vitest";

const { confirmSubscriber, sendWelcomeFile1, alertOwner } = vi.hoisted(() => ({ confirmSubscriber: vi.fn(), sendWelcomeFile1: vi.fn(), alertOwner: vi.fn() }));
vi.mock("@/lib/email/data", () => ({ confirmSubscriber }));
vi.mock("@/lib/account/welcome", () => ({ sendWelcomeFile1 }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
vi.mock("@/lib/supabase/env", () => ({ siteUrl: () => "https://auraprotocols.com" }));

import { GET } from "@/app/api/subscribe/confirm/route";

const get = (qs: string) => GET(new Request(`http://localhost/api/subscribe/confirm${qs}`));
const loc = async (qs: string) => (await get(qs)).headers.get("location");
const row = { email: "lab@other.org" };

describe("GET /api/subscribe/confirm (the Aura letter, a different address)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends a missing, invalid or used token to the 'invalid' page", async () => {
    expect(await loc("")).toBe("https://auraprotocols.com/subscribed?state=invalid");
    confirmSubscriber.mockResolvedValue(null);
    expect(await loc("?token=nope")).toBe("https://auraprotocols.com/subscribed?state=invalid");
  });

  it("confirms, sends Welcome File 01 and lands on /subscribed", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendWelcomeFile1.mockResolvedValue("sent");
    expect(await loc("?token=tok")).toBe("https://auraprotocols.com/subscribed");
    expect(sendWelcomeFile1).toHaveBeenCalledWith("lab@other.org");
  });

  it("never re-sends File 01 on a second click", async () => {
    confirmSubscriber.mockResolvedValue({ row, already: true });
    expect(await loc("?token=tok")).toBe("https://auraprotocols.com/subscribed?state=returning");
    expect(sendWelcomeFile1).not.toHaveBeenCalled();
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendWelcomeFile1.mockResolvedValue("duplicate");
    expect(await loc("?token=tok")).toBe("https://auraprotocols.com/subscribed?state=returning");
  });

  it("is loud when something fails", async () => {
    confirmSubscriber.mockRejectedValue(new Error("db down"));
    expect(await loc("?token=tok")).toBe("https://auraprotocols.com/subscribed?state=error");
    expect(alertOwner).toHaveBeenCalledWith("Email confirm failed", expect.stringContaining("db down"));
    confirmSubscriber.mockResolvedValue({ row, already: false });
    sendWelcomeFile1.mockRejectedValue(new Error("ses"));
    expect(await loc("?token=tok")).toBe("https://auraprotocols.com/subscribed");
    expect(alertOwner).toHaveBeenCalledWith("Welcome File 01 failed", expect.stringContaining("ses"));
  });
});
