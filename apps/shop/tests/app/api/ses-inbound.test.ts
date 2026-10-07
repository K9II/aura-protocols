import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ verifySnsMessage: vi.fn(), handleInbound: vi.fn(), alertOwner: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/ses-events", () => ({ verifySnsMessage: m.verifySnsMessage }));
vi.mock("@/lib/inquiries/inbound", () => ({ handleInbound: m.handleInbound }));
vi.mock("@/lib/notify", () => ({ alertOwner: m.alertOwner }));
const TOPIC = "arn:aws:sns:us-east-2:1:aura-inbound-mail";
const post = (body: unknown) => new Request("http://localhost/api/ses/inbound", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(body) });

describe("POST /api/ses/inbound", () => {
  beforeEach(() => {
    vi.resetModules(); for (const f of Object.values(m)) f.mockReset();
    vi.stubGlobal("fetch", m.fetch); process.env.SES_INBOUND_TOPIC_ARN = TOPIC; m.verifySnsMessage.mockResolvedValue(true);
  });

  it("403s a bad signature or another topic", async () => {
    const { POST } = await import("@/app/api/ses/inbound/route");
    m.verifySnsMessage.mockResolvedValueOnce(false);
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, Message: "{}" }))).status).toBe(403);
    expect((await POST(post({ Type: "Notification", TopicArn: "arn:aws:sns:us-east-2:1:ses-events", Message: "{}" }))).status).toBe(403);
    expect(m.handleInbound).not.toHaveBeenCalled();
  });

  it("confirms the subscription on an SNS host only", async () => {
    m.fetch.mockResolvedValue({ ok: true });
    const { POST } = await import("@/app/api/ses/inbound/route");
    expect((await POST(post({ Type: "SubscriptionConfirmation", TopicArn: TOPIC, SubscribeURL: "https://sns.us-east-2.amazonaws.com/?Action=ConfirmSubscription&Token=t" }))).status).toBe(200);
    expect((await POST(post({ Type: "SubscriptionConfirmation", TopicArn: TOPIC, SubscribeURL: "https://evil.example/" }))).status).toBe(403);
  });

  it("hands the SES notification to the pipeline", async () => {
    m.handleInbound.mockResolvedValue("recorded");
    const { POST } = await import("@/app/api/ses/inbound/route");
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, MessageId: "n1", Message: JSON.stringify({ notificationType: "Received" }) }))).status).toBe(200);
    expect(m.handleInbound).toHaveBeenCalledWith({ notificationType: "Received" });
  });

  it("500s and alerts when recording fails, so SNS retries", async () => {
    m.handleInbound.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/ses/inbound/route");
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, MessageId: "n1", Message: "{}" }))).status).toBe(500);
    expect(m.alertOwner).toHaveBeenCalledWith("Inquiry email not recorded", expect.stringContaining("n1"));
  });

  it("refuses everything when the topic env var is missing", async () => {
    delete process.env.SES_INBOUND_TOPIC_ARN;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("@/app/api/ses/inbound/route");
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, Message: "{}" }))).status).toBe(403);
    spy.mockRestore();
  });
});
