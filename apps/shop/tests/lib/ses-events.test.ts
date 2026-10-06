import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync, createSign } from "node:crypto";

const accountIdByEmail = vi.fn(), flagVerifyRequired = vi.fn(), unsubscribe = vi.fn();
const recordEmailEvent = vi.fn(), sourceForMessage = vi.fn();
vi.mock("@/lib/account/data", () => ({ accountIdByEmail, flagVerifyRequired }));
vi.mock("@/lib/email/data", () => ({ unsubscribe }));
vi.mock("@/lib/email/admin-data", () => ({ recordEmailEvent, sourceForMessage }));

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
const CERT = "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem";

function signed(msg: Record<string, string>, version: "1" | "2" = "2") {
  const keys = msg.Type === "Notification"
    ? ["Message", "MessageId", ...(msg.Subject ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
    : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  const s = createSign(version === "1" ? "RSA-SHA1" : "RSA-SHA256");
  s.update(keys.map((k) => `${k}\n${msg[k]}\n`).join(""));
  return { ...msg, SignatureVersion: version, SigningCertURL: CERT, Signature: s.sign(privateKey, "base64") };
}
const note = (message: unknown, version: "1" | "2" = "2") => signed({ Type: "Notification", MessageId: "m1", TopicArn: "arn:aws:sns:us-east-1:1:ses", Timestamp: "2026-10-04T00:00:00Z", Message: JSON.stringify(message) }, version);

describe("ses-events", () => {
  beforeEach(() => {
    vi.resetModules(); for (const f of [accountIdByEmail, flagVerifyRequired, unsubscribe, recordEmailEvent, sourceForMessage]) f.mockReset();
    sourceForMessage.mockResolvedValue(null);
  });

  it("accepts a correctly signed message and refuses a tampered one or a foreign cert host", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = note({ notificationType: "Complaint" });
    expect(await verifySnsMessage(msg, async () => pem)).toBe(true);
    expect(await verifySnsMessage({ ...msg, Message: "{}" }, async () => pem)).toBe(false);
    expect(await verifySnsMessage({ ...msg, SigningCertURL: "https://evil.example/x.pem" }, async () => pem)).toBe(false);
  });

  it("verifies a SignatureVersion 1 (SHA1) message", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = note({ notificationType: "Complaint" }, "1");
    expect(await verifySnsMessage(msg, async () => pem)).toBe(true);
  });

  it("verifies a Notification that carries a Subject", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = signed({ Type: "Notification", MessageId: "m-subj", Subject: "re: ses", TopicArn: "arn:aws:sns:us-east-1:1:ses", Timestamp: "2026-10-04T00:00:00Z", Message: JSON.stringify({ notificationType: "Complaint" }) });
    expect(await verifySnsMessage(msg, async () => pem)).toBe(true);
  });

  it("verifies a SubscriptionConfirmation (SubscribeURL/Token key order)", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = signed({
      Type: "SubscriptionConfirmation",
      MessageId: "m-sub",
      Token: "tok",
      TopicArn: "arn:aws:sns:us-east-1:1:ses",
      Timestamp: "2026-10-04T00:00:00Z",
      SubscribeURL: "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=tok",
      Message: "You have chosen to subscribe to the topic.",
    });
    expect(await verifySnsMessage(msg, async () => pem)).toBe(true);
  });

  it("rejects cert URLs with a lookalike suffix, embedded authority, query, or fragment", async () => {
    const msg = note({ notificationType: "Complaint" });
    const badCertUrls = [
      "https://sns.us-east-1.amazonaws.com.evil.com/x.pem",
      "https://sns.us-east-1.amazonaws.com@evil.com/x.pem",
      "https://sns.us-east-1.amazonaws.com/x.pem?x=1",
      "https://sns.us-east-1.amazonaws.com/x.pem#x",
    ];
    const { verifySnsMessage } = await import("@/lib/ses-events");
    for (const bad of badCertUrls) {
      expect(await verifySnsMessage({ ...msg, SigningCertURL: bad }, async () => pem)).toBe(false);
    }
  });

  it("rejects an unknown SignatureVersion", async () => {
    const { verifySnsMessage } = await import("@/lib/ses-events");
    const msg = note({ notificationType: "Complaint" });
    expect(await verifySnsMessage({ ...msg, SignatureVersion: "3" }, async () => pem)).toBe(false);
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

  it("records a permanent bounce against the email it came from", async () => {
    sourceForMessage.mockResolvedValue({ kind: "campaign", ref: "k1" });
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ notificationType: "Bounce", mail: { messageId: "ses-9" }, bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "X@b.co" }] } });
    expect(sourceForMessage).toHaveBeenCalledWith("ses-9");
    expect(recordEmailEvent).toHaveBeenCalledWith({ type: "bounce", email: "x@b.co", sesMessageId: "ses-9", sourceKind: "campaign", sourceRef: "k1" });
  });

  it("records a complaint with an unknown source when the message isn't marketing mail", async () => {
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ eventType: "Complaint", mail: { messageId: "ses-10" }, complaint: { complainedRecipients: [{ emailAddress: "y@b.co" }] } });
    expect(recordEmailEvent).toHaveBeenCalledWith({ type: "complaint", email: "y@b.co", sesMessageId: "ses-10", sourceKind: null, sourceRef: null });
  });

  it("doesn't count a transient bounce", async () => {
    const { handleSesEvent } = await import("@/lib/ses-events");
    await handleSesEvent({ notificationType: "Bounce", bounce: { bounceType: "Transient", bouncedRecipients: [{ emailAddress: "x@b.co" }] } });
    expect(recordEmailEvent).not.toHaveBeenCalled();
  });
});
