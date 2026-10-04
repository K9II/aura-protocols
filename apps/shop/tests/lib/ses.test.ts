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

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    process.env.AWS_REGION = "us-east-1";
    process.env.SES_FROM_EMAIL = "support@send.auraprotocols.com";
  });

  it("sends via SESv2Client with the right destination, subject, and html", async () => {
    sendMock.mockResolvedValueOnce({ MessageId: "abc-123" });
    const { sendEmail } = await import("@/lib/ses");

    const result = await sendEmail({
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

  it("adds sender name, reply-to and one-click unsubscribe headers when given", async () => {
    sendMock.mockResolvedValueOnce({ MessageId: "m-1" });
    const { sendEmail } = await import("@/lib/ses");
    await sendEmail({
      to: "lab@example.com", subject: "S", html: "<p>h</p>",
      fromName: "Alvester at Aura Protocols", replyTo: "support@auraprotocols.com",
      unsubscribeUrl: "https://auraprotocols.com/api/unsubscribe?e=lab%40example.com&s=x",
    });
    const input = sendMock.mock.calls[0][0].input;
    expect(input.FromEmailAddress).toBe('"Alvester at Aura Protocols" <support@send.auraprotocols.com>');
    expect(input.ReplyToAddresses).toEqual(["support@auraprotocols.com"]);
    expect(input.Content.Simple.Headers).toEqual([
      { Name: "List-Unsubscribe", Value: "<https://auraprotocols.com/api/unsubscribe?e=lab%40example.com&s=x>" },
      { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
    ]);
  });

  it("throws if SES_FROM_EMAIL is not configured", async () => {
    delete process.env.SES_FROM_EMAIL;
    const { sendEmail } = await import("@/lib/ses");
    await expect(
      sendEmail({ to: "reader@example.com", subject: "s", html: "<p>h</p>" })
    ).rejects.toThrow("SES_FROM_EMAIL");
  });
});
