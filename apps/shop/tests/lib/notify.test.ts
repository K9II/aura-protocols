import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendEmail, recordOwnerAlert } = vi.hoisted(() => ({ sendEmail: vi.fn(), recordOwnerAlert: vi.fn() }));
vi.mock("@/lib/ses", () => ({ sendEmail }));
vi.mock("@/lib/today/alerts", () => ({ recordOwnerAlert }));

describe("notify", () => {
  beforeEach(() => {
    vi.resetModules();
    sendEmail.mockReset();
    recordOwnerAlert.mockReset();
    recordOwnerAlert.mockResolvedValue(undefined);
    process.env.ORDER_ALERT_EMAIL = "owner@example.com";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sendOrAlert delivers and returns true", async () => {
    sendEmail.mockResolvedValue({ messageId: "m" });
    const { sendOrAlert } = await import("@/lib/notify");
    expect(await sendOrAlert({ to: "j@lab.org", subject: "s", html: "h" }, "order AP-1")).toBe(true);
    expect(recordOwnerAlert).not.toHaveBeenCalled();
  });

  it("sendOrAlert never throws; on failure it alerts the owner under one stable title", async () => {
    sendEmail.mockRejectedValueOnce(new Error("ses down")).mockResolvedValueOnce({ messageId: "m" });
    const { sendOrAlert } = await import("@/lib/notify");
    expect(await sendOrAlert({ to: "j@lab.org", subject: "Your order AP-1031 has shipped", html: "h" }, "shipped AP-1031")).toBe(false);
    expect(recordOwnerAlert).toHaveBeenCalledWith("Email failed to send to a customer", expect.stringContaining("Subject: Your order AP-1031 has shipped"));
    expect(sendEmail).toHaveBeenLastCalledWith(expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("Email failed") }));
  });

  it("alertOwner stores the alert first, then emails it", async () => {
    sendEmail.mockResolvedValue({ messageId: "m" });
    const { alertOwner } = await import("@/lib/notify");
    await alertOwner("Reconcile had failures", "1 failed:\ncs_1: boom");
    expect(recordOwnerAlert).toHaveBeenCalledWith("Reconcile had failures", "1 failed:\ncs_1: boom");
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "owner@example.com", subject: "[Aura shop] Reconcile had failures" }));
    expect(recordOwnerAlert.mock.invocationCallOrder[0]).toBeLessThan(sendEmail.mock.invocationCallOrder[0]);
  });

  it("a failed store is logged and the email still goes out", async () => {
    recordOwnerAlert.mockRejectedValue(new Error("owner_alerts missing"));
    sendEmail.mockResolvedValue({ messageId: "m" });
    const { alertOwner } = await import("@/lib/notify");
    await expect(alertOwner("x", "y")).resolves.toBeUndefined();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("owner alert not stored:", expect.any(Error));
  });

  it("a failed email is logged, the stored alert stays, and it never throws", async () => {
    sendEmail.mockRejectedValue(new Error("down"));
    const { alertOwner } = await import("@/lib/notify");
    await expect(alertOwner("x", "y")).resolves.toBeUndefined();
    expect(recordOwnerAlert).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("owner alert email failed:", expect.any(Error));
  });

  it("with no alert address the alert is still stored", async () => {
    delete process.env.ORDER_ALERT_EMAIL;
    delete process.env.INQUIRY_NOTIFY_EMAIL;
    const { alertOwner } = await import("@/lib/notify");
    await alertOwner("x", "y");
    expect(recordOwnerAlert).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
