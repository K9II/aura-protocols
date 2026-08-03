import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn();

vi.mock("@aws-sdk/client-sesv2", () => {
  class SESv2Client {
    send = sendMock;
  }
  class SendEmailCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return { SESv2Client, SendEmailCommand };
});

describe("sendLeadMagnetEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    process.env.AWS_REGION = "us-east-1";
    process.env.SES_FROM_EMAIL = "support@send.auraprotocols.com";
  });

  it("sends via SESv2Client with the right destination, subject, and html", async () => {
    sendMock.mockResolvedValueOnce({ MessageId: "abc-123" });
    const { sendLeadMagnetEmail } = await import("@/lib/ses");

    const result = await sendLeadMagnetEmail({
      to: "reader@example.com",
      subject: "Your weight-loss starting protocol — 3 compounds, real doses",
      html: "<p>Hello</p>",
    });

    expect(result.messageId).toBe("abc-123");
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [command] = sendMock.mock.calls[0];
    expect(command.input).toMatchObject({
      FromEmailAddress: "support@send.auraprotocols.com",
      Destination: { ToAddresses: ["reader@example.com"] },
      Content: {
        Simple: {
          Subject: { Data: "Your weight-loss starting protocol — 3 compounds, real doses" },
          Body: { Html: { Data: "<p>Hello</p>" } },
        },
      },
    });
  });

  it("throws if SES_FROM_EMAIL is not configured", async () => {
    delete process.env.SES_FROM_EMAIL;
    const { sendLeadMagnetEmail } = await import("@/lib/ses");
    await expect(
      sendLeadMagnetEmail({ to: "reader@example.com", subject: "s", html: "<p>h</p>" })
    ).rejects.toThrow("SES_FROM_EMAIL");
  });
});
