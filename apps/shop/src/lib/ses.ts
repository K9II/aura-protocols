import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

let client: SESv2Client | null = null;

function getClient(): SESv2Client {
  if (!client) {
    client = new SESv2Client({ region: process.env.AWS_REGION ?? "us-east-1" });
  }
  return client;
}

export async function sendLeadMagnetEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ messageId: string | undefined }> {
  const from = process.env.SES_FROM_EMAIL;
  if (!from) {
    throw new Error("Missing SES_FROM_EMAIL environment variable");
  }

  const command = new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [params.to] },
    Content: {
      Simple: {
        Subject: { Data: params.subject },
        Body: { Html: { Data: params.html } },
      },
    },
  });

  const result = await getClient().send(command);
  return { messageId: result.MessageId };
}
