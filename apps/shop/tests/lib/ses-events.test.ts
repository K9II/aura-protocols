import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync, createSign } from "node:crypto";

const accountIdByEmail = vi.fn(), flagVerifyRequired = vi.fn(), unsubscribe = vi.fn();
vi.mock("@/lib/account/data", () => ({ accountIdByEmail, flagVerifyRequired }));
vi.mock("@/lib/email/data", () => ({ unsubscribe }));

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERT = "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem";

function signed(msg: Record<string, string>) {
  const keys = msg.Type === "Notification"
    ? ["Message", "MessageId", ...(msg.Subject ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
    : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  const s = createSign("RSA-SHA256");
  s.update(keys.map((k) => `${k}\n${msg[k]}\n`).join(""));
  return { ...msg, SignatureVersion: "2", SigningCertURL: CERT, Signature: s.sign(privateKey, "base64") };
}
const note = (message: unknown) => signed({ Type: "Notification", MessageId: "m1", TopicArn: "arn:aws:sns:us-east-1:1:ses", Timestamp: "2026-10-04T00:00:00Z", Message: JSON.stringify(message) });

describe("ses-events", () => {
  beforeEach(() => { vi.resetModules(); for (const f of [accountIdByEmail, flagVerifyRequired, unsubscribe]) f.mockReset(); });

  it("accepts a correctly signed message and refuses a tampered one or a foreign cert host", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = note({ notificationType: "Complaint" });
    expect(await verifySnsMessage(msg, async () => pem)).toBe(true);
    expect(await verifySnsMessage({ ...msg, Message: "{}" }, async () => pem)).toBe(false);
    expect(await verifySnsMessage({ ...msg, SigningCertURL: "https://evil.example/x.pem" }, async () => pem)).toBe(false);
  });

  it("a permanent bounce flags the account and stops marketing mail", async () => {
    accountIdByEmail.mockResolvedValue("u1");
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ notificationType: "Bounce", bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "Fake@Nowhere.org" }] } });
    expect(flagVerifyRequired).toHaveBeenCalledWith("u1");
    expect(unsubscribe).toHaveBeenCalledWith("fake@nowhere.org");
  });

  it("ignores a transient bounce", async () => {
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ notificationType: "Bounce", bounce: { bounceType: "Transient", bouncedRecipients: [{ emailAddress: "a@b.co" }] } });
    expect(flagVerifyRequired).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("a complaint (event-publishing shape) unsubscribes", async () => {
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ eventType: "Complaint", complaint: { complainedRecipients: [{ emailAddress: "a@b.co" }] } });
    expect(unsubscribe).toHaveBeenCalledWith("a@b.co");
  });
});
