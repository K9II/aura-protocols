import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let client: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (!client) {
    client = new SESv2Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  }
  return client;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;        // display name, e.g. "Alvester at Aura Protocols"
  replyTo?: string;
  unsubscribeUrl?: string;  // marketing mail: adds RFC 8058 one-click headers
}): Promise<{ messageId: string | undefined }> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) {
    throw new Error("Missing SES_FROM_EMAIL environment variable");
  }
  const headers = params.unsubscribeUrl
    ? [
        { Name: "List-Unsubscribe", Value: `<${params.unsubscribeUrl}>` },
        { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
      ]
    : undefined;

  const command = new SendEmailCommand({
    FromEmailAddress: params.fromName ? `"${params.fromName.replace(/"/g, "")}" <${from}>` : from,
    Destination: { ToAddresses: [params.to] },
    ...(params.replyTo ? { ReplyToAddresses: [params.replyTo] } : {}),
    Content: {
      Simple: {
        Subject: { Data: params.subject },
        Body: { Html: { Data: params.html } },
        ...(headers ? { Headers: headers } : {}),
      },
    },
  });

  const result = await getClient().send(command);
  return { messageId: result.MessageId };
}
