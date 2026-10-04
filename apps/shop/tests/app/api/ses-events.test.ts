import { describe, it, expect, vi, beforeEach } from "vitest";

const verifySnsMessage = vi.fn(), handleSesEvent = vi.fn(), alertOwner = vi.fn();
vi.mock("@/lib/ses-events", () => ({ verifySnsMessage, handleSesEvent }));
vi.mock("@/lib/notify", () => ({ alertOwner }));
const fetchMock = vi.fn();
const post = (body: unknown) => new Request("http://localhost/api/ses/events", { method: "POST", headers: { "content-type": "text/plain" }, body: JSON.stringify(body) });
const TOPIC = "arn:aws:sns:us-east-1:1:ses";

describe("POST /api/ses/events", () => {
  beforeEach(() => {
    vi.resetModules(); for (const f of [verifySnsMessage, handleSesEvent, alertOwner, fetchMock]) f.mockReset();
    vi.stubGlobal("fetch", fetchMock); process.env.SES_EVENTS_TOPIC_ARN = TOPIC; verifySnsMessage.mockResolvedValue(true);
  });

  it("400s when the body isn't a plain object", async () => {
    const { POST } = await import("@/app/api/ses/events/route");
    expect((await POST(post(null))).status).toBe(400);
  });

  it("403s a bad signature or another topic", async () => {
    const { POST } = await import("@/app/api/ses/events/route");
    verifySnsMessage.mockResolvedValueOnce(false);
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, Message: "{}" }))).status).toBe(403);
    expect((await POST(post({ Type: "Notification", TopicArn: "arn:aws:sns:us-east-1:1:other", Message: "{}" }))).status).toBe(403);
    expect(handleSesEvent).not.toHaveBeenCalled();
  });

  it("confirms the subscription by visiting the SNS SubscribeURL", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { POST } = await import("@/app/api/ses/events/route");
    const url = "https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=t";
    expect((await POST(post({ Type: "SubscriptionConfirmation", TopicArn: TOPIC, SubscribeURL: url }))).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(url, { signal: expect.any(AbortSignal) });
  });

  it("hands a notification's message to the handler", async () => {
    const { POST } = await import("@/app/api/ses/events/route");
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, Message: JSON.stringify({ notificationType: "Complaint" }) }))).status).toBe(200);
    expect(handleSesEvent).toHaveBeenCalledWith({ notificationType: "Complaint" });
  });

  it("500s and alerts the owner when handling fails, so SNS retries", async () => {
    handleSesEvent.mockRejectedValue(new Error("db down"));
    const { POST } = await import("@/app/api/ses/events/route");
    expect((await POST(post({ Type: "Notification", TopicArn: TOPIC, Message: "{}" }))).status).toBe(500);
    expect(alertOwner).toHaveBeenCalled();
  });
});
