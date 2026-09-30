import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/ses", () => ({ sendEmail }));

describe("notify", () => {
  beforeEach(() => { vi.resetModules(); sendEmail.mockReset(); process.env.ORDER_ALERT_EMAIL = "owner@example.com"; });

  it("sendOrAlert delivers and returns true", async () => {
    sendEmail.mockResolvedValue({ messageId: "m" });
    const { sendOrAlert } = await import("@/lib/notify");
    expect(await sendOrAlert({ to: "j@lab.org", subject: "s", html: "h" }, "order AP-1")).toBe(true);
  });

  it("sendOrAlert never throws; on failure it alerts the owner", async () => {
    sendEmail.mockRejectedValueOnce(new Error("ses down")).mockResolvedValueOnce({ messageId: "m" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendOrAlert } = await import("@/lib/notify");
    expect(await sendOrAlert({ to: "j@lab.org", subject: "Order confirmed", html: "h" }, "order AP-1")).toBe(false);
    expect(sendEmail).toHaveBeenLastCalledWith(expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("Email failed") }));
  });

  it("alertOwner swallows its own failure", async () => {
    sendEmail.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { alertOwner } = await import("@/lib/notify");
    await expect(alertOwner("x", "y")).resolves.toBeUndefined();
  });
});
